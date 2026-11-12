# Founding availability database

Apply `migrations/0001_founding_availability.sql` and then `migrations/0002_seed_founding_slots.sql` once, in order, using the database owner. These migrations are forward-only. The slot rows are fixed reference data.

## Assignment boundary

The portal UI assignment flow is planned. The `set_founding` database function provides conditional assignment; any alternative writer must preserve the same constraint:

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

Do not grant `portal.require_admin` or the lower-level invitation acceptance functions. The runtime must derive the subject and all verified addresses from Clerk for every call. Family reads recheck current role and scope in SQL. `createFamilyWithInvitation` accepts a stable family UUID generated by its trusted server caller, generates the token on the server, commits creation, invitation and founding selection together, and returns the token only after commit. Reuse that UUID for retries of the same action: an existing ID makes creation fail rather than create a duplicate. This is not a replayable success result; after a committed response is lost, an admin must inspect the existing family and use a future explicit resend flow to rotate the invitation because its original token cannot be recovered from its hash. The UI must show that delivery state. Tokens are 256 random bits, stored only as SHA-256 digests, and expire after seven days. Delivery and safe URL exchange are future work; do not log tokens or URLs. The SQL accepts all provider-verified emails in one call and delegates to the existing single-use acceptance functions.

Test `db/tests/portal-access.sql` only on a disposable local database after migrations 0001 through 0006. It exercises scoped runtime privileges, wrong or absent identity, family isolation, revocation, verified secondary email and capacity rollback. It does not exercise the Neon HTTP transport or a real Clerk session.
## Invoice data foundation (local verification only)

Apply `0005_invoice_billing.sql` after `0004` as owner. It seeds only the supplied issuer name and address and disables VAT. Terms, payment method, cadence and founding transition remain unset until an admin configures them. VAT is enabled explicitly with a basis-point rate and registration; the database does not detect thresholds or infer a rate. For positive amounts, VAT is rounded to the nearest penny per line, with half pennies rounded up, then summed. Amounts are integer GBP pence, with invoice totals capped at 2,147,483,647 pence.

All functions are revoked from PUBLIC and no runtime role is provisioned. Only a server that verifies the Clerk subject may supply the subject argument. Grant selected functions individually, never the tables, triggers, counter or `require_admin`. Admin writes lock active membership. Parent reads check current family membership in the query; staff have no invoice access. Issue locks the draft, validates configured policy, allocates the number transactionally and stores issuer, recipient, lines, terms, dates, VAT and totals as a snapshot. Repeated issue returns the same number. Issued rows and lines cannot be changed through normal SQL. External payment recording uses a caller-generated stable operation UUID; a replay with different details fails, and payments cannot exceed the snapshot total. No payment is collected.

**Do not grant or enable invoice issuance yet.** The future trusted DAL must derive every line from `quoteInvoice`, resolve the family's eligibility history for the service date, apply the post-intro rounding policy, and verify recipient and supplier data. SQL validates arithmetic and transition consistency but does not independently validate supplied prices or founding eligibility. Existing founding slot assignments predate eligibility history and need reconciliation. No provider, deployment, email or invoice UI is included here.

On a disposable PostgreSQL 17 database, run `db/tests/onboarding-upgrade.sql`, `db/migrations/0004_staff_onboarding.sql`, `db/migrations/0005_invoice_billing.sql`, and `db/tests/invoice-billing.sql` in order. Run `PGPORT=55439 sh db/tests/invoice-concurrency.sh <host> <database>` against the same disposable database. Tests create synthetic records; never point them at live data. Disable callers and revoke grants to roll back application use; preserve records and use a forward migration for corrections.
