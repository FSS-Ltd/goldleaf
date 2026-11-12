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
