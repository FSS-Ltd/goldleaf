# Feature tree

Canonical inventory for this repo. Status values: implemented, partial, planned. Tests column is the verification evidence.

| ID | Feature | Status | Entry points | Implementation | Uses | Used by | Tests |
|---|---|---|---|---|---|---|---|
| CONTENT | Typed business content | implemented | n/a | `content/site.ts`, `progression.ts`, `session.ts`, `faq.ts` | none | almost everything | indirect |
| PRICING | Rate maths (weekly, monthly, discounts) | implemented | n/a | `lib/pricing.ts` | none | PRICING-TABLE | `lib/pricing.test.ts`, `tests/e2e/site.spec.ts` |
| SITE-LAYOUT | Root layout, fonts, header, footer, skip link, analytics | implemented | `app/layout.tsx` | `components/Header.tsx`, `Footer.tsx`, `app/globals.css` | CONTENT | all pages | `tests/e2e/site.spec.ts` |
| LANDING | Home page (hero, session, path, who for, pricing, safe hands, tutor, coming soon, FAQ, CTA) | implemented | `/` | `app/page.tsx` | CONTENT, FOUNDING-OFFER, SESSION-TIMELINE, STAGE-PATH, PRICING-TABLE, SAFE-HANDS, FAQ, COMING-SOON, CTA-BAND, SEO | none | e2e, Lighthouse |
| FOUNDING-OFFER | Founding band, switches to "full" when places run out | implemented | `components/FoundingBand.tsx` | `content/site.ts` (`founding`, `foundingOpen`) | CONTENT | LANDING, PRICING-TABLE, ENQUIRY | none |
| PRICING-TABLE | Days-by-days table, founding column hidden when full | implemented | `components/PricingTable.tsx` | PRICING | PRICING, CONTENT | LANDING | e2e |
| STAGE-PATH | Signature scroll-drawn vine through Stages 0 to 4 | implemented | `components/StagePath.tsx` | CSS `.vine` in `globals.css` | `content/progression.ts` | LANDING, HOW-WE-TEACH | visual check only |
| SESSION-TIMELINE | Session blocks (list and table) | implemented | `components/SessionTimeline.tsx` | `content/session.ts` | CONTENT | LANDING, HOW-WE-TEACH | none |
| HOW-WE-TEACH | Progression table (cards on phones), age map, session table (list on phones), sound tiles and chips | implemented | `/how-we-teach` | `app/how-we-teach/page.tsx` | STAGE-PATH, SESSION-TIMELINE, CONTENT | none | e2e |
| ABOUT | Tutor, why Goldleaf, safe hands | implemented (bio is a placeholder) | `/about` | `app/about/page.tsx` | SAFE-HANDS, CONTENT | none | e2e |
| ROUTE-TRANSITIONS | Content fades and lifts between routes (React ViewTransition around page content) | implemented | `app/layout.tsx` | CSS `::view-transition-*` in `app/globals.css` | none | all pages | visual check only |
| SOUND-TILES | Decorative letter tiles and sound chips | implemented | `components/SoundTiles.tsx` | `content/progression.ts` | none | HOW-WE-TEACH | none |
| SAFE-HANDS | Safeguarding practices, trust flags gate extra lines | implemented | `components/SafeHands.tsx` | `content/site.ts` (`trust`) | CONTENT | LANDING, ABOUT | none |
| FAQ | Questions, also feeds FAQPage JSON-LD | implemented | `components/Faq.tsx` | `content/faq.ts` | CONTENT | LANDING, SEO | none |
| COMING-SOON | Readers and Curriculum note | implemented | `components/ComingSoon.tsx` | n/a | none | LANDING | none |
| CTA-BAND | Closing enquiry band | implemented | `components/CtaBand.tsx` | n/a | CONTENT | LANDING, HOW-WE-TEACH, ABOUT | none |
| ENQUIRY | Form, server action, zod schema, Resend email, honeypot | implemented | `/enquire` | `app/enquire/page.tsx`, `actions.ts`, `components/EnquiryForm.tsx`, `lib/enquiry-schema.ts` | CONTENT, Resend | none | `lib/enquiry-schema.test.ts`, `tests/e2e/enquiry.spec.ts` (dev dry run; real send not tested) |
| PRIVACY | UK GDPR notice (draft for client) | implemented | `/privacy` | `app/privacy/page.tsx` | CONTENT | ENQUIRY (linked) | e2e |
| SEO | Metadata, canonical, sitemap, robots, JSON-LD, icons, OG image | implemented | `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/*icon*`, `app/opengraph-image.png` | `lib/schema-org.ts`, `components/JsonLd.tsx` | CONTENT, FAQ | all pages | e2e (sitemap, robots), Lighthouse |
| BRAND-ASSETS | Logo files and the script that trims them and makes icons | implemented | `scripts/make-brand-assets.mjs` | `public/brand/*` | sharp | SITE-LAYOUT, LANDING, SEO | none |

## Known gaps
- Real email sending is untested until Resend keys exist.
- Tutor bio and photo are placeholders. Contact email is a placeholder (`hello@example.com`).
- STAGE-PATH, SESSION-TIMELINE, FAQ and SAFE-HANDS have no automated tests.
- Graphify map is structural only (AST of 40 code files: 69 nodes, 35 edges, 38 communities). Cross-file imports are thinly captured, and docs and images were not semantically extracted. Treat the tables above as the source for feature connections.
