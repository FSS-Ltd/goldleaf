# Portal alerts local implementation plan

Scope: synthetic local PostgreSQL and mocked provider QA only. No remote migrations, accounts, email, deployment, or paid service.

1. Add transactional outbox, source triggers, snapshot generation paths, scoped attention projection and fenced worker functions in migration 0023. Preserve old migrations and issued snapshots. Verify all migrations, old and role-specific wrappers, rollback/replay, recipient scope, generation invalidation and restricted grants on PostgreSQL 17.
2. Add the local worker using LISTEN before initial catch-up, single due-time timers, bounded reconnect, stable payload/key, authorization transaction and mocked provider. Verify no idle polling, duplicate wakeups, crash recovery, fenced completions, retry cutoff, and shutdown.
3. Add attention indicators to existing role navigation using the canonical summaries. Verify role fences, responsive behavior and accessibility.
4. Update the project feature tree and graph, run relevant checks, and record remaining rollout and separate-user/provider validation gaps. Do not deploy or send email.

## Decisions

Request resolutions for records predating migration 0023 cannot prove original membership generation; email fails closed. Email already accepted by a provider cannot be recalled. Parent revocation uses family then membership locks; staff revocation uses staff invitation order then membership and assignment. The gate tries original paths in admin, parent, staff order: an admin path locks membership; a parent path locks family then membership; a staff path locks staff order, membership and assignment. If an earlier path fails, its locks remain held until transaction end; no canonical staff writer takes a family row lock after the staff-order lock. It holds these locks until the bounded submit and finish transaction ends. The worker must never hold that transaction while resolving identity, reconnecting, or waiting to retry.

Frozen email uses the existing protected `/portal` router rather than a role-specific link. This can add one navigation step, while keeping the payload stable across surviving roles. The pre-migration limitation affects resolution email only, not request resolution.

Commit the frozen payload and key before opening the authorization gate transaction. Otherwise a crash during provider submission would roll back the idempotency record. Then hold the gate locks through bounded submit and fenced completion in the next transaction.

## Local adapter QA, 16 November 2026

`lib/alert-adapters.test.ts` uses isolated `node:test` fetch mocks and synthetic addresses. It checks fixed provider endpoints, authorization and abort signals, invalid subjects, provider failures, malformed identity responses, subject matching, verified-only filtering, the generic Resend payload and idempotency key. A successful HTTP response is provider acceptance, not proof of receipt. The existing canonical identity function preserves address casing and duplicates and does not impose an address-count cap; the worker validates the selected address. No real provider or email was contacted.

Local checks: `pnpm test:unit` passed 139 tests; `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed with Node 22.23.3 and synthetic public configuration. This does not verify provider delivery, separate-user isolation, or production readiness.

The scoped local role fixture audit is recorded in `docs/portal-completion/acceptance.md`. It does not exercise alert delivery, authenticated routes, persistence or live actions. PR 30 merged at main `5a86589`, with CI run `43844051819` successful; no new remote 0023 migration or worker grants were applied. Deployment is not functional QA.
