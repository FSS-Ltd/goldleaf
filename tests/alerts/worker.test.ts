import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { runWorker } from "../../lib/portal/alerts/worker";
import type { AlertPayload } from "../../lib/portal/alerts/model";

const url = process.env.ALERT_TEST_DATABASE_URL;
if (!url) throw new Error("ALERT_TEST_DATABASE_URL is required; use an isolated local, migrated test database");
const parsed = new URL(url);
if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || parsed.search || parsed.hash || !parsed.pathname.includes("alert_test")) throw new Error("Alert tests require an isolated local alert_test database");

async function waitFor(check: () => Promise<boolean>): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for worker");
}

test("committed wakeup retries with identical private-free payload and shuts down", async () => {
  const db = new Client({ connectionString: url });
  await db.connect();
  const controller = new AbortController();
  const sent: { payload: AlertPayload; key: string }[] = [];
  const subject = `alert_test_${randomUUID()}`;
  const worker = runWorker({ connectionString: url, from: "alerts@example.test", origin: "https://example.test", signal: controller.signal,
    identity: async (id) => id === subject ? ["parent@example.test"] : null,
    submit: async (payload, key) => { sent.push({ payload, key }); return sent.length === 1 ? "retry" : "sent"; },
  });
  try {
    const family = (await db.query("INSERT INTO portal.families DEFAULT VALUES RETURNING id")).rows[0].id;
    const admin = (await db.query("INSERT INTO portal.memberships(subject,role) VALUES($1,'admin') RETURNING id", [`author_${randomUUID()}`])).rows[0].id;
    await db.query("INSERT INTO portal.memberships(subject,role,family_id) VALUES($1,'parent',$2)", [subject, family]);
    await db.query("INSERT INTO portal.family_messages(operation_id,family_id,author_id,body) VALUES($1,$2,$3,'private body')", [randomUUID(), family, admin]);
    await waitFor(async () => sent.length === 1 && (await db.query("SELECT status FROM portal.alert_deliveries WHERE subject=$1", [subject])).rows[0]?.status === "pending");
    await db.query("UPDATE portal.alert_deliveries SET due_at=clock_timestamp() WHERE subject=$1", [subject]);
    await db.query("NOTIFY portal_alerts");
    await db.query("NOTIFY portal_alerts");
    await waitFor(async () => (await db.query("SELECT status FROM portal.alert_deliveries WHERE subject=$1", [subject])).rows[0]?.status === "sent");
    assert.equal(sent.length, 2);
    assert.deepEqual(sent[0], sent[1]);
    assert.equal(JSON.stringify(sent).includes("private body"), false);
  } finally {
    controller.abort();
    await worker;
    await db.end();
  }
});

test("expired frozen delivery remains uncertain without contacting providers", async () => {
  const db = new Client({ connectionString: url });
  await db.connect();
  const subject = `alert_test_${randomUUID()}`;
  const family = (await db.query("INSERT INTO portal.families DEFAULT VALUES RETURNING id")).rows[0].id;
  const admin = (await db.query("INSERT INTO portal.memberships(subject,role) VALUES($1,'admin') RETURNING id", [`author_${randomUUID()}`])).rows[0].id;
  await db.query("INSERT INTO portal.memberships(subject,role,family_id) VALUES($1,'parent',$2)", [subject, family]);
  await db.query("INSERT INTO portal.family_messages(operation_id,family_id,author_id,body) VALUES($1,$2,$3,'private')", [randomUUID(), family, admin]);
  const payload = { from: "alerts@example.test", to: "parent@example.test", subject: "You have a Goldleaf update", text: "There is an update in your Goldleaf portal. Sign in to view it:\n\nhttps://example.test/portal" };
  await db.query("UPDATE portal.alert_deliveries SET payload=$2::jsonb,idempotency_key='old-key',first_attempt_at=clock_timestamp()-interval '24 hours' WHERE subject=$1", [subject, JSON.stringify(payload)]);
  const controller = new AbortController();
  let calls = 0;
  const worker = runWorker({ connectionString: url, from: payload.from, origin: "https://example.test", signal: controller.signal,
    identity: async (id) => { if (id === subject) calls++; return null; }, submit: async () => { calls++; return "sent"; },
  });
  try {
    await waitFor(async () => (await db.query("SELECT status FROM portal.alert_deliveries WHERE subject=$1", [subject])).rows[0]?.status === "uncertain");
    assert.equal(calls, 0);
  } finally {
    controller.abort();
    await worker;
    await db.end();
  }
});
