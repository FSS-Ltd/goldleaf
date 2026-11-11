# Design doc: Goldleaf Tutoring public site

Portal design references: [staff and parent mockup archive](portal-mockups/README.md). These are dated concepts, not implemented public-site or portal features; their 105-minute example sessions predate the current two-hour session plan.

Status: approved plan, build in progress. Branch: `feat/public-site`.

## Problem
Goldleaf Learning (owner Deborah Ntagengwa) starts 1:1 play-based tutoring for 2 to 4 year olds in Ashford. Parents find tutors through local search and word of mouth, then judge trust in seconds on a phone. The site must rank for local searches, explain the offer, show honest pricing, and turn a visit into an enquiry. First 5 families get a founding rate.

Source of truth for business facts: the client's "Goldleaf Learning Business Plan" PDF.

## Architecture
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 (`@theme` tokens in `app/globals.css`).
- Every page is statically rendered. The only client component is `EnquiryForm`.
- All business facts live in typed files in `content/` and `lib/pricing.ts`. No CMS and no database.
- Enquiries: a server action validates with zod, then sends a plain-text email through Resend.
- Hosting: Vercel. Analytics: `@vercel/analytics` (cookieless, no banner).

Key decisions
- Founding offer: 5 places at 25 pounds an hour until Easter 2027, then 28 pounds an hour while the family stays. Standard rate 30 pounds. Shown side by side, as the plan requires.
- Service-area business: no street address in markup or schema.
- Trust claims (DBS, insurance, safeguarding policy) are flags in `content/site.ts` and render only when true.
- No Ofsted claims anywhere. The client's legal position is still to be confirmed with the local authority.
- Body font Lexend (designed for reading fluency, on-message for a reading tutor). Display font Fraunces.

## Data model
No database. Typed content: `site`, `progression`, `session`, `faq`. Enquiry payload (never stored): parent name, email, optional phone, child age (2, 3, 4), days wanted (1 to 5), location (home, church, unsure), area, optional message, consent. The child's name is not collected.

## Failure modes
- Resend down or key missing in production: the form shows an error with the contact email as a fallback. The message is not lost silently.
- Honeypot filled: fake success, nothing sent.
- JavaScript disabled: the form posts natively through the server action.
- Scroll-driven animation unsupported: the stage path renders fully drawn.

## Security and privacy
- zod validation server side. Honeypot field. Form contents are never logged.
- No secrets in the repo. `.env.example` lists names only.
- UK GDPR notice at `/privacy`, approved by the client. Enquiries without a booking are deleted after 12 months (manual process, noted in launch checklist).

## Rollout and rollback
Vercel preview first, client review, then production on the client's domain. Rollback is a redeploy of the previous Vercel deployment.

## Success metrics
Enquiries a week, founding places filled, Lighthouse mobile at least 95 in all four categories, page one for "phonics tutor Ashford" within 3 months.
