# Parent workflow implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a family-scoped parent registration and policy journey, human review and minimal staff operational views using existing portal identities and child records.

**Architecture:** Extend the existing server-only DAL and checked PostgreSQL functions with focused records and explicit grants; retain the existing authenticated actor, family IDs, membership generation, session records, live events and transactional outbox. Version submitted snapshots and approved policy wording, recheck authority at each read and write, and enable real-data collection only after operator setup and policy gates are satisfied.

**Tech Stack:** Next.js 16, strict TypeScript, Zod, Neon PostgreSQL, existing event stream and alert outbox; no new dependency assumed.

**Spec:** [Approved parent workflow specification](../specs/2026-11-16-parent-workflow.md). The [existing pilot plan](2026-11-11-goldleaf-portal.md) retains its own unchecked acceptance and release work.

## Global constraints

- **Execution gate:** Finish alerts and authenticated local QA before starting implementation. Design approved 16 November 2026; policy wording and real-data release are not approved. No renewed design approval is required.
- Use synthetic local data and mock mail. Production migrations, grants, publication and release require separate authorisation.
- Goldleaf Learning Ltd is the user-declared controller; the service serves roughly ages 2–4 and scheduled sessions are 105 minutes. No Ofsted registration or exemption claim is established.
- Unknown service settings, lawful bases, Article 9 conditions and retention remain unresolved. Required approvals gate real collection; unavailable or unapproved health/conditional features fail closed.
- Reuse `portal.children` and family IDs, `requirePortalIdentity`, `requireRole`, `requireActionActor`, checked membership generations, role-scoped invalidation and the existing outbox. A parent membership alone does not establish parental authority. Never expose internal safeguarding notes to assigned staff or generic events.
- Each database change uses expand/contract, explicit grants and indexes, backfill/reconciliation where applicable, rollback boundaries, audit without sensitive payloads, and restricted disposable-database tests. No polling, new paid service, automatic purge or production deployment.

## Review focus

1. Stale forms after revocation or reacceptance must fail, even if the actor later returns; Tasks 1, 3 and 5 test generation changes.
2. Two parents or duplicate child submissions must not create silent duplicate records or overwrite one another; Tasks 1 and 3 test concurrency and idempotency.
3. Unapproved policy or unknown activity must never be collectable, even via a crafted request; Tasks 2 and 4 test server and SQL gates.
4. Withdrawing an optional choice must immediately remove permission in open staff views, without removing required service readiness; Tasks 4, 5 and 7 test withdrawal, duplicate events and reconnect.
5. A cross-family ID, unassigned staff member or malicious print URL must not expose sensitive records; Tasks 1, 5, 6 and 8 test scoped reads and denial.

## Existing boundaries and planned file ownership

- `lib/portal/children.ts#createChild` calls admin-only `portal.create_child`; `listChildren` and `lib/portal/parent-children.ts#parentChildren` already provide scoped existing-child selection. Parent creation needs a new checked entry point, not a relaxation of admin-only SQL.
- `lib/portal/access.ts#requirePortalIdentity` and `getActiveMemberships`, `lib/portal/require-role.ts#requireRole`, and `lib/portal/action-actor.ts#requireActionActor` establish the actor/session boundary. `db/migrations/0021_checked_membership_revocation.sql` supplies membership-generation and revocation patterns.
- Existing session status/attendance is in `lib/portal/sessions.ts` and `db/migrations/0012_children_sessions.sql`; messaging in `lib/portal/messages.ts`, event authorization in `db/migrations/0016_portal_events.sql` and `0018_portal_invalidation.sql`, alert delivery in `db/migrations/0023_message_alerts.sql` and `lib/portal/alerts/`.
- New migration filenames below start at 0024 based on this checkout; verify the next available number before implementation. Tests below run only against a fresh disposable, fully migrated local PostgreSQL instance. Set `PARENT_TEST_DATABASE_URL` privately to that instance; never use production. Run SQL with `psql "$PARENT_TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f <test-file>`.

## Task 1 — Scoped records and generation-checked registration

**Files:** Create `db/migrations/0024_parent_registration.sql`, `db/tests/parent-registration.sql`, `db/tests/parent-registration-concurrency.sh`, `lib/portal/registration-schemas.ts`, `lib/portal/registration.ts`, `lib/parent-registration.test.ts`. Modify `db/README.md` for exact new restricted grants and migration/rollback steps.

**Interfaces:** Define `RegistrationScope` as family ID, child ID, membership ID and generation; define `RegistrationRecord` as the scope, bounded draft data, revision, status and nullable submitted version ID. Expose `saveRegistrationDraft(input: unknown): Promise<void>`, `readRegistration(familyId: unknown, childId: unknown): Promise<RegistrationRecord | null>` and `submitRegistration(input: unknown): Promise<string>`. The server derives subject and session; SQL locks and checks the scope and generation. Use an explicit client-generated idempotency key and immutable submitted version ID.

- [ ] Write SQL tests for existing-child reuse, family mismatch, parent-vs-admin creation, stale/revoked/reaccepted membership, duplicate idempotency key, conflicting key reuse, invalid input and concurrent submissions. Write schema tests for strict bounded input and unavailable health fields.
- [ ] Run `psql "$PARENT_TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f db/tests/parent-registration.sql`, `sh db/tests/parent-registration-concurrency.sh`, and `node --import tsx --test lib/parent-registration.test.ts`; confirm failure before implementation.
- [ ] Add narrow SECURITY DEFINER entry points with fixed search paths, family/child foreign keys, indexes, actor and generation checks under transaction locks, exact restricted grants, and the DAL/schema interfaces. Parent creation must select an existing family child first and not infer duplicates from names alone; ensure concurrency cannot replay a child ID into another family.
- [ ] Re-run all three tests, reconcile grants and verify no direct table access. Record migration/backfill and incompatible-reader rollback boundary in `db/README.md`; commit this task.

## Task 2 — Operator setup and policy versions

**Files:** Create `db/migrations/0025_parent_policy_setup.sql`, `db/tests/parent-policy-setup.sql`, `lib/portal/policy-schemas.ts`, `lib/portal/policies.ts`, `lib/parent-policy.test.ts`, `app/(portal)/(provider)/admin/registration-settings/page.tsx`, `actions.ts`, `components/portal/registration/RegistrationSettings.tsx`.

**Interfaces:** Define `PolicyVersion` with policy ID, version ID, immutable wording/hash, owner, review date, applicability and publication state. Define `RegistrationSetup` with tri-state offers, unresolved decision entries and approval state. Expose `readRegistrationSetup(): Promise<RegistrationSetup>`, `saveRegistrationSetup(input: unknown): Promise<void>` and `publishPolicy(input: unknown): Promise<string>` in `policies.ts`; decisions use explicit unknown/offered/not-offered states. Approval is a separate recorded admin action.

- [ ] Test unknown setup stays unresolved; missing processing/health/rights/retention decisions block real collection; unapproved drafts cannot be presented or acknowledged; publishing a new version preserves prior wording and evidence. Test policy/offer changes do not silently rewrite earlier submissions.
- [ ] Run the SQL test via the disposable `psql` command above and `node --import tsx --test lib/parent-policy.test.ts`; verify failure before adding checked admin-only SQL, DAL and setup UI.
- [ ] Implement the complete setup checklist from the spec, with service facts clearly marked user-declared, conditional activities and decision provenance. Draft content for all 12 policy/form groups in the spec: registration/authority/contacts; safeguarding/allegations/whistleblowing; arrival/collection/missing child; health/allergies/food/emergency and conditional medication/first aid; accidents/incidents/injury; behaviour/inclusion and conditional intimate care; fire/evacuation/risk and conditional outings/transport; complaints; photography/online safety/confidentiality; privacy/retention/rights/breaches; safer recruitment/training; and terms/acknowledgements/consents/print. Give each owner, review date, official-source provenance and current-service, recommendation or conditional label; no invented legal basis, retention or Ofsted claim. Keep every draft unpublished until operator and applicable specialist review.
- [ ] Re-run both tests and inspect migrations/grants; commit this task.

## Task 3 — Progressive registration and submission

**Files:** Create `app/(portal)/(provider)/parent/registration/page.tsx`, `actions.ts`, `components/portal/registration/RegistrationForm.tsx`, focused step components in that directory, and `lib/registration-form.test.ts`; modify `app/(portal)/(provider)/parent/page.tsx` to link the journey.

**Interfaces:** Use Task 1's `RegistrationScope` and draft/submit functions; actions call `requireActionActor` and pass the submitted generation. Draft saves explicitly; Back retains all values. Form state separates account membership, parental authority, emergency contact and collector authority.

- [ ] Test existing-child selection, new child in the same family, Back/resume, validation failure without lost values, conditional sections, visible purpose copy, review-before-submit, duplicate request/retry and needs-changes resubmission. Test an unapproved health section cannot be submitted by forged input.
- [ ] Run `node --import tsx --test lib/registration-form.test.ts` and Task 1's tests; verify new tests fail before implementation.
- [ ] Implement focused, labelled, keyboard-accessible steps, pending/error/success states and explicit draft/submit actions. No exact birth date becomes required until an approved setup decision justifies it. Do not collect routine diagnostic, NHS or GP records.
- [ ] Re-run tests and locally verify 320px/390px layout, keyboard navigation and errors with synthetic records; commit this task.

## Task 4 — Acknowledgement, optional permissions and print

**Files:** Create `db/migrations/0026_parent_consents.sql`, `db/tests/parent-consents.sql`, `lib/portal/consent-schemas.ts`, `lib/portal/consents.ts`, `lib/parent-consent.test.ts`, `app/(portal)/(provider)/parent/policies/page.tsx`, `actions.ts`, `app/(portal)/(provider)/parent/policies/[versionId]/print/page.tsx`, and focused components under `components/portal/registration/`.

**Interfaces:** Define versioned `acknowledgePolicy(input: unknown): Promise<void>`, `recordPermission(input: unknown): Promise<void>` and `withdrawPermission(input: unknown): Promise<void>` using actor, family, child, purpose, version and idempotency scope. Privacy receipt is acknowledgement, not processing consent; optional decisions are distinct by purpose.

- [ ] Test unapproved policy denial, snapshot immutability, replacement requiring reacknowledgement, refusal not blocking readiness, optional withdrawal immediately changing current permission, replay safety and cross-family print denial. Test unknown/not-offered activities do not render or accept permissions.
- [ ] Run the disposable SQL test and `node --import tsx --test lib/parent-consent.test.ts`; verify failure, implement checked versioned records, purpose-specific choices and protected print route, then rerun to pass.
- [ ] Verify printable exact version, labels and keyboard flow locally; print is not a substitute for authenticated acceptance and makes no e-signature claim. Commit this task.

## Task 5 — Admin review, corrections and notification

**Files:** Create `db/migrations/0027_parent_review_events.sql`, `db/tests/parent-review.sql`, `db/tests/parent-review-concurrency.sh`, `lib/portal/registration-review.ts`, `lib/parent-review.test.ts`, `app/(portal)/(provider)/admin/registrations/page.tsx`, `app/(portal)/(provider)/admin/registrations/[childId]/page.tsx`, `actions.ts`, and focused review components.

**Interfaces:** Define `RegistrationReviewSummary` with family ID, child ID, submitted version ID and review status, and `RegistrationReviewDetail` with that summary, scoped submission and parent-visible correction history. Expose `listRegistrationReviews(): Promise<RegistrationReviewSummary[]>`, `readRegistrationReview(childId: unknown): Promise<RegistrationReviewDetail | null>` and `decideRegistrationReview(input: unknown): Promise<void>`; reviews bind the exact submitted version and human reviewer. Correction requests reuse the existing parent-visible messaging boundary; restricted safeguarding notes use a separate admin-only read/write path.

- [ ] Test stale-review rejection, human-only readiness, correction reopening, optional marketing refusal not blocking readiness, private-note isolation, concurrent withdrawal/revocation and no sensitive content in notifications. Test event duplication, reconnect catch-up, revocation, unsubscribe and idle query count.
- [ ] Run the SQL, concurrency and `node --import tsx --test lib/parent-review.test.ts` tests; verify failure before adding checked SQL and admin queue/actions. Extend `db/migrations/0018_portal_invalidation.sql` and `0023_message_alerts.sql` behavior through the new migration, not by rewriting historical migrations; reuse `lib/portal/alerts/` and existing subscriptions with generic identifiers only.
- [ ] Re-run tests including `npm run test:alerts` and event tests; confirm durable commit before notification, reauthorization and no normal polling. Commit this task.

## Task 6 — Minimal staff session information

**Files:** Create `db/migrations/0028_parent_staff_projection.sql`, `db/tests/parent-staff-projection.sql`, `lib/portal/session-care.ts`, `lib/parent-staff-projection.test.ts`; modify `app/(portal)/(provider)/staff/sessions/[id]/page.tsx` and add a focused session care component.

**Interfaces:** Define `SessionCare` as the current necessary emergency contacts, care actions, approved collectors and applicable permission status. `readSessionCare(sessionId: unknown): Promise<SessionCare | null>` returns only that projection for an actively assigned staff member. Admin-only notes and consent history are excluded from the SQL projection.

- [ ] Test assigned vs unassigned staff, wrong family, revoked assignment, current withdrawal and absence of admin-only notes/history; test direct and stale-view requests.
- [ ] Run disposable SQL and `node --import tsx --test lib/parent-staff-projection.test.ts`; confirm failure, implement checked projection and minimal session view, then re-run to pass.
- [ ] Verify current content refreshes on authorized invalidation and is not cached after revocation; commit this task.

## Task 7 — Operational children and attendance records

**Files:** Create `db/migrations/0029_parent_operational_records.sql`, `db/tests/parent-operational-records.sql`, `lib/portal/operational-records.ts`, `lib/parent-operational-records.test.ts`, and focused components/actions under `app/(portal)/(provider)/admin/children/` and `components/portal/registration/`; extend staff session actions only where assignment permits.

**Interfaces:** Extend existing session records with actual arrival, handover/collection actor and time, and audited controlled corrections where the approved process requires them. Provide scoped accident/incident/existing-injury and parent acknowledgement records; conditional medication authorisation/administration, first aid, intimate care, outings and other offered forms require approved activity and policy. Admin-only safeguarding/authority records remain separate from parent-visible routine records.

- [ ] Test actual times independently from the 105-minute scheduled duration, correction audit, family and staff boundaries, conditional forms unavailable when unknown, parent acknowledgement, private safeguarding segregation and concurrent updates.
- [ ] Run disposable SQL and `node --import tsx --test lib/parent-operational-records.test.ts`; confirm failure, implement scoped records/actions and re-run to pass. No automatic referral, upload or retention deletion.
- [ ] Verify optional withdrawal takes effect in staff views and no sensitive payload enters event/outbox; commit this task.

## Task 7B — Restricted internal operational records

**Files:** Create `db/migrations/0030_parent_internal_records.sql`, `db/tests/parent-internal-records.sql`, `lib/portal/internal-records.ts`, `lib/parent-internal-records.test.ts`, and focused admin pages/actions under `app/(portal)/(provider)/admin/registration-records/`.

**Interfaces:** Define a discriminated `InternalRecord` for rights requests, complaints and outcomes, safer-recruitment/training status, or restricted safeguarding/allegation chronology; each variant has an ID, scoped subject, state, timestamps and minimum necessary detail. Expose `listInternalRecords(input: unknown): Promise<InternalRecord[]>` and `saveInternalRecord(input: unknown): Promise<string>` with admin-only checked SQL and audited access. Rights, complaints and safeguarding have distinct scopes; a complaint route must not delay urgent safeguarding referral.

- [ ] Test unauthorized parent/staff and wrong-scope access denial, restricted allegation chronology, rights-request lifecycle, complaint/outcome records, recruitment/training status and audited correction. Verify no identity/DBS document uploads, invented deadlines, automatic referral, sensitive notification payload or automatic purge.
- [ ] Run disposable SQL and `node --import tsx --test lib/parent-internal-records.test.ts`; confirm failure, implement focused scoped records and admin actions, then rerun to pass. Link verified Kent reporting destinations for operator use without automatically sending referrals; preserve the alternative allegations route.
- [ ] Review retention and rights handling against approved operator decisions, and commit this task. This is not a general HR document store.

## Task 8 — End-to-end acceptance and release boundary

**Files:** Create `tests/e2e/parent-registration.spec.ts`; update `docs/portal-completion/acceptance.md`, `FEATURE_TREE.md`, and `graphify-out/` with actual implementation, connections and evidence.

- [ ] Test synthetic parent draft/back/resume/submit/correction/withdraw, distinct parents and families, wrong-account/direct action, admin review, assigned/unassigned staff, policy version replacement, protected print and responsive keyboard/error states. Include revocation during open views, reconnect catch-up and duplicate event delivery.
- [ ] Run `npm run test:unit`, `npm run test:alerts`, `npm run lint`, `npm run typecheck`, `npm run build`, and the configured hosted CI Playwright job for `tests/e2e/parent-registration.spec.ts`; use the Codex in-app browser for local UI verification and never launch Chrome locally. Execute the new SQL and concurrency tests on a disposable database. Record exact outputs, revision and any unavailable service.
- [ ] Review schema/grant reconciliation, immutable snapshots, privacy, accessibility, monitoring and rollback compatibility. Record policy and operator approvals separately from code review. Run independent code/security reviews and exact-head/test-merge CI before any separately authorised merge; never infer deployment or real-data approval. Commit evidence and map updates.
