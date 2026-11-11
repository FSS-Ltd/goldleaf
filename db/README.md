# Founding availability database

Apply `migrations/0001_founding_availability.sql` and then `migrations/0002_seed_founding_slots.sql` once, in order, using the database owner. These migrations are forward-only. The slot rows are fixed reference data; assignments must update a slot's `family_id` transactionally after creating the family. Unique and foreign-key constraints enforce one slot per family and prevent invalid references.

For each environment, provision a separate login role named `goldleaf_offer` outside the migrations, with credentials held in the deployment secret store. As the owner, grant only:

```sql
GRANT USAGE ON SCHEMA public_offer TO goldleaf_offer;
GRANT SELECT ON public_offer.founding_availability TO goldleaf_offer;
```

Do not grant access to `portal`. Set `GOLDLEAF_OFFER_DATABASE_URL` to the scoped role's connection string. Verify the role can read the aggregate view and cannot access the private schema. Missing or unavailable configuration produces the standard-price enquiry state. Never copy development credentials or data into production.
