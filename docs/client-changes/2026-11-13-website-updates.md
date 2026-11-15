# Client website updates, 13 November 2026

Source: client-supplied `Goldleaf-Website-Updates.pdf` (SHA-256 `e4f01d7aa7fbd1dbc8fc07e6a32e2f01ce1483c07943a8defb47f0e4f41316c9`). This checklist tracks implementation, not production deployment or full portal acceptance.

| PDF section | Implementation and evidence |
| --- | --- |
| 1–2 Metadata and hero | `app/layout.tsx`, `app/(public)/page.tsx`, `lib/schema-org.ts`: small-group and one-to-one descriptions, including Open Graph, Twitter and structured data. The home hero clips the decorative scene horizontally to avoid narrow-screen overflow. |
| 3 Founding banner | `components/FoundingBand.tsx`: current session fees and existing availability states. |
| 4 Routine | `content/session.ts`, `components/SessionTimeline.tsx`: twelve client-specified clock blocks and arrival greeting; `lib/website-session-content.test.ts`. Portal `SessionWorkspace.tsx` labels these times as a reference, not a scheduled session. |
| 5 Who it is for | `app/(public)/page.tsx`: groups of up to four, church/home distinction and café or collection. Home one-to-one still requires a parent or carer in the house (`components/SafeHands.tsx`, `content/faq.ts`). |
| 6 Pricing | `components/FoundingContent.tsx`, `PricingTable.tsx`, `lib/pricing.ts`: per-session fees, table and explanation. Existing weekly and monthly figures remain the comparison target in `lib/pricing.test.ts`. |
| 7 Safety | `components/SafeHands.tsx`: café/drop-off and parent portal; existing trust flags remain conditional. |
| 8 Tutor | `content/site.ts`: client-provided small-group and one-to-one description. |
| 9 FAQs | `content/faq.ts`: session presence, location, days, progress, naps and one-to-one; progress keeps existing handover, home-card and unit-review text. FAQ structured data reuses the same source. |

New scheduling defaults use `site.sessionStartTime` and `site.sessionMinutes`; existing session records retain their saved times and durations. No group-booking system is added. New session pricing and historical invoice compatibility are handled by the billing slice and its migration; see its tests and rollout instructions before enabling. Live provider mail, separate-user acceptance and full portal release are not established by this change. Browser and final integration results are recorded separately after verification.

## Browser evidence, 13 November 2026

On the rebuilt local production application, the coordinator checked the home page in the Codex in-app browser: document scroll width matched viewport width at 320px, 390px and 1440px. The pricing note had the intended sentence spacing, and rendered description, Open Graph and Twitter metadata contained the updated offer. The mobile menu opened and its Pricing link navigated; keyboard Return toggled the stay FAQ.

On `/how-we-teach`, the 320px viewport had no horizontal overflow, mobile displayed all twelve requested clock blocks, and desktop displayed the twelve-row routine table. Screenshots were captured as `website-updates-mobile.jpg` and `website-updates-desktop.jpg` in the task visualizations directory. These checks do not establish full assistive-technology or performance acceptance.
