# Graph Report - .  (2026-11-08)

## Corpus Check
- Corpus is ~41,608 words - fits in a single context window. You may not need a graph.

## Summary
- 69 nodes · 35 edges · 3 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]

## God Nodes (most connected - your core abstractions)
1. `Home()` - 3 edges
2. `sendEnquiry()` - 3 edges
3. `organisationSchema()` - 3 edges
4. `roundTo5()` - 2 edges
5. `weekly()` - 2 edges
6. `formDataToObject()` - 2 edges
7. `fieldErrors()` - 2 edges
8. `url()` - 2 edges
9. `faqSchema()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Home()` --calls--> `organisationSchema()`  [INFERRED]
  /Users/JeanFidele/The Nexus Ecosystem/Projects/goldleaf/app/page.tsx → /Users/JeanFidele/The Nexus Ecosystem/Projects/goldleaf/lib/schema-org.ts
- `Home()` --calls--> `faqSchema()`  [INFERRED]
  /Users/JeanFidele/The Nexus Ecosystem/Projects/goldleaf/app/page.tsx → /Users/JeanFidele/The Nexus Ecosystem/Projects/goldleaf/lib/schema-org.ts
- `sendEnquiry()` --calls--> `formDataToObject()`  [INFERRED]
  /Users/JeanFidele/The Nexus Ecosystem/Projects/goldleaf/app/enquire/actions.ts → /Users/JeanFidele/The Nexus Ecosystem/Projects/goldleaf/lib/enquiry-schema.ts
- `sendEnquiry()` --calls--> `fieldErrors()`  [INFERRED]
  /Users/JeanFidele/The Nexus Ecosystem/Projects/goldleaf/app/enquire/actions.ts → /Users/JeanFidele/The Nexus Ecosystem/Projects/goldleaf/lib/enquiry-schema.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.38
Nodes (4): Home(), faqSchema(), organisationSchema(), url()

### Community 1 - "Community 1"
Cohesion: 0.5
Nodes (3): sendEnquiry(), fieldErrors(), formDataToObject()

### Community 2 - "Community 2"
Cohesion: 0.67
Nodes (2): roundTo5(), weekly()

## Knowledge Gaps
- **Thin community `Community 2`** (4 nodes): `pricing.ts`, `monthly()`, `roundTo5()`, `weekly()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `Home()` (e.g. with `organisationSchema()` and `faqSchema()`) actually correct?**
  _`Home()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `sendEnquiry()` (e.g. with `formDataToObject()` and `fieldErrors()`) actually correct?**
  _`sendEnquiry()` has 2 INFERRED edges - model-reasoned connections that need verification._