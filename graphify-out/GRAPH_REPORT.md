# Graph Report - .  (2026-11-11)

## Corpus Check
- Scoped coverage: 61 referenced source files, including six PNG previews; approximately 16,704 text words.
- Structural extraction covered 50 tracked code files. Semantic extraction covered the portal archive and selected linked documentation.

## Summary
- 116 nodes · 88 directed edges · 50 communities (23 multi-node, 27 singleton)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Estimated semantic token usage: 18,666 input · 7,099 output

## Community Hubs (Navigation)
- Portal design references
- Portal design references
- scene.ts connections
- page.tsx connections
- Enquiry workflow
- Portal design references
- Portal design references
- Portal design references
- Portal design references
- Eyebrow connections
- JsonLd connections

## God Nodes (most connected - your core abstractions)
1. `PORTAL-CONCEPTS: implemented design archive only` - 16 edges
2. `Goldleaf portal concept brief and design references` - 8 edges
3. `Parent home desktop concept` - 5 edges
4. `Parent learning desktop concept` - 5 edges
5. `Staff today desktop concept` - 5 edges
6. `Staff session desktop concept` - 5 edges
7. `Parent home mobile concept` - 5 edges
8. `Staff today mobile concept` - 5 edges
9. `sendEnquiry()` - 3 edges
10. `Home()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `sendEnquiry()` --calls--> `formDataToObject()`  [INFERRED]
  app/enquire/actions.ts → lib/enquiry-schema.ts
- `sendEnquiry()` --calls--> `fieldErrors()`  [INFERRED]
  app/enquire/actions.ts → lib/enquiry-schema.ts
- `Home()` --calls--> `organisationSchema()`  [INFERRED]
  app/page.tsx → lib/schema-org.ts
- `Home()` --calls--> `faqSchema()`  [INFERRED]
  app/page.tsx → lib/schema-org.ts
- `PORTAL-CONCEPTS: implemented design archive only` --references--> `Parent home desktop concept`  [EXTRACTED]
  docs/portal-mockups/README.md → docs/portal-mockups/parent-home-desktop.png

## Communities

### Community 0 - "Portal design references"
Cohesion: 0.17
Nodes (12): PORTAL-CONCEPTS: implemented design archive only, Planned portal information boundaries and unverified behaviour, Parent home mobile concept, Parent mobile curriculum overview, Parent mobile next-session card, Parent mobile observation and billing, PORTAL: planned staff and parent portal; no runtime, Public-site design document and portal archive reference (+4 more)

### Community 1 - "Portal design references"
Cohesion: 0.24
Nodes (5): Goldleaf portal concept brief and design references, Known limitation: archived 105-minute plan versus current 120-minute sessions, Existing global styles cited by portal brief, roundTo5(), weekly()

### Community 2 - "scene.ts connections"
Cohesion: 0.29
Nodes (2): mountSeedling(), shadowTexture()

### Community 3 - "page.tsx connections"
Cohesion: 0.38
Nodes (4): Home(), faqSchema(), organisationSchema(), url()

### Community 4 - "Enquiry workflow"
Cohesion: 0.5
Nodes (3): sendEnquiry(), fieldErrors(), formDataToObject()

### Community 5 - "Portal design references"
Cohesion: 0.5
Nodes (4): Parent home desktop concept, Parent desktop learning overview, Parent desktop next-session card, Parent desktop tutor note and billing

### Community 6 - "Portal design references"
Cohesion: 0.5
Nodes (4): Early phonics curriculum journey, Parent learning desktop concept, Shared tutor observations, Tactile sound exploration

### Community 7 - "Portal design references"
Cohesion: 0.5
Nodes (4): Staff today desktop concept, Staff desktop parent update draft, Staff desktop private staff note, Staff desktop daily schedule

### Community 8 - "Portal design references"
Cohesion: 0.5
Nodes (4): Staff today mobile concept, Mobile attention queue design, Mobile next-session and attendance affordances, Mobile three-session timeline

### Community 23 - "Eyebrow connections"
Cohesion: 1.0
Nodes (1): Eyebrow()

### Community 24 - "JsonLd connections"
Cohesion: 1.0
Nodes (1): JsonLd()

## Knowledge Gaps
- **19 isolated node(s):** `Existing global styles cited by portal brief`, `Parent desktop next-session card`, `Parent desktop learning overview`, `Parent desktop tutor note and billing`, `Early phonics curriculum journey` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `scene.ts connections`** (8 nodes): `scene.ts`, `clamp()`, `easeOutBack()`, `easeOutCubic()`, `letterTexture()`, `makeLeafGeometry()`, `mountSeedling()`, `shadowTexture()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eyebrow connections`** (1 nodes): `Eyebrow()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `JsonLd connections`** (1 nodes): `JsonLd()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PORTAL-CONCEPTS: implemented design archive only` connect `Portal design references` to `Portal design references`, `Portal design references`, `Portal design references`, `Portal design references`, `Portal design references`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Goldleaf portal concept brief and design references` connect `Portal design references` to `Portal design references`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `Existing global styles cited by portal brief`, `Parent desktop next-session card`, `Parent desktop learning overview` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._

## Scoped update and limitations

- Refreshed structural extraction from 50 tracked code files; no dependencies, runtime data, credentials, generated build files or nested worktrees were included.
- Added semantic extraction of the portal gallery, brief, selected feature/design documentation and all six PNG previews. Other documents/images remain outside semantic coverage.
- Portal runtime is planned; only the archived design assets are implemented. Screenshot timing is historical (105 minutes), while current source content uses 120 minutes.
- Source paths are repository-relative; graph edges retain direction. The feature tree remains the domain-level navigation index.
- 123 unresolved AST import/call edges were omitted rather than asserting destinations. External-package resolution and some cross-file consumers remain gaps.
- Token figures above are estimates supplied by extraction agents, not exact model billing. No paid service, watcher, hook or external corpus upload was introduced.
- HTML visualisation was intentionally omitted for this scoped archive update (`--no-viz`); JSON and this report are the persistent outputs.
