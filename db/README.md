# Founding availability database

Apply `migrations/0001_founding_availability.sql` and then `migrations/0002_seed_founding_slots.sql` once, in order, using the database owner. These migrations are forward-only. The slot rows are fixed reference data.

## Assignment boundary

The admin assignment flow is planned, not implemented. A future writer must create the family and claim a slot in one transaction. The claim must be conditional, not an unconditional update:

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

As the scoped login, verify `SELECT 1 FROM portal.families LIMIT 0` and `SELECT 1 FROM portal.founding_slots LIMIT 0` both fail with permission denied. The preflight above checks writes without attempting them. Run the preflight again whenever role membership, grants, default privileges or object ownership change. If a check fails, investigate the effective grants and stop; do not deploy or weaken the checks. Missing or unavailable configuration produces the standard-price enquiry state. Never copy development credentials or data into production.
