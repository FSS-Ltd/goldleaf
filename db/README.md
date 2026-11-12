# Founding availability database

Apply `migrations/0001_founding_availability.sql` and then `migrations/0002_seed_founding_slots.sql` once, in order, using the database owner. These migrations are forward-only. The slot rows are fixed reference data.

## Assignment boundary

The portal UI supports founding assignment. The `set_founding` database function provides conditional assignment; any alternative writer must preserve the same constraint:

```sql
UPDATE portal.founding_slots
SET family_id = $2
WHERE slot = $1 AND family_id IS NULL
RETURNING slot;
```

If no row returns, roll back the transaction and report a controlled capacity or conflict error. The unique family constraint prevents a family holding two slots. Before shipping the writer, test concurrent claims for the last slot and concurrent duplicate claims for the same family; neither may overwrite an existing assignment or leave an orphan family.

## Public read role

For each environment, create a dedicated non-elevated login using the scoped Neon CLI path. Do not use the default Console/API/CLI role creation path: it grants `neon_superuser`. Set `GOLDLEAF_NEON_PROJECT_ID` and `GOLDLEAF_NEON_BRANCH_ID` to the intended project and branch IDs before running the command. Suppress CLI output because it may contain credentials; handle the login credential through the deployment secret store, never logs or command history.

```sh
neon roles create --project-id "$GOLDLEAF_NEON_PROJECT_ID" --branch "$GOLDLEAF_NEON_BRANCH_ID" --name goldleaf_offer --access read_only --database goldleaf --schema public_offer --output json >/dev/null
```

The CLI grants access to current and future relations. Immediately narrow those grants as each object-owning role, including the role that created the view:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public_offer FROM goldleaf_offer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public_offer REVOKE SELECT ON TABLES FROM goldleaf_offer;
GRANT USAGE ON SCHEMA public_offer TO goldleaf_offer;
GRANT SELECT ON public_offer.founding_availability TO goldleaf_offer;
```

Do not grant access to `portal` or default privileges on future tables. Before setting `GOLDLEAF_OFFER_DATABASE_URL`, connect as the scoped role and verify this returns one aggregate row:

```sql
SELECT total, remaining FROM public_offer.founding_availability;
```

As the owner, run the following preflight. Every query must return zero rows; any result is a deployment blocker. These checks include inherited roles and column-level privileges. They make no writes.

```sql
-- The login must not belong to any other role, including noninheriting roles.
SELECT rolname FROM pg_roles
WHERE rolname <> 'goldleaf_offer' AND pg_has_role('goldleaf_offer', oid, 'MEMBER');

-- The login and any role it can assume must have no elevated attributes.
SELECT r.rolname
FROM pg_roles AS r
WHERE (r.rolname = 'goldleaf_offer' OR pg_has_role('goldleaf_offer', r.oid, 'MEMBER'))
  AND (r.rolname = 'neon_superuser' OR r.rolsuper OR r.rolcreatedb
       OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls);

-- No persistent database or schema creation.
SELECT current_database()
WHERE has_database_privilege('goldleaf_offer', current_database(), 'CREATE');
SELECT nspname FROM pg_namespace
WHERE has_schema_privilege('goldleaf_offer', oid, 'CREATE');

-- No private schema access, private table reads/writes, or public view writes.
SELECT nspname FROM pg_namespace
WHERE nspname = 'portal' AND has_schema_privilege('goldleaf_offer', oid, 'USAGE');
SELECT n.nspname, c.relname
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE ((n.nspname = 'portal' AND c.relkind IN ('r', 'p', 'v', 'm', 'f'))
       OR (n.nspname = 'public_offer' AND c.relname = 'founding_availability'))
  AND (has_table_privilege('goldleaf_offer', c.oid, 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
       OR (n.nspname = 'portal' AND has_table_privilege('goldleaf_offer', c.oid, 'SELECT'))
       OR EXISTS (
         SELECT 1 FROM pg_attribute AS a
         WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
           AND (has_column_privilege('goldleaf_offer', c.oid, a.attnum, 'INSERT, UPDATE, REFERENCES')
                OR (n.nspname = 'portal' AND has_column_privilege('goldleaf_offer', c.oid, a.attnum, 'SELECT')))
       ));

-- No read or write privileges on any other relation in public_offer.
SELECT c.relname
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public_offer' AND c.relname <> 'founding_availability'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND (has_table_privilege('goldleaf_offer', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
       OR EXISTS (
         SELECT 1 FROM pg_attribute AS a
         WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
           AND has_column_privilege('goldleaf_offer', c.oid, a.attnum, 'SELECT, INSERT, UPDATE, REFERENCES')
       ));

-- No inherited or PUBLIC default grants on future tables or views in this schema.
SELECT d.defaclrole::regrole, d.defaclnamespace::regnamespace, a.privilege_type
FROM pg_default_acl AS d CROSS JOIN LATERAL aclexplode(d.defaclacl) AS a
WHERE d.defaclobjtype = 'r'
  AND (d.defaclnamespace = 0 OR d.defaclnamespace = 'public_offer'::regnamespace)
  AND (a.grantee = 0 OR a.grantee = 'goldleaf_offer'::regrole
       OR CASE WHEN a.grantee = 0 THEN false
               ELSE pg_has_role('goldleaf_offer', a.grantee, 'MEMBER') END);
```

PostgreSQL grants database `TEMPORARY` to `PUBLIC` by default; the verified development role retains that privilege. This preflight requires no persistent object creation and does not revoke the shared default.

After the preflight passes, retrieve the pooled scoped URI directly into the intended secret destination. For example, after linking the correct Vercel project and setting `GOLDLEAF_VERCEL_GIT_BRANCH` to the intended preview branch:

```sh
neon connection-string "$GOLDLEAF_NEON_BRANCH_ID" --project-id "$GOLDLEAF_NEON_PROJECT_ID" --role-name goldleaf_offer --database-name goldleaf --pooled | vercel env add GOLDLEAF_OFFER_DATABASE_URL preview "$GOLDLEAF_VERCEL_GIT_BRANCH" --sensitive
```

Never run the connection-string command without a protected destination. Set a separate production secret only through the authorised production deployment process.

As the scoped login, verify `SELECT 1 FROM portal.families LIMIT 0` and `SELECT 1 FROM portal.founding_slots LIMIT 0` both fail with permission denied. The preflight above checks writes without attempting them. Run the preflight again whenever role membership, grants, default privileges or object ownership change. If a check fails, investigate the effective grants and stop; do not deploy or weaken the checks. Missing or unavailable configuration produces the standard-price enquiry state. Never copy development credentials or data into production.

## Portal onboarding foundation (local verification only)

Apply `0003_portal_onboarding.sql` after `0001` and `0002` as the owner. It adds memberships, invitations, founding eligibility history and restricted functions; it does not configure a login, provider or production deployment. Existing family IDs and slot inventory remain authoritative. The migration is forward-only. Roll back application use by disabling callers and revoking function grants; preserve the tables and history, and make corrections with a new migration. Existing slot assignments predate the history table and must be reconciled explicitly before history is used for billing.

The function caller is a trusted server boundary: only server code which has validated the Clerk server session, stable Clerk user ID and Clerk-verified email may supply them. Never accept these parameters from a client. A compromised server role can impersonate any subject; SQL cannot verify identity-provider claims. Do not grant it table access, owner rights, role membership, schema CREATE or `portal.require_admin`. Grant only schema USAGE and EXECUTE on the eight server functions (`create_family`, `active_memberships`, `family_memberships`, `revoke_membership`, `issue_invitation`, `revoke_invitation`, `accept_invitation`, `set_founding`) individually. The migration grants none by default. Use a separate credential from the public aggregate reader. `active_memberships` returns only current role and family IDs for the trusted, verified subject. `family_memberships` returns active family membership IDs and subjects only after an admin check. Future family data reads must check an active matching membership and family in the same query or transaction, and must not rely on client-supplied IDs as authority.

For an atomic HTTP batch, generate a UUID on the server, pass it as the third `create_family` argument, and use the same ID for `issue_invitation` in the same database transaction. New family names are required, trimmed and bounded to 120 characters; the nullable column preserves legacy rows. `set_founding` raises SQLSTATE `P0001` on capacity, aborting the enclosing transaction.

Bootstrap the first admin only through an authenticated, audited owner procedure after verifying the provider subject out of band. Insert an `admin` membership with that subject and no family. Restrict owner credentials to operators. The server function revokes parent and staff memberships only; administrator revocation and recovery require an owner-operated, audited procedure. Mutations lock the active admin membership until transaction completion. To reinstate a parent, an admin must issue a fresh invitation after revocation. Family-locked monotonic invitation versions establish issuance order independently of audit timestamps; a membership retains its revocation barrier after reactivation, so earlier invitations remain invalid. Invitation input is a SHA-256 digest of a high-entropy token, never the token itself; the trusted server checks provider-verified email and must not log the token or invite URL. Resending invalidates outstanding invitations for the same family and canonical email. `set_founding` returns true for success, including no-op retries, and raises on capacity. Each real transition records actor, timestamp and prior state through the sequence of history rows. The history is not a billing snapshot; future invoices must snapshot applicable eligibility.

On an empty disposable local database, run `db/tests/onboarding-upgrade.sql`, then `db/tests/onboarding.sql`. Run `db/tests/onboarding-grants.sql` in a separate fresh `psql` session so its temporary-type test exercises initial function compilation. Never point these tests at a live database. Clerk verification, delivery, deployment, and a production role are deliberately outside this foundation.

For the concurrent final-slot check, use a fresh disposable database with migrations applied and run `sh db/tests/onboarding-concurrency.sh <local-host-or-socket-directory> <database-name>` against a local server on port 55439. This test inserts durable synthetic rows; destroy the disposable database afterwards.

CI runs these SQL and concurrency tests against a dedicated PostgreSQL 17 service with synthetic data; it does not use Neon credentials.

## Staff onboarding foundation (local verification only)

Apply `0004_staff_onboarding.sql` after `0003` as the owner. It adds private staff invitations and explicit family assignments. It does not create a provider, login, application integration or deployment. Do not apply it to production until the application integration is ready. Disable callers and revoke their grants to roll back application use; preserve audit data and use a forward migration for corrections. During migration, a transaction-held SHARE ROW EXCLUSIVE lock on `portal.invitations` waits for existing parent writers and blocks new ones through backfill and trigger installation. Schedule a bounded maintenance window, set an owner-session `lock_timeout` appropriate to the deployment, and retry the entire migration if lock acquisition times out. Existing parent invitation digests are copied into a shared uniqueness registry; digest changes are disallowed and old digests remain reserved across both purposes.

Only the trusted server that verified the provider subject and verified email may pass identity arguments. Grant that server only schema usage and individually selected EXECUTE privileges on `issue_staff_invitation`, `revoke_staff_invitation`, `accept_staff_invitation`, `set_staff_family_access`, and `assigned_family_ids`; grant no table or helper-function privileges. Staff invitations create or reactivate only staff memberships. Parent and staff token digests cannot overlap. Admins assign existing families after staff acceptance. Revocation removes assignments and records their actor and time; reactivation does not restore access. All staff invitation issuance and membership revocation serialize on a durable version, so only invitations issued after revocation can reactivate that membership. `assigned_family_ids` resolves active assignments from the verified server subject. The access-layer family reader enforces assignment and active membership in the same query. No child-level reader exists yet.

The PostgreSQL 17 CI job runs `db/tests/staff-onboarding.sql` the staff concurrency cases in `db/tests/onboarding-concurrency.sh`, and the upgrade lock race in `db/tests/staff-migration-concurrency.sh` on a disposable database. It tests no provider, mail delivery or deployed role.

## Portal access layer

Apply `0006_portal_access.sql` after migrations 0001 through 0005. The application uses a separate `GOLDLEAF_PORTAL_DATABASE_URL`; never reuse the public offer credential. Provision a dedicated non-elevated login with no role memberships, table or sequence privileges, schema creation, or owner rights. After independently verifying those effective privileges, grant only:

```sql
GRANT USAGE ON SCHEMA portal TO goldleaf_portal_runtime;
GRANT EXECUTE ON FUNCTION portal.active_memberships(text),
  portal.create_family(text, text, uuid),
  portal.issue_invitation(text, uuid, text, bytea, timestamptz),
  portal.set_founding(text, uuid, boolean),
  portal.family_memberships(text, uuid),
  portal.list_families(text),
  portal.read_family(text, uuid),
  portal.list_staff(text),
  portal.accept_verified_invitation(text, text[], bytea, text)
TO goldleaf_portal_runtime;
```

Do not grant `portal.require_admin` or the lower-level invitation acceptance functions. The runtime must derive the subject and all verified addresses from Clerk for every call. Family reads recheck current role and scope in SQL and return the current founding flag. `setFamilyFounding` derives the admin identity and invokes the existing granted `portal.set_founding` function; it does not calculate invoice pricing. `createFamilyWithInvitation` accepts a stable family UUID generated by its trusted server caller, generates the token on the server, commits creation, invitation and founding selection together, and returns the token only after commit. Reuse that UUID for retries of the same action: an existing ID makes creation fail rather than create a duplicate. This is not a replayable success result; after a committed response is lost, an admin must inspect the existing family and use a future explicit resend flow to rotate the invitation because its original token cannot be recovered from its hash. The UI must show that delivery state. Tokens are 256 random bits, stored only as SHA-256 digests, and expire after seven days. Delivery and safe URL exchange are future work; do not log tokens or URLs. The SQL accepts all provider-verified emails in one call and delegates to the existing single-use acceptance functions.

Test `db/tests/portal-access.sql` only on a disposable local database after migrations 0001 through 0006. It exercises scoped runtime privileges, wrong or absent identity, family isolation, revocation, verified secondary email and capacity rollback. It does not exercise the Neon HTTP transport or a real Clerk session.
## Invoice data foundation (local verification only)

Apply `0005_invoice_billing.sql` after `0004` as owner. It seeds only the supplied issuer name and address and disables VAT. Terms, payment method, cadence and founding transition remain unset until an admin configures them. VAT is enabled explicitly with a basis-point rate and registration; the database does not detect thresholds or infer a rate. For positive amounts, VAT is rounded to the nearest penny per line, with half pennies rounded up, then summed. Amounts are integer GBP pence, with invoice totals capped at 2,147,483,647 pence.

All functions are revoked from PUBLIC and no runtime role is provisioned. Only a server that verifies the Clerk subject may supply the subject argument. Grant selected functions individually, never the tables, triggers, counter or `require_admin`. Admin writes lock active membership. Parent reads check current family membership in the query; staff have no invoice access. Issue locks the draft, validates configured policy, allocates the number transactionally and stores issuer, recipient, lines, terms, dates, VAT and totals as a snapshot. Repeated issue returns the same number. Issued rows and lines cannot be changed through normal SQL. External payment recording uses a caller-generated stable operation UUID; a replay with different details fails, and payments cannot exceed the snapshot total. No payment is collected.

`lib/portal/invoices.ts` derives each line from `quoteInvoice` and service-date eligibility and uses checked database operations; SQL alone does not independently validate supplied prices or founding eligibility. Legacy founding assignments without sufficient history require reconciliation. Runtime role deployment, email and invoice UI remain pending.

On a disposable PostgreSQL 17 database, run `db/tests/onboarding-upgrade.sql`, `db/migrations/0004_staff_onboarding.sql`, `db/migrations/0005_invoice_billing.sql`, and `db/tests/invoice-billing.sql` in order. Run `PGPORT=55439 sh db/tests/invoice-concurrency.sh <host> <database>` against the same disposable database. Tests create synthetic records; never point them at live data. Disable callers and revoke grants to roll back application use; preserve records and use a forward migration for corrections.

## Parent invitation delivery

Apply `0007_invitation_delivery.sql` after 0006. Grant the separate portal runtime only the additional server functions:

```sql
GRANT EXECUTE ON FUNCTION portal.revoke_invitation(text, uuid),
  portal.issue_parent_delivery(text, uuid, text, bytea, timestamptz, uuid),
  portal.list_family_invitations(text, uuid),
  portal.invitation_delivery_recipient(text, uuid, bytea),
  portal.mark_invitation_delivery(text, uuid, text)
TO goldleaf_portal_runtime;
```

`sent` records acceptance by the email provider, not confirmed receipt. The initial invitation and `pending` delivery state commit before an explicit admin action attempts mail. The recipient lookup rechecks admin access, token digest, expiry and pending status; the database stores only `pending`, `sent` or `failed`, never the token, link or provider response. A server-generated request UUID prevents duplicate resends when the same form submission is replayed. A failed or unconfirmed delivery requires an explicit new invitation, which invalidates earlier invitations for the same family and address. A provider may accept an email just before a status write fails; in that case treat delivery as unknown and inspect before resending. No automatic retry or persistent plaintext token is provided.

Set `PORTAL_INVITE_FROM_EMAIL` to a verified sender, `RESEND_API_KEY` and `NEXT_PUBLIC_SITE_URL` for the relevant environment. Production invitation origins must use HTTPS. Links place the bearer in a fragment; the unauthenticated `/invite` capture route is excluded from the Clerk middleware and provider and the public analytics component. It clears the fragment, exchanges the token for a short-lived HttpOnly cookie scoped to `/invite`, then navigates to `/invite/accept` for authentication and explicit acceptance. The acceptance page exposes no family details before a verified-email match. Local tests stub mail delivery and must never send real invitations.

The portal uses full document navigation between protected screens, reloads pages restored from the browser back-forward cache and redirects if the Clerk user changes. Each server query and mutation checks current membership. There is no live revocation push to an already open view; a future authenticated event subscription is required for that behaviour.

## Staff server access (local verification only)

Apply `0009_staff_access.sql` after the prior migrations. The existing portal runtime requires the following additional individually granted functions; retain the earlier grants and do not grant tables or lower-level invitation acceptance functions:

```sql
GRANT EXECUTE ON FUNCTION
  portal.issue_staff_invitation(text, text, bytea, timestamptz),
  portal.revoke_staff_invitation(text, uuid),
  portal.set_staff_family_access(text, uuid, uuid, boolean),
  portal.list_pending_staff_invitations(text),
  portal.list_staff_family_assignments(text, uuid),
  portal.list_assigned_staff_families(text)
TO goldleaf_portal_runtime;
```

Only a trusted server may supply the Clerk-verified subject. `lib/portal/staff.ts` uses the existing invitation and assignment functions, issues seven-day tokens stored only as digests, and returns a raw token once to the server caller. Reissuing for the same email revokes the old pending invitation. Staff acceptance remains `acceptInvitation` through `portal.accept_verified_invitation`. Pending invites are not accepted staff identities. `listStaff` returns an accepted membership ID and Clerk subject; the UI uses a canonical server-side Clerk batch profile lookup to label the selected accepted staff member directly above the family checklist, never infer identity from an invite email. Assignment is explicit after acceptance; the SQL checks active staff on mutation. Staff reads return only assigned family IDs and names. Migration 0009 itself adds no delivery or UI; see the 0010 section below for the current implementation and grant change.

On disposable PostgreSQL, run `db/tests/staff-access.sql` after migrations 0001 through 0009. This verifies restricted role, cross-role access, replay and revocation; the development runtime has also been checked with Neon HTTP and verified Clerk sessions.

## Invoice workflow data access (local verification only)

Apply `0008_invoice_runtime.sql` after `0007`. The server DAL uses `invoice_draft_context` and `invoice_issue_context` to derive prices from `quoteInvoice`. For each date-only service date, founding eligibility is the latest tag change by history ID recorded before the next midnight in `Europe/London`; the last change on the same local date applies to that whole date. A normal family with no history and no assigned slot is standard. A legacy assignment lacking sufficient history returns unknown and requires reconciliation to its actual date before quoting; no date is invented.

The checked draft and issue functions lock the affected family, settings and invoice, then compare the full previously read context. A change returns SQLSTATE `40001` and the DAL raises `InvoiceContextChangedError`; refresh and requote rather than retrying stale data. Draft retries must reuse the same operation UUID and identical request. Issued retries return the existing invoice number. Payment retries reuse the operation UUID and identical details. VAT is calculated in integer pence per line. Issue and due dates use Europe/London regardless of the caller session time zone; history timestamps in the checked context use UTC. Existing issued snapshots are never recalculated after later settings or founding changes.

Only verified Clerk server identity may supply subjects. Prior to 0011 the database role could be granted individual EXECUTE privileges on `read_billing_settings`, `save_billing_settings`, `read_admin_invoice`, `read_family_invoices`, `record_invoice_payment`, `invoice_draft_context`, `invoice_issue_context`, `read_invoice_draft_operation`, `create_invoice_draft_checked`, and `issue_invoice_checked`. Never grant table access, `invoice_pricing_context`, `create_invoice_draft`, `issue_invoice`, or other internal helpers. No role, provider, production database, UI, email or payment processor is configured by this migration. Neon HTTP and Clerk signed-in integration remain untested locally. CI exercises synthetic PostgreSQL 17 database calls and concurrency; run `db/tests/invoice-runtime.sql` and `db/tests/invoice-runtime-concurrency.sh` only on a disposable database after the migrations.

## Staff invitation delivery and assignment editor

Apply `0010_staff_delivery.sql` after 0009. It adds only delivery state and replay IDs to staff invitations, plus an atomic replacement of one accepted staff member's family assignments. It does not persist invitation tokens or mail-provider responses. Grant only these additional entry points to the existing restricted portal runtime:

```sql
GRANT EXECUTE ON FUNCTION
  portal.issue_staff_delivery(text, text, bytea, timestamptz, uuid),
  portal.list_staff_deliveries(text),
  portal.staff_delivery_recipient(text, uuid, bytea),
  portal.mark_staff_delivery(text, uuid, text),
  portal.set_staff_assignments(text, uuid, uuid[])
TO goldleaf_portal_runtime;

-- The delivery wrapper replaces the direct issuance grant from 0009.
REVOKE EXECUTE ON FUNCTION portal.issue_staff_invitation(text, text, bytea, timestamptz)
FROM goldleaf_portal_runtime;
```

Verify the runtime cannot execute the lower-level issuer after applying these grants. The server supplies the verified subject; SQL rechecks active admin membership. A stable request UUID makes a replay fail without issuing another invitation. A resend creates a new token and invalidates earlier invitations for the same email. Delivery commits before an explicit send attempt: `sent` means provider acceptance, not receipt, and `pending` can mean delivery is unconfirmed. If the response is lost, inspect the list before explicitly resending. Assignment updates lock the selected active staff membership and apply all selected family changes in one transaction. Staff can read only their assigned families. No role, table or sequence grants are added by this migration.

Run `db/tests/staff-delivery.sql` and `db/tests/staff-delivery-concurrency.sh` on disposable PostgreSQL after migrations 0001–0010. They use synthetic records. No development or production application of 0010, real mail or live write verification is implied by the migration.
## Invoice UI foundation

Apply `0011_invoice_ui.sql` after `0010` as the owner. This adds a configurable issuer contact seeded to the public `admin@goldleaf.education` fallback and includes it only in new issued snapshots. Existing issued snapshots are not rewritten and may lack that field. If `NEXT_PUBLIC_CONTACT_EMAIL` differs, update billing settings explicitly. It adds admin and parent invoice lists, payment-operation reconciliation, and per-parent notification state; no tables are granted to the runtime role. The server checks a reviewed quote fingerprint, recomputes prices and uses the 0008 locked context check before saving or issuing. Fingerprints are version checks, not authorisation credentials.

Grant the trusted portal role only these additional functions, retaining existing scoped grants:

```sql
GRANT EXECUTE ON FUNCTION
  portal.save_billing_settings_with_contact(text,text,text,text,boolean,integer,text,integer,text,text,date),
  portal.list_admin_invoices(text), portal.list_parent_invoices(text),
  portal.read_invoice_payment_operation(text,uuid,uuid), portal.list_invoice_payments(text,uuid),
  portal.prepare_invoice_payment(text,uuid,uuid,integer,date,text),
  portal.complete_invoice_payment(text,uuid,uuid), portal.list_invoice_payment_intents(text,uuid),
  portal.prepare_invoice_notifications(text,uuid), portal.list_invoice_notifications(text,uuid),
  portal.fail_invoice_notification(text,uuid),
  portal.claim_invoice_notification(text,uuid,uuid,text,text,text,boolean),
  portal.finish_invoice_notification(text,uuid,uuid,text)
TO goldleaf_portal_runtime;
-- After all callers use the intent workflow, remove the old direct writer.
REVOKE EXECUTE ON FUNCTION portal.record_invoice_payment(text,uuid,uuid,integer,date,text) FROM goldleaf_portal_runtime;
```

Revoking the old writer can interrupt an older running application version, so coordinate it with the application rollout. The intent completion function calls the existing writer as its owner; the runtime role does not need direct access.

Issued invoices create pending notification records for active parent memberships. Sending and retrying are explicit admin actions. The server resolves a verified Clerk address and rechecks the active membership before sending a protected link, with no child data. `PORTAL_INVOICE_FROM_EMAIL`, `RESEND_API_KEY` and `NEXT_PUBLIC_SITE_URL` must be configured for delivery. The email provider retains idempotency keys for 24 hours; this implementation stops reusing an uncertain attempt after 23 hours 55 minutes and requires an explicit duplicate warning before a new attempt. Each claim has a separate fencing ID; a late completion cannot overwrite a newer claim while the provider idempotency key remains stable. An uncertain result or a stale sending lease may already have sent; provider acceptance is not proof of delivery. There is no polling, scheduled worker or automatic resend. Membership can change after the final check while a message is in flight; the linked page rechecks authority on access. Never store raw provider secrets in notification rows.

A payment operation first commits a durable intent with the validated invoice, amount, date, reference and admin actor. Completion records the existing idempotent payment and marks the intent in one transaction. Only one intent per invoice can remain pending; any authorised admin can resume that exact operation after a session change. A balance change can reject an uncompleted intent and free the pending slot. While the browser response is unconfirmed, tab-scoped retry data is bound to the Clerk session and cleared after confirmation or session change; absence alone does not authorise a new attempt. Test `db/tests/invoice-ui-upgrade-before.sql`, migration 0011, `db/tests/invoice-ui.sql` and the concurrency script only against a disposable database. Signed-in browser, Clerk lookup, Neon HTTP and real email delivery remain unverified locally.


## Children, sessions and learning foundation

Apply forward-only migrations `0012_children_sessions.sql` and `0013_learning_updates.sql` after preceding migrations, including 0011 when present. They create child identities and scheduled sessions, separate private staff notes from parent drafts, and store published family updates as snapshots. No runtime table or sequence access is required. After review, grant only the following to the existing restricted portal runtime:

```sql
GRANT EXECUTE ON FUNCTION
  portal.create_child(text, uuid, text, uuid),
  portal.rename_child(text, uuid, text),
  portal.list_children(text, uuid),
  portal.schedule_child_session(text, uuid, timestamptz, integer, uuid, text),
  portal.set_session_location(text, uuid, text),
  portal.reschedule_child_session(text, uuid, timestamptz),
  portal.list_child_sessions(text, uuid),
  portal.update_session(text, uuid, text, text),
  portal.learning_workspace(text, uuid),
  portal.save_private_note(text, uuid, text, integer),
  portal.save_learning_draft(text, uuid, text, smallint, text, text, text[], integer),
  portal.preview_learning_draft(text, uuid, integer),
  portal.publish_learning_draft(text, uuid, integer, uuid, text),
  portal.list_published_learning(text, uuid, uuid)
TO goldleaf_portal_runtime;
```

Do not grant the internal `require_family_worker`, `normalise_explored_sounds` or `learning_fingerprint` helpers. Subjects come only from verified server identity; SQL rechecks membership and locks staff assignment for writes. A session begins with attendance unrecorded, independently of its lifecycle. The optional location is an actual admin-entered label, visible only to authorised family members and assigned staff. The server schedules using `site.sessionMinutes` and the existing `sessionBlocks`; no duration is inferred from archived mockups.

A preview returns a SHA-256 fingerprint over the exact draft, explicitly explored sounds, version, session, child and family. Publishing locks and rechecks that context and the current authority. The fingerprint is a consistency check, not an authorization capability. Reuse the same operation UUID, version and fingerprint on retry; a successful replay returns the original publication. Publications are shared in the child's family archive, not addressed to a frozen list of individuals. Parents read only published snapshots, never the workspace or draft. Stale note and draft edits report a conflict and must be refreshed. PostgreSQL notifications carry only changed record IDs and are delivered on commit; consumers must re-read durable, authorised state on notification and reconnect. This migration does not provide a subscription transport or live UI, and has not been applied to development or production.

Run `db/tests/learning-foundation.sql` and `db/tests/learning-concurrency.sh` only on a disposable PostgreSQL database. The tests use synthetic records and cover scoped access, privacy, preview consistency, replay, conflicting edits and assignment removal.

## Family messaging foundation (local development)

Migration `0015_messages.sql` follows 0014 when available. It stores bounded plain-text family messages and parent-owned session change requests; it does not send mail or modify a session when a request is created. A deliberate admin resolution can invoke the existing session reschedule function. Family-row locks serialize message sends and read-cursor advances so a message committed later cannot be hidden by an earlier displayed cursor. Message UUID replays require the same actor, family and text; resolution replays require the same admin and values. Unread counts exclude the reader's own messages. PostgreSQL bigint sequences are decimal strings at the TypeScript boundary.

Only verified server identity may provide a subject. The runtime role needs individual EXECUTE grants on `send_family_message(text,uuid,uuid,text)`, `list_family_messages(text,uuid)`, `mark_family_messages_read(text,uuid,bigint)`, `family_message_unread(text,uuid)`, `request_session_change(text,uuid,uuid,text)`, `list_session_change_requests(text,uuid)` and `resolve_session_change(text,uuid,text,timestamptz)`. No table, sequence, or `require_message_access` grants are needed. These functions recheck active membership and staff assignment. Run `db/tests/messages.sql` and `db/tests/messages-concurrency.sh` only against disposable PostgreSQL 17 databases. This is a development slice, not a claim of remote migration, UI, notifications, or delivery readiness.

Migration `0016_portal_events.sql` adds commit-only opaque-ID notifications for session public fields and membership/assignment changes. Legacy session signals also cover private notes and drafts, so the resolver never delivers them to parents. Published learning, family messages and parent-owned requests resolve current authority before emitting a generic client invalidation. The affected subject receives `access_changed` even after revocation, which prompts a fresh authorised read and does not grant access. Grant only `portal.portal_event_active(text)` and `portal.resolve_portal_event(text,text,uuid)` to the trusted runtime; do not grant the trigger functions or tables.

The Node route uses `GOLDLEAF_PORTAL_EVENT_DATABASE_URL` with a direct, unpooled connection for LISTEN. One open portal view consumes one direct database connection; JWT expiry or 55 seconds closes it, and reconnect establishes LISTEN before a current-authority check and client refresh. Each connection performs one LISTEN and one authority query at startup; each genuine notification performs one scoped authority query. Heartbeats do not query the database. Short-lived Clerk tokens and the platform duration limit cause reconnects; operators should account for connection and function duration costs before enabling the transport. The standalone client component is not yet integrated into the shared shell. No paid service, worker or polling fallback is included.
