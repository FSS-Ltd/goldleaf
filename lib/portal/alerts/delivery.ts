import type { Client } from "pg";
import { createPayload, payloadSchema, retryAt, type Claim, type IdentityLookup, type MailSubmit } from "./model";

const TIMEOUT_MS = 10_000;

export async function deliverClaim(client: Client, claim: Claim, options: { identity: IdentityLookup; submit: MailSubmit; from: string; origin: string; now: () => Date }): Promise<void> {
  if (claim.first_attempt_at && options.now().getTime() - claim.first_attempt_at.getTime() >= 23 * 60 * 60_000) {
    await client.query("SELECT portal.alert_finish($1, $2, 'uncertain', NULL)", [claim.delivery_id, claim.lease_token]);
    return;
  }
  let addresses: string[] | null;
  try {
    addresses = await options.identity(claim.subject, AbortSignal.timeout(TIMEOUT_MS));
  } catch {
    await client.query("SELECT portal.alert_finish($1, $2, 'retry', $3)", [claim.delivery_id, claim.lease_token, retryAt(options.now(), claim.attempts)]);
    return;
  }
  const address = claim.payload?.to ?? addresses?.find((value) => payloadSchema.shape.to.safeParse(value).success);
  if (!address || !addresses?.includes(address)) {
    await client.query("SELECT portal.alert_finish($1, $2, 'cancelled', NULL)", [claim.delivery_id, claim.lease_token]);
    return;
  }
  const candidate = claim.payload ?? createPayload(options.from, address, options.origin);
  const key = claim.idempotency_key ?? `portal-alert/${claim.delivery_id}`;
  // Commit the immutable provider request before a submission can escape the process.
  const frozen = await client.query("SELECT * FROM portal.alert_freeze($1, $2, $3::jsonb, $4)", [claim.delivery_id, claim.lease_token, JSON.stringify(candidate), key]);
  if (!frozen.rows.length) {
    await client.query("SELECT portal.alert_finish($1, $2, 'uncertain', NULL)", [claim.delivery_id, claim.lease_token]);
    return;
  }
  const row = frozen.rows[0];
  const payload = payloadSchema.parse(row.payload);
  if (typeof row.idempotency_key !== "string" || payload.to !== address) throw new Error("Invalid frozen alert");
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout = '2s'");
    await client.query("SET LOCAL statement_timeout = '5s'");
    const gate = await client.query("SELECT portal.alert_gate($1, $2) AS allowed", [claim.delivery_id, claim.lease_token]);
    if (gate.rows[0]?.allowed !== true) {
      await client.query("SELECT portal.alert_finish($1, $2, 'cancelled', NULL)", [claim.delivery_id, claim.lease_token]);
    } else {
      let outcome: "sent" | "retry";
      try { outcome = await options.submit(payload, row.idempotency_key, AbortSignal.timeout(TIMEOUT_MS)); }
      catch { outcome = "retry"; }
      await client.query("SELECT portal.alert_finish($1, $2, $3, $4)", [claim.delivery_id, claim.lease_token, outcome, outcome === "retry" ? retryAt(options.now(), claim.attempts) : null]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
