# Goldleaf parent workflow specification

Status: product and technical design approved by the user on 16 November 2026. Not implemented; policy wording is not approved. Build starts after alerts and authenticated local QA, as requested. Synthetic local data only until release decisions and production migrations are explicitly approved.

## Confirmed service facts

Goldleaf Learning Ltd. Contact: Deborah Ntagengwa, admin@goldleaf.education. Level 3 safeguarding training is user-declared; it does not establish paediatric first aid, DBS, insurance or registered-provider status. Children roughly ages 2–4; drop-off with parents welcome to stay. Scheduled session: 105 minutes (1 hour 45 minutes). Record actual arrival and collection independently. Registration/exemption applicability remains unconfirmed; do not publish an Ofsted claim. Draft current-service policies and separately identify conditional future EYFS requirements.

## Registration applicability boundary

The scheduled 105 minutes does not determine registration status; actual care time and the full provision matter. The revised Childcare (Exemptions from Registration) Order 2008 articles 3(1)(b) and 5(1)(a)(i), and the current childminder EYFS framework footnote 35, describe a two-hours-or-less boundary. Current Ofsted summary wording differs at exactly two hours and includes an immediately-before/after-school exception. Do not assert that exactly two hours automatically requires registration or establishes an exemption. Seek an applicability decision for the actual provider and venue. Conditional EYFS/Ofsted preparation is not certification. The Order is primary legislation and the EYFS frameworks are statutory for covered providers; DfE out-of-school safeguarding guidance is non-statutory. [ORDER, EYFS-C, HOURS, DFE]

The [feature tree](../../../FEATURE_TREE.md#parent-onboarding-pack-gaps) records the current implementation gap; the [portal data policy draft](../../portal-completion/data-policy.md) remains unapproved.

## Approach and reuse

Extend the existing authenticated parent/admin/staff portal, existing family/child IDs, invitation/role checks, messages, attendance, event subscriptions and alert outbox. Keep current operational pages. Add a progressive parent registration pack, a policy and consent centre, and an admin review workspace. Policy and form versions are printable; printing does not replace the authenticated record or create an electronic-signature claim. No parallel family database or separate consent inbox.

## Parent journey

1. Parent opens Registration from their family portal. Choose an existing child or add one within the authenticated family, avoiding duplicate admin-created children. Drafts save explicitly, preserve entered values on Back, and show progress without requiring optional permissions.
2. Child basics: display/preferred name and justified age information. Explain purpose for each required field. Exact birth date becomes required only where the confirmed service/record rules justify it; the operator must settle this before collection goes live.
3. Responsible adults: registering adult, relationship and authority declaration; reachable contacts and emergency-contact details. Parental responsibility, account membership, emergency contact and collection permission remain distinct. Another parent invitation does not automatically establish authority over sensitive records.
4. Safety and support: relevant allergy, food and emergency-action information, communication/adjustment needs and named authorised collectors. Conditional questions avoid collecting a full medical history or routine NHS/GP/diagnostic records. Health-data collection remains unavailable until the operator approves its purpose, lawful basis, Article 9 condition, notice and access rules.
5. Read applicable approved policy versions and service terms. Privacy notice receipt is an acknowledgement, not blanket data-processing consent. Draft or unpublished policies cannot be presented as approved.
6. Separate offered optional permissions by purpose, with clear yes/no choices and consequences. Publicity/marketing refusal must never block operational readiness. Photo, medication, intimate-care, outing/transport and other conditional forms appear only when the activity is actually offered and its approved policy exists.
7. Review the exact statements and details, declare accuracy and submit one versioned snapshot. Show submitted, needs changes and reviewed states with clear next actions. Later corrections reopen the relevant review; optional consent can be withdrawn through the same centre, with immediate cessation of that permitted use and an audit event.

## Admin and staff journeys

Admin receives a generic submission alert and sees a family/child-scoped queue. Review missing essentials, authority and care arrangements; request corrections with parent-visible messages or record a human review decision. Sensitive safeguarding/authority notes stay in a separate restricted view. No automated rejection or risk score based on health/disability data. Readiness is an operational review result, not legal certification. Optional publicity/marketing choices do not determine readiness.

Assigned staff see only the current information needed for that child's session: necessary emergency contacts, relevant care actions, approved collectors and applicable permission status. Private administrative safeguarding records and historical consent evidence are not exposed by assignment alone. Current attendance is reused; add actual arrival, handover/collection actor and time, and controlled corrections if the approved process requires it.

Admin has a setup checklist for service scope, contact details, safeguarding owner, actual offered activities, policy approval, processing purposes/bases, health-data conditions, retention/rights handling, processors/transfers and the registration applicability decision. Unknown settings remain unresolved, not silently filled with invented legal defaults. Real-data collection is gated until required items are approved.

## Policy and form pack

Draft from official ICO, DfE, Ofsted and Kent sources, with an owner, version, review date and current/future applicability on every item:

- Registration, adult authority and emergency contacts; child profile corrections.
- Safeguarding and child protection, concerns/disclosures, allegations about adults and whistleblowing; correct Kent referral routes.
- Attendance, arrival, authorised collection, late/uncollected and missing-child procedures.
- Health, allergies, food and emergency action; conditional medication authorisation/administration and first aid.
- Accident, incident and existing-injury records and parent acknowledgement.
- Behaviour, inclusion and individual support; conditional intimate care.
- Fire, emergency evacuation, venue/activity risk assessments and conditional outings/transport.
- Complaints procedure and internal complaint/outcome records.
- Photography, online safety, confidentiality and separate optional permissions where offered.
- Privacy notice, processing inventory, retention/review schedule, rights requests, exceptional safeguarding sharing and incident/breach handling.
- Internal safer recruitment, role/training/first-aid/DBS checks and review records; no routine identity/DBS document uploads.
- Service terms and policy acknowledgements, consent choices/withdrawals and printable versioned records.

Each item is labelled current-service, operational recommendation, or conditional future requirement. The pack must not imply that signing forms proves compliance, training or Ofsted readiness. Operational claims must match actual practice. Drafts remain unpublished until reviewed and approved by the operator, with appropriate specialist review where needed.

## Data, security and audit

Use focused relational models or typed bounded records for the registration draft/submitted version, contacts/collection permissions, authority review, applicable care needs, policy versions, acknowledgements, purpose-specific consent events/withdrawals, operational reviews and relevant care records. Reuse existing child/family identities. Keep published wording and accepted snapshots immutable, with actor, time, version/hash and child scope. Generation-bound updates and idempotency keys prevent stale/replayed actions from changing restored authority or duplicating acceptance.

All reads and writes derive the verified server actor and recheck family, authority, staff assignment and permission boundaries. Notifications carry generic protected links and identifiers only, with no child, health or safeguarding content. Use transactional outbox events and existing live subscriptions, not database polling. Withdrawal/revocation and reconnect must refresh open views. Logs and exports follow the same boundaries. No public URLs, unnecessary uploads, automatic purge or invented retention period.

## Acceptance before release

Test the full parent draft/back/resume/submit/correct/withdraw path, child reuse, family and authority isolation, staff minimal access, policy version replacement/reacceptance, optional refusal, admin review, stale/replayed submissions, generation changes, revocation, event duplicates/reconnect and idle queries. Test print presentation, responsive layouts, keyboard and accessible errors. Use synthetic local data and mock mail until live-provider testing is specifically configured. Maintain feature tree/Graphify; independent code/security reviews and exact-head/test-merge CI precede an authorised merge. Production schema/grants and policy publication remain separate release steps.

Research source register and applicability details are below. The user approved this product and technical design on 16 November 2026. This does not approve yet-unwritten policies, establish regulatory status, or authorise collecting real family data.

## Source register and weight

All links are official sources reviewed on the research date. Canonical ICO links are used for readers; where canonical pages returned 403, the same path on ICO's official Azure-hosted site supplied the page content. This is one source, not corroboration.

| ID | Source | Evidence weight and limit |
|---|---|---|
| DFE | [DfE out-of-school safeguarding guidance, February 2026 PDF](https://assets.publishing.service.gov.uk/media/6986066acfe7ccf77efbc75b/After-school_clubs__community_activities__and_tuition_-_Safeguarding_guidance_for_providers.pdf) | High for DfE's recommended practice; explicitly non-statutory. Relevant pages 5, 9, 38–39, 47–49. Individual legal duties depend on provision. |
| BASE | [ICO children's lawful bases](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/how-do-the-lawful-bases-apply-to-children-s-personal-information/) | High regulatory guidance; does not select Goldleaf's bases. Current text includes recognised legitimate interests. |
| MIN | [ICO data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/) | High regulatory interpretation; necessity depends on the specific purpose. |
| CONSENT | [ICO obtaining, recording and managing consent](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/how-should-we-obtain-record-and-manage-consent/) | High regulatory guidance; marked under review. |
| RIGHTS | [ICO children's data protection rights](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-data-protection-rights-do-children-have/) | High regulatory guidance; individual competence, authority and best interests require judgment. |
| KEEP | [ICO storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) | High regulatory guidance; marked under review; no universal period. |
| NOTICE | [ICO right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/) | High regulatory guidance; marked under review; content depends on real processing. |
| SHARE | [ICO safeguarding information sharing](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/a-10-step-guide-to-sharing-information-to-safeguard-children/) | High for data protection considerations; marked under review; not safeguarding-practice advice. |
| DESIGN | [ICO general approach to children's information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-should-our-general-approach-be-to-handling-children-s-personal-information/) | High regulatory guidance on design, access and DPIA assessment; online-service scope needs facts. |
| HEALTH | [ICO special-category data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/) | High regulatory guidance on classification; not a condition authorising collection. |
| EXEMPT | [Ofsted childcare registration exemptions](https://www.gov.uk/guidance/childcare-registration-exemptions) | High registration-authority guidance; actual provision determines application. |
| HOURS | [Ofsted two-hour rule, updated 22 October 2026](https://www.gov.uk/guidance/providing-childcare-and-the-2-hour-rule) | High registration-authority guidance; includes immediately-before/after-school exception. |
| EYFS | [DfE current EYFS frameworks, effective September 2026](https://www.gov.uk/government/publications/early-years-foundation-stage-framework--2) | High statutory-framework source index; selected clauses reviewed below, not a complete applicability audit. |
| EYFS-G | [Current group and school-based framework](https://assets.publishing.service.gov.uk/media/6a5f8e4fb00f3323bf1a23a1/EYFS_group_and_school_based_from_September_2026.pdf) | Statutory framework, effective 1 September 2026. High for duties of covered providers; provider category unresolved. |
| EYFS-C | [Current childminder framework](https://assets.publishing.service.gov.uk/media/6a5f8e320dd52549f5f96c8c/EYFS_childminders_from_September_2026.pdf) | Statutory framework, effective 1 September 2026. High for covered childminders; does not establish Goldleaf's category. |
| ORDER | [Childcare (Exemptions from Registration) Order 2008, revised text](https://www.legislation.gov.uk/uksi/2008/979/contents) | Primary legislation, highest weight on text. Articles 3, 5 and 6 fetched directly as official XML after browser content-type failure. Exact two-hour boundary conflicts with current Ofsted summaries; application unresolved. |
| KENT-LADO | [Kent safeguarding partnership: current LADO/LESAS route](https://www.kscmp.org.uk/procedures/local-authority-designated-officer-lado) | Primary local safeguarding route, high for current referral procedure; not evidence Goldleaf has made a referral. |
| KENT-CHILD | [Kent safeguarding partnership: worried about a child](https://www.kscmp.org.uk/guidance/worried-about-a-child) | Primary local child-welfare route. Verify destination/contact details when publishing; do not invent numbers or use unrelated Medway routes. |


Research date: 16 November 2026. Recheck official guidance at policy approval; some ICO pages were marked under review. This focused review is not a legal determination or an applicability audit.
