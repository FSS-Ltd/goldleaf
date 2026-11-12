# Invoice Composer Implementation Plan

**Goal:** Support child-count invoice lines while preserving legacy period invoices, and make draft review a compact accessible dialog.

**Architecture:** Keep server-derived canonical pricing and checked operations. A validated optional request version selects children; absent means legacy periods. Migration 0019 records basis and preserves existing snapshots and operation payloads.

**Constraints:** No applied migration edits, new dependencies, remote writes, or changes to authorization, review, lock ordering, and retry guarantees. Apply migration 0019 before deploying the new application; earlier SQL ignores the child basis.

## Tasks

- [x] Inventory invoice schema, callers, Graphify connections, snapshots, replay, and tests.
- [x] Add failing tests for legacy payload/snapshot compatibility, two children, tier boundaries, and VAT.
- [x] Implement forward migration and typed server-derived basis, with checked contexts and replay compatibility.
- [x] Implement recipient and services steps with Back preservation and a native review dialog; show pricing tier and basis throughout draft and issued views.
- [x] Exercise upgrade, replay, concurrency, grants, and issue behavior on disposable PostgreSQL; integrate tests in CI.
- [ ] Run lint, typecheck, unit tests and build; update scoped Graphify and feature tree; inspect changes and report remaining risks.
