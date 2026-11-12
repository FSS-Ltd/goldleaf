# Graph Report - goldleaf-graph-refresh  (2026-11-11)

## Scoped invoice workflow update (2026-11-12)

Scoped Graphify AST extraction covers the invoice and settings DAL, DTOs and tests. SQL extraction remains unsupported; the runtime migration and source-verified connections were linked manually. Issue dates use a function-local London time zone, and history context timestamps are normalised to UTC. Prior clustering and semantic coverage were not recomputed.

## Scoped invoice data update (2026-11-12)

SQL extraction is unsupported. The invoice billing migration node and links to onboarding, pricing and the partial portal were added manually from source and runbook references. Prior clustering and semantic coverage are unchanged.

## Scoped invoice-pricing update (2026-11-12)

Graphify AST extraction added `lib/portal/invoice-pricing.ts` and `lib/invoice-pricing.test.ts`. Source-verified edges connect the quote to the existing weekly/monthly functions, business content and test. The earlier report below describes the prior corpus and clustering; it has not been recomputed. No semantic extraction or external upload was performed.

## Corpus Check
- 53 files · ~12,931 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 129 nodes · 84 edges · 12 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 15|Community 15]]

## God Nodes (most connected - your core abstractions)
1. `PORTAL-CONCEPTS: implemented design archive only` - 11 edges
2. `Parent home desktop concept` - 4 edges
3. `Parent learning desktop concept` - 4 edges
4. `Staff today desktop concept` - 4 edges
5. `Staff session desktop concept` - 4 edges
6. `Parent home mobile concept` - 4 edges
7. `Staff today mobile concept` - 4 edges
8. `Home()` - 3 edges
9. `sendEnquiry()` - 3 edges
10. `organisationSchema()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Home()` --calls--> `organisationSchema()`  [INFERRED]
  app/page.tsx → lib/schema-org.ts
- `Home()` --calls--> `faqSchema()`  [INFERRED]
  app/page.tsx → lib/schema-org.ts
- `sendEnquiry()` --calls--> `formDataToObject()`  [INFERRED]
  app/enquire/actions.ts → lib/enquiry-schema.ts
- `sendEnquiry()` --calls--> `fieldErrors()`  [INFERRED]
  app/enquire/actions.ts → lib/enquiry-schema.ts
- `PORTAL-CONCEPTS: implemented design archive only` --illustrates--> `Parent home desktop concept`  [EXTRACTED]
  docs/portal-mockups/README.md → docs/portal-mockups/parent-home-desktop.png

## Communities

### Community 0 - "Community 0"
Cohesion: 0.29
Nodes (2): mountSeedling(), shadowTexture()

### Community 1 - "Community 1"
Cohesion: 0.38
Nodes (4): Home(), faqSchema(), organisationSchema(), url()

### Community 2 - "Community 2"
Cohesion: 0.43
Nodes (7): Goldleaf portal concept brief and design references, PORTAL-CONCEPTS: implemented design archive only, Portal delivery plan (planned), Known limitation: archived 105-minute plan versus current 120-minute sessions, Planned portal information boundaries and unverified behaviour, PORTAL: partial authenticated routes and billing, Public-site design document and portal archive reference

### Community 4 - "Community 4"
Cohesion: 0.5
Nodes (3): sendEnquiry(), fieldErrors(), formDataToObject()

### Community 5 - "Community 5"
Cohesion: 0.67
Nodes (2): roundTo5(), weekly()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (4): Staff today desktop concept, Staff desktop parent update draft, Staff desktop private staff note, Staff desktop daily schedule

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (4): Parent home desktop concept, Parent desktop learning overview, Parent desktop next-session card, Parent desktop tutor note and billing

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (4): Early phonics curriculum journey, Parent learning desktop concept, Shared tutor observations, Tactile sound exploration

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (4): Selected phonics activity and materials, Staff session desktop concept, Attendance, private notes and parent update design, Historical 105-minute session timeline

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (4): Parent home mobile concept, Parent mobile curriculum overview, Parent mobile next-session card, Parent mobile observation and billing

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (4): Staff today mobile concept, Mobile attention queue design, Mobile next-session and attendance affordances, Mobile three-session timeline

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (3): Founding inventory and aggregate view, Founding role provisioning, Founding slot seed

## Knowledge Gaps
- **21 isolated node(s):** `Known limitation: archived 105-minute plan versus current 120-minute sessions`, `Parent desktop next-session card`, `Parent desktop learning overview`, `Parent desktop tutor note and billing`, `Early phonics curriculum journey` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 0`** (8 nodes): `scene.ts`, `clamp()`, `easeOutBack()`, `easeOutCubic()`, `letterTexture()`, `makeLeafGeometry()`, `mountSeedling()`, `shadowTexture()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (4 nodes): `pricing.ts`, `monthly()`, `roundTo5()`, `weekly()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PORTAL-CONCEPTS: implemented design archive only` connect `Community 2` to `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Parent home desktop concept` connect `Community 7` to `Community 2`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `Parent learning desktop concept` connect `Community 8` to `Community 2`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `Known limitation: archived 105-minute plan versus current 120-minute sessions`, `Parent desktop next-session card`, `Parent desktop learning overview` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
## Coverage and incremental update

Structural extraction used an allowlisted copy of tracked code, excluding runtime data, dependencies, build output and graph artifacts. Existing document and image nodes were retained. Founding migration, seed, provisioning, launch checklist and portal plan references are source-backed. Semantic coverage outside the portal archive and these references remains incomplete; unresolved AST edges may be omitted. The plan describes future work, not implemented portal features. After adding source-backed references, the graph contains 130 nodes and 87 directed edges.

## Sound chip update

An allowlisted structural refresh checked the shared sound chip component and its new regression test. Existing semantic nodes were preserved; direct source references link the test, component and progression content. The graph now contains 131 nodes and 90 directed edges. Existing semantic coverage limitations remain.

## Onboarding database scoped update

`graphify update db` found no supported code files; SQL extraction is unsupported. `portal_onboarding_db` and its source-backed references were added manually to the existing graph. See `FEATURE_TREE.md` for the database boundary and test evidence. Full semantic coverage remains incomplete.

The onboarding review added family-lock ordering and explicit temporary-schema precedence. A repeat scoped update still reports no supported files; the existing onboarding node remains the correct source reference. The feature tree links the added upgrade and security regression checks.

The portal node is partial, reflecting its existing onboarding database foundation. The source-backed PORTAL → PORTAL-ONBOARDING edge follows `FEATURE_TREE.md`; the current graph contains 132 nodes and 93 directed edges. SQL remains outside automated extraction.


Identity scope update: AST extraction added portal identity and sign-in route nodes. Cross-scope dependencies, proxy, and test edges remain incomplete; see FEATURE_TREE.md for source-backed connections.
## Staff onboarding update

`portal_staff_onboarding` links `db/migrations/0004_staff_onboarding.sql` to `portal_onboarding_db`. Graphify does not extract SQL: scoped `graphify update db/migrations` found no supported code files, so this source-backed node and edge were added manually. The structural summary above describes the previous extraction.

Staff migration holds a parent invitation writer lock across digest backfill and trigger installation; `db/tests/staff-migration-concurrency.sh` exercises the upgrade race on PostgreSQL 17.

Scoped library extraction added the Clerk proxy matcher regression test node. `proxy.ts` includes `/__clerk/:path*`; frontend proxy activation depends on provider and deployment configuration.

## Portal access layer update

Allowlisted structural refresh added server-only portal access files; SQL and SQL-test nodes were added from source because SQL extraction is unsupported. Existing semantic nodes remain. The graph has 161 nodes and 138 edges; existing semantic coverage limitations remain.

Corrected 4 portal edge directions where serialized source/target contradicted the source-backed `_src`/`_tgt` fields. Historical graph directions outside this affected scope remain unaudited.

## Invoice and portal access merge

The invoice database node and source-backed edges were retained alongside the access-layer graph. This merged graph contains 162 nodes and 141 edges; older structural summaries above describe earlier scopes.

Founding DTO update: scoped extraction adds the `setFamilyFounding` wrapper. The current merged graph contains 163 nodes and 144 edges; SQL is source-linked manually.

## Staff server access update

`graphify update lib/portal` extracted the staff wrapper and validation nodes into a scoped graph; the affected nodes and internal edges were merged into this persistent graph. SQL extraction remains unsupported, so `portal_staff_access` and its source-backed connections were added manually. Prior semantic nodes remain. PostgreSQL and application tests are recorded in the feature tree.

The staff and invoice runtime maps were reconciled after merging main: the combined graph contains 200 nodes and 189 edges. Existing nodes from both branches are retained; SQL remains source-linked rather than extracted.

Staff access schema was re-extracted after normalizing Neon timestamp values; `staff_access_test` now links the regression test to the shared schema. SQL and cross-scope semantic coverage remain limited.

## Parent and admin onboarding update

An allowlisted structural refresh reconciled public route-group moves, the Clerk-free invitation capture, provider-backed acceptance, scoped portal UI and tests. SQL migration and test references were added manually because SQL extraction is unsupported. Existing semantic nodes are retained where their source paths and endpoints resolve. The graph contains 226 nodes and 213 directed edges, including the source-linked resend concurrency test. Other semantic coverage and older unrelated edge directions remain unaudited.

Final targeted AST reconciliation updated changed invitation and action symbols and removed an extractor artefact named `if()`. The full scoped graph update refused to overwrite the larger mixed graph, so its existing semantic and SQL nodes were retained. The final graph has 225 nodes and 211 directed edges. Historical unrelated coverage remains unaudited.

Scoped proxy refresh: `/portal` and nested paths now receive Clerk middleware; `/invite` capture remains excluded. Source-backed matcher regression is `lib/portal-proxy.test.ts`. No structural nodes or edges changed.

Scoped public-shell and portal-session AST reconciliation added source-backed error, 404 and verified-email decision nodes while preserving prior SQL and semantic nodes. Current graph: 242 nodes, 227 directed edges; unrelated historical coverage remains unaudited.

Scoped custom-auth refresh extracted 39 explicitly selected changed TypeScript files and retained the earlier semantic and SQL nodes. Twelve source-verified auth dependencies were added directly. The graph now has 298 nodes and 286 directed edges; 115 extractor edges with unresolved endpoints were omitted, chiefly external or out-of-scope references. Historical coverage remains unaudited. The Protect challenge adapter uses a provider-supplied HTTPS SDK URL; the provider does not publish a fixed host allowlist, and actual challenged-provider execution remains unverified.

After merging invoice and staff access, the combined graph retains both branches' source-linked nodes and edges: 336 nodes and 332 edges. Removed pre-route-group paths remain removed. Four older edge directions were subsequently checked against source and corrected, as recorded below. Unresolved historical coverage and SQL extraction limits still apply.

The scoped auth/profile typography and account-return update re-extracted eight affected files; the graph remains at 336 nodes and 332 edges. Thirty-seven unresolved extractor edges were omitted.

The account actor-binding and invitation-capture fixes re-extracted nine affected files. The graph now has 342 nodes and 345 edges; 27 unresolved extractor edges were omitted. Existing SQL and semantic nodes remain intact.

The provider-derived account summary and responsive signup name fields re-extracted four affected files. The graph now has 346 nodes and 348 edges; 18 unresolved extractor edges were omitted.

The account-summary wrapping correction re-extracted two affected files; the graph remains at 346 nodes and 348 edges, with six unresolved extractor edges omitted.

Staff onboarding re-extracted 18 allowlisted TypeScript files and added source-linked migration `portal_staff_delivery_sql` with its staff onboarding/access dependencies. The graph now has 367 nodes and 367 edges; 59 extractor edges with unresolved endpoints were omitted. SQL extraction and older unrelated edge-direction coverage remain limited.

Role navigation and staff UI review re-extracted 12 allowlisted files: 375 nodes and 373 edges; 55 unresolved extractor edges omitted. Existing semantic nodes retained.

The invitation-action call edges were reconciled against current source: duplicate edges at lines 19 and 25 were removed, and inferred call scores reflect their inferred status. A source-verified account-menu call was added at line 17. The graph has 375 nodes and 372 edges; the previously reported 55 unresolved extractor edges and historical coverage limits remain.

Team header route correction changes no symbols or graph relationships; the existing PortalShell node and callers remain current.

## Invoice UI scope (2026-11-12)

Incremental AST extraction refreshed the changed TypeScript and TSX files for invoice routes, shared portal navigation, reviewed quotes, notifications, and payment recovery. File-qualified IDs disambiguate repeated route component names. SQL is not supported by the extractor: `portal_invoice_ui_db` and its links to the existing invoice runtime and server DAL are manually source-linked to migration 0011. Semantic extraction and cross-scope edges remain incomplete; consult `FEATURE_TREE.md` and source for authority. Migration 0011 is applied to development; provider delivery remains undeployed and signed-in UI verification is pending.

Lease fencing and account sign-out cleanup were refreshed in the affected invoice and auth nodes. Earlier cluster summaries are historical; the graph JSON and feature tree describe current source.

Learning foundation: six allowlisted TypeScript files and two manually source-linked SQL nodes added; 399 nodes, 400 edges. 25 unresolved extractor edges omitted. SQL extraction and earlier historical coverage gaps remain.

The session-location contract re-extracted three allowlisted files: 400 nodes and 401 edges; 12 unresolved extractor edges omitted.

Learning schema readability update re-extracted its source: 400 nodes, 401 edges, 1 unresolved edges omitted.

Typed learning DAL update re-extracted four allowlisted files: 400 nodes and 397 edges; 20 unresolved extractor edges omitted.

Explicit explored-sounds update re-extracted three allowlisted files: 400 nodes and 397 edges; 12 unresolved extractor edges omitted.

Four historical edge directions were checked against source and corrected: seedling mount calls shadowTexture (scene.ts:128), weekly calls roundTo5 (pricing.ts:11), organisationSchema calls url (schema-org.ts:17), and the provisioning runbook references the founding inventory migrations (db/README.md:3). No remaining source/target versus _src/_tgt mismatches were found. Other SQL extraction, unresolved-edge and historical corpus coverage limits remain.

Historical extraction: the PORTAL semantic node then reflected the current custom authentication, parent/admin/staff screens and learning data foundation. Invoice UI is present; session/learning UI and messages remain planned. Node and edge counts are unchanged.

Historical extraction: the combined checkout reconciled the learning graph with the invoice graph: 500 nodes and 492 source-backed edges. The four corrected historical edge directions from the learning branch are retained. SQL links remain manually source-linked and unresolved cross-scope extraction remains a known gap. Invoice UI and learning data foundations are present; learning/session UI and messages remain planned.

Invoice page metadata and the conditional VAT settings form were re-extracted after UI review. SQL and unresolved cross-scope extraction limits above remain.

The Jury UI fixes refreshed invoice and navigation AST nodes, including billing save-state handling and the empty-family link.

Messaging foundation: migration 0015 is manually source-linked to the existing session foundation; SQL extraction remains unsupported. Runtime notification transport and UI are pending. TypeScript nodes are refreshed using the scoped AST workflow; unresolved cross-scope relationships remain a coverage gap.

Scoped event transport adds `portal_events_sql` manually source-linked to messaging, session and learning SQL because Graphify does not extract SQL. The API route, generic stream protocol, auth-filtered stream and then-unmounted client were extracted; cross-scope AST relationships remain incomplete. No production transport or remote migration is claimed.

Stream-reader cleanup was re-extracted. The source-verified call edge runs from `route_get` to `events_server_openportaleventstream` (`app/api/portal/events/route.ts:16`); consumers release and cancel each response reader before reconnecting.
Session and learning UI re-extracted 27 allowlisted source files and added the source-linked 0014 migration node: 554 nodes, 546 edges; 134 unresolved extractor edges omitted. SQL extraction and earlier corpus coverage gaps remain. Development deployment of 0014 and live UI verification are pending.

Final session UI, actor-fence and UK-time changes re-extracted 27 allowlisted source files: 554 nodes and 548 edges; 136 unresolved extractor edges omitted. SQL remains manually source-linked; UI verification and development 0014 deployment are pending.

Final scope refresh after scheduling and display review re-extracted 27 allowlisted files: 554 nodes, 548 edges; 136 unresolved extractor edges omitted. Historical corpus and SQL extraction limits remain.

Focused editor split and session-key safeguards re-extracted 29 allowlisted files: 557 nodes, 549 edges; 139 unresolved extractor edges omitted. Existing SQL and historical corpus limitations remain.

UK session end-date display re-extracted two allowlisted files: 557 nodes, 549 edges; 3 unresolved extractor edges omitted.

Review fixes refreshed 40 allowlisted files with a fresh temporary extraction cache. Five colliding admin/staff action symbols were disambiguated by path; stale moved helper nodes were removed. The graph has 582 nodes and 574 edges; 178 unresolved or ambiguous edges were omitted. Existing SQL extraction and corpus limits remain.

Final review scope re-extracted 40 allowlisted files using a fresh cache: 582 nodes, 574 edges. Five colliding admin/staff action symbols were disambiguated; 178 unresolved or ambiguous edges were omitted. SQL remains manually source-linked and historical corpus gaps remain.

Rebased review scope reconciles messaging/event nodes with session UI: 616 nodes, 602 edges after fresh extraction of 40 allowlisted files; five admin/staff action ID collisions were disambiguated and 178 unresolved or ambiguous edges omitted. SQL nodes are manually source-linked; historical corpus gaps remain.

Post-rebase actor-fence and publication review refresh: 616 nodes, 602 edges across the project index; 40 allowlisted files re-extracted, 5 admin/staff symbol collisions disambiguated, 178 unresolved or ambiguous edges omitted. Messaging/event nodes remain present; SQL and historical corpus limits remain.

Migration-overlap review adds source-linked publication binding trigger and concurrency test nodes: 618 nodes and 604 edges. SQL is manually linked; earlier unresolved extractor and corpus gaps remain.

Messaging UI and role-fenced transport: scoped TypeScript AST extraction refreshed the changed route, shared shell, stream and message components. `portal_message_views_sql` and `portal_invalidation_sql` are manually source-linked because SQL extraction is unsupported. Earlier cluster counts are historical; event coverage and projection ACLs are backed by local tests. Migrations 0017/0018 and populated signed-in UI verification remain pending.

Review fixes re-extracted the server-side provider guard, message read acknowledgement helper and mobile shell navigation. Failed read acknowledgements do not advance the cursor and remain retryable. SQL links remain manually maintained.

Jury review updated request expansion, focus, read-only uncertain text and visible-only read acknowledgements. The visibility observer reattaches on return without polling; the SQL graph coverage limitations remain unchanged.

Onboarding reliability re-extracted 10 allowlisted files with a fresh cache: 631 nodes and 606 edges; one colliding actor-helper identifier was disambiguated by path, and 64 unresolved or ambiguous edges were omitted. Existing SQL and historical corpus limits remain.

Source-verified admin page, actor-fence and DAL call relationships were reconciled after scoped extraction: 631 nodes and 633 edges. Existing unresolved cross-scope and SQL limitations remain.

Controlled field components and their consumers were source-verified after the inventory-change guard: 636 nodes and 641 edges. Existing extractor and corpus limitations remain.

Operation ID stability review reconciled changed source locations and the shared attempt field: 637 nodes and 644 edges. Existing extractor and corpus limitations remain.

Post-merge reconciliation retains 712 nodes and 709 edges for messaging and onboarding together; development migrations 0017/0018 are verified, while production 0017/0018 remain pending. Earlier deployment statements above are historical.

Current verification (12 November 2026): migrations 0001–0018 and 82 scoped runtime grants are verified in development and production; earlier deployment statements are historical. A development admin received a committed own-membership invalidation on an existing authenticated stream; populated workflows and actual revocation remain unverified. The empty-admin Jury approved only the inspected scope; full-app 8/10 is not established. See FEATURE_TREE.md and the portal plan for runtime limitations.


Staff Today scoped update: `staff_today_selectprioritysession` is source-linked to the staff Today route and selection test. Graphify code update was attempted, but refused to overwrite the existing graph because its extraction had fewer nodes; scoped TypeScript AST extraction and source-verified edges were merged into the retained graph. Existing coverage gaps remain.

Staff Today presentation components were added through scoped TypeScript AST extraction; the route-to-component render edges are source-verified.

Staff Today mobile emphasis now moves the primary action into the priority card; the header action remains desktop-only. Structural graph relationships are unchanged.

Parent-home scoped extraction was reconciled with the merged staff Today graph; the route, cards, shell and selection/rendering tests were re-extracted. Existing SQL and broader semantic coverage gaps remain.
