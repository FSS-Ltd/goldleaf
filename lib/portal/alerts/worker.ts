import { Client } from "pg";
import { deliverClaim } from "./delivery";
import { payloadSchema, type Claim, type IdentityLookup, type MailSubmit } from "./model";

export async function runWorker(options: { connectionString: string; identity: IdentityLookup; submit: MailSubmit; from: string; origin: string; signal: AbortSignal; now?: () => Date }): Promise<void> {
  let delay = 250;
  while (!options.signal.aborted) {
    const listener = new Client({ connectionString: options.connectionString });
    const jobs = new Client({ connectionString: options.connectionString });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wake: (() => void) | undefined;
    let dirty = true;
    let failure: Error | undefined;
    const notify = () => { dirty = true; wake?.(); };
    const fail = (error: Error) => { failure = error; notify(); };
    listener.on("notification", notify);
    listener.on("error", fail);
    jobs.on("error", fail);
    options.signal.addEventListener("abort", notify);
    try {
      await listener.connect();
      await listener.query("LISTEN portal_alerts");
      await jobs.connect();
      delay = 250;
      while (!options.signal.aborted && !failure) {
        dirty = false;
        while (!options.signal.aborted && !failure) {
          const result = await jobs.query("SELECT * FROM portal.alert_claim($1)", [60]);
          if (!result.rows.length) break;
          const row = result.rows[0];
          const claim: Claim = { delivery_id: row.delivery_id, lease_token: row.lease_token, subject: row.subject, payload: row.payload === null ? null : payloadSchema.parse(row.payload), idempotency_key: row.idempotency_key, first_attempt_at: row.first_attempt_at, attempts: row.attempts };
          await deliverClaim(jobs, claim, { ...options, now: options.now ?? (() => new Date()) });
        }
        if (options.signal.aborted || failure) break;
        const next = await jobs.query("SELECT portal.alert_next_due() AS due");
        if (dirty) continue;
        const due: Date | null = next.rows[0].due;
        await new Promise<void>((resolve) => {
          wake = resolve;
          if (due) timer = setTimeout(resolve, Math.max(0, due.getTime() - (options.now?.() ?? new Date()).getTime()));
          if (dirty || options.signal.aborted || failure) resolve();
        });
        wake = undefined;
        if (timer) clearTimeout(timer);
      }
      if (failure) throw failure;
    } catch {
      if (!options.signal.aborted) {
        console.error("Alert worker failed; reconnecting");
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(done, delay);
          function done() { clearTimeout(timeout); options.signal.removeEventListener("abort", done); resolve(); }
          options.signal.addEventListener("abort", done, { once: true });
          if (options.signal.aborted) done();
        });
        delay = Math.min(delay * 2, 30_000);
      }
    } finally {
      if (timer) clearTimeout(timer);
      options.signal.removeEventListener("abort", notify);
      await Promise.allSettled([listener.end(), jobs.end()]);
    }
  }
}
