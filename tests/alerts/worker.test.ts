import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { runWorker } from "../../lib/portal/alerts/worker";
import { deliverClaim } from "../../lib/portal/alerts/delivery";
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

test("listener reconnect catches up, stays idle and closes connections", async () => {
  const db = new Client({ connectionString: url });
  await db.connect();
  const subject = `alert_test_${randomUUID()}`;
  const family = (await db.query("INSERT INTO portal.families DEFAULT VALUES RETURNING id")).rows[0].id;
  const admin = (await db.query("INSERT INTO portal.memberships(subject,role) VALUES($1,'admin') RETURNING id", [`author_${randomUUID()}`])).rows[0].id;
  await db.query("INSERT INTO portal.memberships(subject,role,family_id) VALUES($1,'parent',$2)", [subject, family]);
  const controller = new AbortController();
  let submissions = 0;
  const worker = runWorker({ connectionString: url, from: "alerts@example.test", origin: "https://example.test", signal: controller.signal,
    identity: async (id) => id === subject ? ["parent@example.test"] : null,
    submit: async () => { submissions++; return "sent"; },
  });
  try {
    await waitFor(async () => (await db.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name IN ('goldleaf-alert-listener','goldleaf-alert-jobs') AND state='idle'")).rows[0].n === 2);
    const before = (await db.query("SELECT pid, query_start FROM pg_stat_activity WHERE application_name='goldleaf-alert-jobs'")).rows[0];
    await new Promise((resolve) => setTimeout(resolve, 150));
    const after = (await db.query("SELECT pid, query_start FROM pg_stat_activity WHERE application_name='goldleaf-alert-jobs'")).rows[0];
    assert.equal(after.pid, before.pid);
    assert.equal(after.query_start.getTime(), before.query_start.getTime());
    const listener = (await db.query("SELECT pid FROM pg_stat_activity WHERE application_name='goldleaf-alert-listener'")).rows[0].pid;
    await db.query("SELECT pg_terminate_backend($1)", [listener]);
    await db.query("INSERT INTO portal.family_messages(operation_id,family_id,author_id,body) VALUES($1,$2,$3,'private')", [randomUUID(), family, admin]);
    await waitFor(async () => (await db.query("SELECT status FROM portal.alert_deliveries WHERE subject=$1", [subject])).rows[0]?.status === "sent");
    assert.equal(submissions, 1);
  } finally {
    controller.abort();
    await worker;
    await waitFor(async () => (await db.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name IN ('goldleaf-alert-listener','goldleaf-alert-jobs')")).rows[0].n === 0);
    await db.end();
  }
});

test("worker wakes at a crashed lease expiry and recovers it", async () => {
  const db = new Client({ connectionString: url });
  await db.connect();
  const subject = `alert_test_${randomUUID()}`;
  const family = (await db.query("INSERT INTO portal.families DEFAULT VALUES RETURNING id")).rows[0].id;
  const admin = (await db.query("INSERT INTO portal.memberships(subject,role) VALUES($1,'admin') RETURNING id", [`author_${randomUUID()}`])).rows[0].id;
  await db.query("INSERT INTO portal.memberships(subject,role,family_id) VALUES($1,'parent',$2)", [subject, family]);
  await db.query("INSERT INTO portal.family_messages(operation_id,family_id,author_id,body) VALUES($1,$2,$3,'private')", [randomUUID(), family, admin]);
  await db.query("UPDATE portal.alert_deliveries SET status='leased',lease_token=$2,lease_until=clock_timestamp()+interval '1 second',attempts=1 WHERE subject=$1", [subject, randomUUID()]);
  const controller = new AbortController();
  let submissions = 0;
  const worker = runWorker({ connectionString: url, from: "alerts@example.test", origin: "https://example.test", signal: controller.signal,
    identity: async (id) => id === subject ? ["parent@example.test"] : null,
    submit: async () => { submissions++; return "sent"; },
  });
  try {
    await waitFor(async () => (await db.query("SELECT status FROM portal.alert_deliveries WHERE subject=$1", [subject])).rows[0]?.status === "sent");
    assert.equal(submissions, 1);
    assert.equal((await db.query("SELECT attempts FROM portal.alert_deliveries WHERE subject=$1", [subject])).rows[0].attempts, 2);
  } finally {
    controller.abort();
    await worker;
    await db.end();
  }
});


test("a blocked authorisation lock never submits or cancels a valid claim", async () => {
  const db = new Client({ connectionString: url });
  const locker = new Client({ connectionString: url });
  await db.connect();
  await locker.connect();
  try {
    const family = (await db.query("INSERT INTO portal.families DEFAULT VALUES RETURNING id")).rows[0].id;
    const admin = (await db.query("INSERT INTO portal.memberships(subject,role) VALUES($1,'admin') RETURNING id", [`author_${randomUUID()}`])).rows[0].id;
    const subject = `alert_test_${randomUUID()}`;
    await db.query("INSERT INTO portal.memberships(subject,role,family_id) VALUES($1,'parent',$2)", [subject, family]);
    await db.query("INSERT INTO portal.family_messages(operation_id,family_id,author_id,body) VALUES($1,$2,$3,'private')", [randomUUID(), family, admin]);
    await db.query("UPDATE portal.alert_deliveries SET due_at=clock_timestamp()+interval '1 hour' WHERE status='pending' AND subject<>$1", [subject]);
    const claim = (await db.query("SELECT * FROM portal.alert_claim(60)")).rows[0];
    assert.equal(claim.subject, subject);
    await locker.query("BEGIN");
    await locker.query("SELECT 1 FROM portal.families WHERE id=$1 FOR UPDATE", [family]);
    let submissions = 0;
    await assert.rejects(deliverClaim(db, claim, { identity: async () => ["parent@example.test"], submit: async () => { submissions++; return "sent"; }, from: "alerts@example.test", origin: "https://example.test", now: () => new Date() }));
    assert.equal(submissions, 0);
    assert.equal((await db.query("SELECT status FROM portal.alert_deliveries WHERE id=$1", [claim.delivery_id])).rows[0].status, "leased");
  } finally {
    await locker.query("ROLLBACK");
    await locker.end();
    await db.end();
  }
});
