# Goldleaf portal: UI/UX concept

Design exploration, 11 November 2026. These are proposed portal capabilities, not implemented application features. All people, observations and bookings in the screens are fictional.

Stitch project: https://stitch.withgoogle.com/projects/8457214603129819597

## Snapshot status

Archived from Stitch on 11 November 2026. Based on source checkout `26b96ba`, before the two-hour session changes now on main. All people, bookings and account balances are fictional. Current business facts remain in [site.ts](../../content/site.ts), [session.ts](../../content/session.ts) and [pricing.ts](../../lib/pricing.ts). This archive adds no portal routes, authentication, billing or messaging implementation.

## Brief

Parents need sessions, learning progress, messages and billing. Staff need attendance, session planning and parent communication. These priorities were confirmed by the user. The proposed set includes parent home and learning journey, staff today and session workspace, and mobile home views for both roles. See the delivered concept set below for verified outputs.

Goldleaf provides 1:1, play-based early years tutoring in Ashford, Kent. Existing brand and curriculum were read from `docs/DESIGN.md`, `app/globals.css`, `content/site.ts`, `content/progression.ts` and `content/session.ts`. The source checkout for this concept used 105-minute sessions. Current main uses 120-minute sessions; the screenshots preserve the earlier concept and must not be used as current scheduling or pricing requirements. No Ofsted or unverified trust claims belong in these mockups.

## Concept selection

Scores are design judgements, not user research. Scale 1–5; lower portability is better.

| Territory | Concept and anchor | Signature / screenshot | Emotion | Originality / fit / feasibility / portability |
| --- | --- | --- | --- | --- |
| Brand identity | A little more each day: Goldleaf's leaf and existing stage path become a living learning journal. | A slender gold stem links labelled phonics stages beside tactile letter tiles. | Reassuring, attentive | 4 / 5 / 5 / 2 |
| Teaching materials | The sound shelf: phonics tiles organise activities and next steps. | A row of sound tiles opens the relevant observation. | Playful, tangible | 3 / 5 / 5 / 3 |
| Tutor process | The session notebook: a timed lesson plan and handover note structure the workspace. | A 105-minute activity timeline beside clearly separated private and shared notes. | Prepared, calm | 3 / 5 / 5 / 3 |

Selected: A little more each day. It connects directly to Goldleaf's identity and its source-backed progression. The session timeline serves staff tasks without becoming a separate visual theme.

Idea: Make the next small step in a child's learning easy to see and support.
Metaphor: A carefully kept learning journal.
Signature: Labelled stages connected by a delicate botanical stem; letter tiles show the current focus.
Emotion: Quiet confidence.
Motion direction for future implementation: Short, gentle settling transitions; progress changes only with recorded observations; respect reduced motion.
Screenshot: A personal learning observation alongside the next session and current sounds.

## Visual system

Reuse Goldleaf's actual palette: paper `#FEF8F3`, deeper paper `#F6EEE2`, forest ink `#06451D`, secondary ink `#35594A`, decorative gold `#C9971C`, readable gold `#7A5A0C`, pale gold `#ECD081`, border `#E3D7C3`. Fraunces headings and Lexend UI are existing brand choices. The generated global Stitch theme retains stale Newsreader metadata and unrelated wording despite an update request; it is not the implementation authority. Use this brief and the final screen HTML. The outdated theme card is excluded from the final presentation. For implementation, reuse the actual repository wordmark and tokens rather than generated logo glyphs or incidental colour variants.

Desktop uses a 232px navigation rail, 12-column content grid and 32px gutters. Parent home uses an asymmetric 8/4 composition; staff screens prioritise schedule rows and editable work. Mobile reorganises tasks into a single column and labelled bottom navigation. Use 14px cards, pill actions, minimal shadows, 16px body text and at least 44px primary tap targets. Text and status words must remain understandable without colour or illustrations.

## Reference shortlist

These are references for separate design qualities, not a claim that every product has won an Awwwards award.

| Reference | Source | Application to Goldleaf |
| --- | --- | --- |
| Viture Dashboard | https://www.awwwards.com/sites/viture-dashboard | Awwwards Honorable Mention, 26 September 2022, verified in the in-app browser. The desktop screenshot demonstrates controlled product framing and compact navigation. This is a hardware product configurator; use as a composition reference, not as a parent-portal workflow model. |
| Cuberto / Zelt | https://cuberto.com/projects/zelt/ | Distinct identity, polished product presentation and deliberate mobile adaptation. The case study is a marketing website, not access to Zelt's authenticated portal. |
| Cuberto's award credentials | https://cuberto.com/about/ | Cuberto states it received Awwwards Agency of the Year. This supports the studio's craft credentials, not a specific award for the Zelt portal. |
| Linear | https://linear.app/features | Task-oriented product organisation: planning, work and mobile use. Borrow hierarchy and focus, not its visual identity. |
| ManyRequests portal preview | https://manyrequests.com/see-your-portal | Persistent navigation, client context, messages and billing in one branded portal. |
| Famly parent journey | https://help.famly.co/en-us/articles/4912450-parents-the-journey-tab | Dated learning observations within a child's profile. Translate to Goldleaf's existing phonics stages. |

Viture's award entry and desktop screenshot were inspected in the Codex in-app browser. No Chrome was used. Authenticated reference-product flows were not tested.

## Delivered concept set

Six final views cover the agreed mockup scope. They show proposed capabilities with fictional sample data, not a connected application. The canvas groups parent and staff desktop views with their mobile companions. Superseded drafts are preserved but hidden.

| Final view | Stitch screen ID | Main task |
| --- | --- | --- |
| Parent Home desktop | 9c239c054fc74de199d6615294c7d72b | Find the next session, current learning focus, tutor note and billing status |
| Parent Learning desktop | 17915fc8b60d419d8153bfbc8ad1dd26 | Read dated observations and the Stage 0–4 journey |
| Staff Today desktop | 7cbdd3498ce6423dbaeb38dd28edbe42 | Prioritise sessions, attendance, messages and unfinished notes |
| Staff Session desktop | add682bfd8d747bd99f48a0510ba7a2c | Follow the 105-minute plan; keep private notes separate from parent updates |
| Parent Home mobile | f113f0e3e2714b7f9dd6891b1df9f6f3 | Access the same next-session, learning and account priorities on a phone |
| Staff Today mobile | 6f009db4e9494a99b36efc2611e9c706 | Open the next session, explicitly mark attendance and reach outstanding work |

The earlier timed-out batch eventually became available. Its detail views were recovered and refined; none of its known copy or family-sharing errors should be treated as the final design.

## Verification evidence

- Downloaded and inspected saved screenshots and HTML, rather than relying on generation summaries.
- Corrected unsupported pastoral-care, studio, staff-ID, Direct Debit, future billing and service-availability wording in the selected views.
- Checked the fictional parent/child/tutor context and shared-note recipients. Ellis M.'s parent is Jordan M.; Robin's parent is Alex Taylor.
- Checked session chronology: staff view is Wednesday 11 November 2026 at 11:00; Casey 09:00–10:45 completed, Ellis 11:15–13:00 next, Rowan 14:00–15:45 upcoming. Parent next session is Thursday 12 November 09:00–10:45.
- Verified the nine session-plan blocks are contiguous and total 105 minutes. The session remains Not started; selecting Phonics does not imply it is running.
- Reviewed mobile viewport metadata for zoom restrictions. Attendance uses explicit Present/Absent choices. The empty parent-update preview is disabled in the session HTML.
- Corrected phonics copy that incorrectly described the vowel a as a consonant and replaced acorn with apple for the short-a example.
- Checked headline/font assignments in the actual HTML. Global Stitch theme metadata is not authoritative.
- Calculated core text colours against paper #FEF8F3: forest 10.62:1, secondary ink 7.44:1, dark gold 6.05:1. This is a token check, not a full rendered accessibility audit.
- Independent visual reviews checked task clarity, clipping, identity consistency and private/shared labels. The final independent reviewer found no remaining visual blockers across all six screenshots. The staff mobile View all 4 action resolves access to the remaining attention items. The project API confirms exactly six final screens are visible; earlier drafts and the stale theme card remain hidden.

## Interaction and information boundaries

- Parent navigation: Home, Sessions, Learning, Messages, Billing. On mobile, Billing sits under Account.
- Staff navigation: Today, Sessions, Children, Learning plans, Messages, Settings. Mobile exposes primary tasks with secondary functions under More.
- Parents see only their child's shared observations and account information. Staff notes must be separate from parent updates.
- Attendance begins as Not recorded. Present and Absent must be deliberate choices.
- Parent updates remain drafts until previewed and explicitly shared. Saving a private note must never publish it.
- Show progress through dated observations and current practice, without rankings, diagnostic claims or arbitrary mastery percentages.
- Billing panels are conceptual. Do not imply a payment provider, Direct Debit mandate, payment schedule or real balance has been configured.

## Remaining validation

These mockups explore key screens, not the full product specification. Sign-in, invitations, permissions, failed saves, empty journals, loading states, reconnect behaviour, message delivery and payment flows need design and implementation validation. Visual inspection cannot prove keyboard support, screen-reader behaviour, contrast compliance or authorisation. The original design task changed no application code and did not run application tests. The archive PR records these concepts in the feature tree and Graphify map. See the PR for archive validation results.
