# Goldleaf Portal Implementation Plan

> Deliver each sprint through reviewable PRs with Superpowers subagent-driven development. Sol owns the plan and integration. Terra agents implement and fix each slice. Sol calls Astra for advice when a Terra agent hits a concrete blocker. Terra applies the resolution.

**Goal.** Let Goldleaf onboard parents and staff, issue invoices, and manage the five founding places. Deliver the six existing Stitch views on the same system.

**Architecture.** Extend the Next.js App Router application with server-rendered parent, staff and admin routes. A server-only data access layer enforces role and record scope on every access. Neon Postgres holds durable records. Onboarding, invoices and the public offer share the same family identity.

**Stack.** Next.js 16.4.5, React 19, TypeScript, Tailwind v4, Zod, Resend and Neon Postgres 17. Keep the existing GitHub Actions and Vercel delivery path. Use Clerk for identity and verified sessions. Goldleaf stores app membership and family authorization in Neon.

**Spec.** [Live Stitch project](https://stitch.withgoogle.com/projects/8457214603129819597), [six archived exports](../../portal-mockups/README.md), [portal brief](../../portal-mockups/DESIGN-BRIEF.md), [feature tree](../../../FEATURE_TREE.md) and [Graphify map](../../../graphify-out/graph.json).

## Design contract

The six final Stitch screen exports set composition, visual order, component proportions, typography and interaction hierarchy. Use the final screen HTML and archive for review. The project's global theme metadata contains older font settings. Use the screen-level Fraunces and Lexend typography, actual wordmark, and existing paper, forest and gold tokens. Render current business data from [site](../../../content/site.ts), [pricing](../../../lib/pricing.ts) and [session blocks](../../../content/session.ts). The samples show fictional families and historical 105-minute sessions. Use the current 120-minute duration and actual authorised records.

| Stitch frame | Screen ID | Route | Sprint |
| --- | --- | --- | --- |
| Parent Home, desktop | `9c239c054fc74de199d6615294c7d72b` | `/parent` | 2, then 4 and 5 |
| Parent Home, mobile | `f113f0e3e2714b7f9dd6891b1df9f6f3` | `/parent` | 2, then 4 and 5 |
| Parent Learning Journey, desktop | `17915fc8b60d419d8153bfbc8ad1dd26` | `/parent/learning` | 5 |
| Staff Today, desktop | `7cbdd3498ce6423dbaeb38dd28edbe42` | `/staff` | 3, then 5 and 6 |
| Staff Today, mobile | `6f009db4e9494a99b36efc2611e9c706` | `/staff` | 3, then 5 and 6 |
| Staff Session Workspace, desktop | `add682bfd8d747bd99f48a0510ba7a2c` | `/staff/sessions/[id]` | 5 |

Create companion Stitch frames for missing flows before implementing their visible UI. Sprint 2 needs sign-in, invite acceptance and the admin family form. Sprint 3 needs staff invitations and assignments. Sprint 4 needs parent invoice list and detail, plus admin draft, issue and record-payment states. Sprints 5 and 6 need mobile detail, session list, messages and settings. Archive each selected frame ID, device, expected controls, and empty, pending, error and success states. Preserve the six baseline frames. Put an independent Jury recommendation and supporting screenshots in the PR for any design deviation.

The custom authentication reference boards are desktop Stitch screens `d7f0b9ce50b642b88a0e3313b1b5902c` (sign-in and recovery), `a9c844086aea416bafa24f934cb7722a` (signup and verification), and `e7145a748fce40be80e9c2223e6adb83` (account and profile). They show conditional states, not simultaneous forms. Omit synthetic identities, invented password rules and expiry times, and unavailable controls. The invitation email is entered by the user; only the authenticated acceptance operation checks it against the invitation. Use current provider-derived identity and verified status. Preserve the user's requirement for custom visible authentication and account controls while keeping provider security checks.

The Google sign-in image is the light Android/Web button from [Google's official sign-in asset bundle](https://developers.google.com/static/identity/images/signin-assets.zip); the action itself uses the existing provider SDK.

Custom identity work handles a required username only when the provider reports it missing, plus the provider's pending compromised-password task using the same bound session. The selected development and production instances currently do not require organization selection or MFA setup; any other pending task remains blocked with an account-support message. Verify real provider task, challenge, signup, recovery and authorization paths before production use; local state tests alone are not evidence that those paths ran.

The desktop admin family form has a companion Stitch draft, `ee9f8cc112ad420d8ba1e65b7137dd06`. Its inspected screenshot and HTML include the family name, parent email, founding checkbox, synthetic capacity, and create-and-invite action. The active navigation uses the original Staff Today gold treatment. Verify interaction and responsive states on the implemented form.

## Delivery and verification

- Branch each sprint from current `origin/main`. Use named, isolated worktrees and give each Terra agent exclusive file ownership. Sprint 1 and missing-frame preparation can run concurrently. Sprint 3 and Sprint 4 can run concurrently after Sprint 2, using separate migrations and routes. Rebase shared map changes and repeat checks on the final commit.
- Run code and security reviews independently on each PR's current head. Resolve findings and repeat affected checks. Merge after both reviews and required CI are green. This repository deploys to Vercel after a green main build. Apply forward-compatible migrations before enabling consumers, verify the production smoke after merge, and preserve an application rollback path.
- Run `pnpm lint`, `pnpm build`, `pnpm typecheck`, `pnpm test:unit` and applicable DB and e2e tests. Keep branch/preview credentials separate from production. Use synthetic data. Sprint 1 changed CI Playwright to bundled Chromium. Use the Codex in-app browser for hands-on verification; do not launch Google Chrome locally.
- For each visual PR, capture a production build at the matching Stitch viewport plus 390px mobile, keyboard, zoom and reduced motion. Check screen readers and axe, meaningful interaction states, navigation parity and no overflow. Pass a fresh critic the evidence and Jury rubric only. Target at least 8/10 in design, usability, creativity, content and applicable developer categories. Target mobile LCP below 2.5s and CLS below 0.05. For protected screens, verify access controls and no indexing. Use a synthetic signed-in session for screenshots and exclude private data from review evidence.
- Update [feature tree](../../../FEATURE_TREE.md) and [Graphify](../../../graphify-out/GRAPH_REPORT.md) in every sprint, with status, dependencies, consumers, source links and test evidence. Reuse public pricing, enquiry validation patterns, navigation primitives, sound tiles, the stage path and the session timeline where they fit the Stitch design.

## Sprint 1 · Neon and live public availability

**Owns** `db/migrations/0001_founding_availability.sql`, `db/migrations/0002_seed_founding_slots.sql`, `lib/founding-availability.ts`, `.env.example`, the public founding consumers and their tests. Development database: project `fragrant-grass-41713722`, branch `br-old-glade-b92x5418`, database `goldleaf`, region Frankfurt. Main branch: `br-muddy-bonus-b962akmt`. Provisioned empty via the connected Neon CLI. [PR #6](https://github.com/FSS-Ltd/goldleaf/pull/6) shipped the Neon integration. [PR #7](https://github.com/FSS-Ltd/goldleaf/pull/7) restored green main CI after the navigation check exposed a phonics rendering issue. Production smoke verified 5 of 5 places.

- [x] Verify a clean migration against the development branch. Give `portal.families` a durable ID. Reserve five numbered slots with a database-constrained family assignment. A family can use one slot and each slot can have one family. Publish only one aggregate row from `public_offer.founding_availability`.
- [x] Run a privilege test as the separate read-only public role. It can select the aggregate. Access to private tables and writes must fail. Keep the migration owner out of runtime credentials.
- [x] Implement one request-scoped server read with an available or unavailable result. Thread the result through home, pricing, enquiry and shared CTA consumers. Render accurate 5, 1 and 0 states. On missing config or database failure, use neutral enquiry copy and standard pricing. Avoid a fabricated count.
- [x] Demonstrate that a committed slot change appears on the next request and an uncommitted change stays invisible. Check duplicate families, competing writes for the final slot and count parity across routes. No background reads. Update the feature maps and document a repeatable application and privilege-check procedure.
- [x] After review, apply the schema and scoped role to the empty main database, configure server-only credentials through Vercel and run a smoke against production. Check that previews use development credentials or the documented neutral state.

## Sprint 2 · Parent and admin onboarding with founding pricing

**Owns** `app/(portal)/(provider)/sign-in/`, `app/(portal)/invite/`, `app/(portal)/(provider)/parent/`, `app/(portal)/(provider)/admin/`, `lib/portal/access.ts`, `lib/portal/invitations.ts`, `lib/portal/families.ts`, and identity, family and assignment-history migrations. Keep the public enquiry form as an enquiry. Admin starts onboarding a family after accepting them.

Ship the private database foundation first. Verify invitation acceptance, revocation, family isolation, and founding-slot races against Postgres before connecting request identity. The access-layer slice connects verified identity to scoped database operations. The following slice connects these operations to the Stitch-led forms and parent home. Release stays gated on the synthetic end-to-end workflow.

Use the Dashboard-selected existing Clerk application from the user's setup handoff. At the authentication stage, follow that handoff's setup checklist and host CLI authentication steps. From this pnpm worktree, use `pnpm dlx clerk@latest init --app "$CLERK_APPLICATION_ID"` only after identifying an existing-project setup with no Clerk integration. Reuse existing integration and working keys if found. Keep development and production Clerk instances and keys separate. [Clerk CLI](https://clerk.com/docs/cli)

The earlier isolated development Neon Auth probe established provider behavior before Clerk was selected. Goldleaf's app database does not depend on the probe. Use Clerk's server-verified user ID and a verified invitation email to call the provider-neutral onboarding operations. Read current Goldleaf membership on protected requests and mutations, including when a Clerk session remains valid.

- [ ] Connect the server-only portal access layer to Stitch-led forms; verify provider session retrieval, verified email, sign-out/revocation, trusted origins, branch isolation and secure cookie defaults. The initial admin is provisioned through a documented authenticated bootstrap. Application membership assigns admin, parent or staff role. No client-supplied role or provider user ID grants access.
- [ ] Create a family and issue a scoped invitation through the admin form. Bind the invite to a canonical verified email and intended family. Store a hash for any app-owned token. Accept exactly once in a transaction. Resend and revoke invalidate outstanding tokens, and expired, reused, wrong-email and concurrent accepts are tested. Reuse Resend server-side for explicit invites after commit, with retry and a visible failed-delivery state. Keep URLs out of logs and remove invite parameters from the active URL after exchange.
- [ ] Show the parent home using both Stitch frames with genuine empty states until sessions and invoices exist. Select children only from authorised family membership. Deny forged child or family IDs, including action calls, and recheck access after revocation. Disable portal indexing and private response caching.
- [ ] Add a labelled admin Founding family selection. Atomically claim or release a slot and record actor, time and previous state. Competing claims cannot exceed five. Keep pricing eligibility history so removing a tag cannot rewrite an issued invoice. Announce success/failure accessibly and reread committed availability. Public count reflects the slot change on the next navigation or refresh.
- [ ] Run a synthetic admin-to-parent acceptance walkthrough on desktop and mobile. Keep production onboarding disabled until identities, invite delivery, notice and account scope pass review.

Draft onboarding UI uses companion Stitch frames `ee9f8cc112ad420d8ba1e65b7137dd06` (admin), `548ddd2e897b4ddba79a919953b1a5af` (invitation states), and `7c4c7f2e5f8d411a91a15d0e7a1777a9` (parent empty state). The invitation frame’s unlabelled read-only email input is presented as labelled, verified-account text; the parent frame’s unsupported pastoral/help placeholders are omitted. Unimplemented sessions, learning, notes and billing show unavailable states rather than unverified empty claims. Delivery is explicit, hash-only and records pending/sent/failed; provider acceptance is not proof of receipt. Real signed-in and provider delivery workflows remain release gates.

## Sprint 3 · Staff onboarding and assignment

**Owns** `app/(portal)/admin/staff/`, `app/(portal)/staff/page.tsx`, `lib/portal/staff.ts` and staff assignment migrations. Consume Sprint 2's invitation and access contracts. Server access exposes accepted membership IDs and Clerk subjects; resolve selected accepted staff profiles through a server-side Clerk batch lookup and display the selected identity directly above the family checklist. Invite email is not an accepted identity. The companion staff invitation design reference is `1bf98347d63f4da19f1511d51be74e7f`; original staff desktop and mobile references remain unchanged.

The staff UI slice adds migration `0010_staff_delivery.sql`, reuses the existing invitation fragment capture and role checks, and saves each selected staff member's family assignments atomically. The Today view shows assigned families and marks sessions and attention updates unavailable until those features exist. Development application of 0010, real mail, and signed-in staff workflows remain separate verification gates.

- [ ] Issue staff invitations with a separate purpose. Admin assigns authorised families or children explicitly. Staff sees only assigned records and cannot invite admins, change family pricing or access unrelated billing. Revocation takes effect on the next protected read or mutation.
- [ ] Render Staff Today on desktop and mobile using the two Stitch frames. Use actual assigned sessions or the designed empty state. Keep unfinished actions out of the navigation until they have a working destination.
- [ ] Test parent/staff/admin role crossing, guessed identifiers, expired staff invitation, removal during an active session and keyboard access to the mobile attention list.

## Sprint 4 · Invoicing

Jury-approved reference compositions: parent frame `852c68ea1bb3458a8b13f46d1c6e6e67` (HTML `projects/8457214603129819597/files/67c751ff942643cf830b219755e814f2`, PNG `projects/8457214603129819597/files/fadf60056b4e4988b185b9294cfa21b3`); admin frame `986b97fa58ef4c3f8e0ca93d1cd93b2e` (HTML `projects/8457214603129819597/files/c05a8a1534c2431fb7bb21d4c955ae65`, PNG `projects/8457214603129819597/files/2f52b8dd9b124669bb92dc42d5119d5c`). Adaptations retain the card compositions and Goldleaf tokens while using actual scoped data, truthful empty and error states, configured policies and snapshot-only issued details. Quantity multiplies the quoted billing period; no second discount is applied. VAT is shown only when enabled. Issuance and external payment require explicit actions; notification retries disclose uncertain outcomes. Mobile detail returns to the list. Jury review moves invoice records above a compact settings summary and uses stacked icon-and-label mobile navigation.

**Owns** `app/(portal)/admin/invoices/`, `app/(portal)/parent/billing/`, `lib/portal/invoices.ts`, `lib/portal/invoice-pricing.ts` and invoice migrations. Consume family authorisation and founding eligibility history from Sprint 2. Use GBP integer pence and canonical pricing logic. Keep invoice policy explicit and configurable.

The server DAL and migration `0008_invoice_runtime.sql` provide configured settings, scoped invoice reads, canonical quotes and checked draft/issue/payment operations. Invoice UI and explicit, durable notification attempts are implemented in this branch; migration deployment, provider configuration and signed-in validation remain pending. Founding eligibility uses the last tag change by the end of each service date in Europe/London; legacy records without sufficient history require reconciliation.


- [ ] Let admin create, preview and issue a draft with line items and service dates. On issue, allocate a unique invoice number in the transaction and snapshot supplier and recipient details, service dates, quantities, rate, discount, any applicable tax, due date and totals. Retries reuse the same issue result. Published invoices retain issued data when profile, prices or tags change.
- [ ] Provide parents a family-scoped invoice list and printable invoice. Use configured payment instructions and explicit admin recording of external payment. A recorded settlement has a date, reference and amount. Deliver a minimal Resend notification linking to the protected invoice. Email contains no child data. No online payment or recurring collection is required for this pilot.
- [ ] Test concurrent issue, money rounding, standard/founding/post-intro rates, effective-date boundary, access across two families, failed email, retry and historical invoice integrity. Use the existing pricing test as the published rate comparison.
- [ ] Seed the supplied supplier name and address, with VAT disabled initially; make VAT, payment terms and method, cadence, and the founding-rate transition configurable. Require applicable settings before issuance. The marketing label says Easter 2027. Verify invoice fields against [GOV.UK invoice requirements](https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include). Verify release using synthetic invoices before enabling real issues.

## Sprint 5 · Sessions, attendance and learning journey

**Owns** `app/(portal)/staff/sessions/`, `app/(portal)/parent/sessions/`, `app/(portal)/parent/learning/`, `lib/portal/sessions.ts`, `lib/portal/observations.ts` and session/observation migrations.

- [ ] Store scheduled sessions with timezone-aware timestamps and present UK local time. Render Staff Today schedule, next-session context and session workspace. Share the canonical 120-minute session blocks with the public explanation. Default attendance to Not recorded. Persist Present and Absent only after an explicit action.
- [ ] Store private staff notes separately from parent updates. Preview the family and child recipients before publishing. Parents can read shared, dated observations and current practice. Staff can see authorised private notes and drafts. Test preview/publish retries, stale access, wrong recipients and separation of content.
- [ ] Render the Parent Learning Journey with the existing Stage 0–4 progression, stage path and sound tile treatment. Test empty history, a change of selected child and a real published observation moving into the parent home.

## Sprint 6 · Messages, change requests and pilot rollout

**Owns** `app/(portal)/parent/messages/`, `app/(portal)/staff/messages/`, `lib/portal/messages.ts`, and message/notification migrations. Reuse authenticated scopes and delivery behavior from Sprint 2.

- [ ] Persist scoped conversations and change requests. Reconcile unread/attention counts from committed state. Where an open screen needs live updates, use an authenticated event subscription available on the existing deployment. Fetch authorised state on open and reconnect. Duplicate events are harmless. Use only IDs with no personal data in notifications. Deliver server-side alerts after commit with idempotency and retry. No database or API polling for idle screens.
- [ ] Verify a connected viewer receives authorised updates, reconnect catches missed changes, revocation blocks future reads, and disconnect cleans up. Verify production UI against all six frames and any approved companion frames, including at least two Jury passes with evidence.
- [ ] Confirm privacy notice, retention, access and release checklist with the client. Verify database restore in a separate environment before storing real family data, and rehearse turning off portal entry while keeping issued records. Onboard one real pilot family and tutor only after explicit client-side access and data requirements are ready.

## Risk cases to keep in PR review

- The second admin grabs the last founding place while the first submits. Only one transaction succeeds, and the losing admin sees a capacity error. Sprint 2 tests both orders.
- An invitation is forwarded, replayed or accepted during revocation. Verified identity, purpose and a transactional state check decide access. Sprints 2 and 3 test each case.
- A parent changes a family, child, session or invoice identifier. Each DAL query verifies record scope and every server action independently verifies authority. Sprints 2–6 test foreign identifiers.
- A payment or invitation delivery fails after its database commit. The durable record is preserved and an explicit retry uses the same identifiers. Sprints 2 and 4 test the failure and replay.
- A private note, contact detail or expired discount is carried into a parent view or invoice. Separate DTOs, authorised joins and issued snapshots control what each reader sees. Sprints 4 and 5 exercise the transition.

Multi-role account navigation adapts the existing profile-menu design (Stitch e7145a748fce40be80e9c2223e6adb83): show deduplicated active portal roles, mark the current role and recheck authority on each destination. Jury approved this focused adaptation; live keyboard and narrow-screen verification remains pending.

### Learning foundation (backend, pending review)

Migrations 0012 and 0013 add family-scoped children and sessions, explicit attendance, private staff notes and draft/preview/publication data. Staff writes recheck active assignment; parents read only family publications. Session duration and teaching references reuse `site.sessionMinutes`, `sessionBlocks` and `stages`. Location is optional and admin-entered. Explicitly recorded explored sounds default to an empty list and are never evidence of mastery. Publication preview compares a family/child/draft fingerprint, including those sounds, under lock, with operation UUID replay; it does not freeze a recipient list. PostgreSQL emits ID-only post-commit notifications; authenticated subscription transport and reconnect handling remain planned. The learning UI is under review. Migrations through 0013 and scoped runtime access are verified in development and production databases; production portal application credentials are not activated.

### Messaging and event transport foundation

The isolated messaging branch adds family-scoped messages, read cursors and parent-owned session change requests without a message UI or automatic rescheduling. The planned event client is not mounted in the shared portal shell. The route establishes an unpooled Neon WebSocket LISTEN before an authorised catch-up, sends only generic invalidations, rechecks database authority per notification and closes at JWT expiry or 55 seconds. Parents do not receive legacy session signals used by private notes; separate actual-session changes are public to authorised family members. Reconnect re-reads state; no periodic database query is used. One direct connection per open view and expiry-driven reconnects require capacity monitoring. See [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver), [Neon pooling limitations](https://neon.com/docs/connect/connection-pooling), [Vercel streaming duration](https://vercel.com/docs/functions/streaming-functions) and [Clerk session token verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification). Migrations 0015–0016, restricted grants, live provider integration, message delivery and visible UI remain pending review and deployment.
### Session and learning interface (pending review)

Admin child registration and UK-local scheduling, parent session/learning views, and staff and admin session workspaces consume the scoped learning DAL. Publication retries bind every operation to its actor and reviewed snapshot while preserving earlier duplicate history. The original desktop references and approved admin 6e18df6b9942453ca7aa955e5f64a2e0, parent mobile 1f91dbee3aa8499dabc4d79b98344764 and staff mobile 832867c4335047aba53d1366e9d682a5 compositions inform this implementation. No age, invented venue, mastery, auto-running timeline or placeholder records are introduced. Explicit sounds preserve their labels; published stages are not presented as completion. ID-only notifications still lack an authenticated event transport. Migration 0014 is not yet deployed; real signed-in workflows and visual/keyboard review remain pending.

Production database preparation through migration 0013 and scoped runtime verification is complete, with the initial admin and no families. This is separate from production portal activation; hosting credentials and OAuth setup remain pending. Migration 0014 remains unprovisioned pending review.
