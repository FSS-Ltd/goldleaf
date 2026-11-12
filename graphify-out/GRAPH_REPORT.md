# Graph Report - goldleaf-graph-refresh  (2026-11-11)

## Scoped invoice workflow update (2026-11-12)

Scoped Graphify AST extraction covers the invoice and settings DAL, DTOs and tests. SQL extraction remains unsupported; the runtime migration and source-verified connections were linked manually. Issue dates use a function-local London time zone, and history context timestamps are normalised to UTC. Prior clustering and semantic coverage were not recomputed.

## Scoped invoice data update (2026-11-12)

SQL extraction is unsupported. The invoice billing migration node and links to onboarding, pricing and the planned portal were added manually from source and runbook references. Prior clustering and semantic coverage are unchanged.

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
Nodes (7): Goldleaf portal concept brief and design references, PORTAL-CONCEPTS: implemented design archive only, Portal delivery plan (planned), Known limitation: archived 105-minute plan versus current 120-minute sessions, Planned portal information boundaries and unverified behaviour, PORTAL: planned staff and parent portal; no runtime, Public-site design document and portal archive reference

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
