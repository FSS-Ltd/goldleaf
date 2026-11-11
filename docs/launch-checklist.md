# Launch checklist (inputs needed from the client)

Environment (Vercel project settings)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the live domain. If missing, the sitemap and canonical URLs point at localhost.
- [ ] Enquiries go to admin@goldleaf.education (default in `content/site.ts`, also shown on the site as the fallback contact). Set `ENQUIRY_FROM_EMAIL` to an address on a domain verified in Resend (goldleaf.education), set `RESEND_API_KEY`, then send one real test enquiry.

Content
- [ ] Confirm the town. Ashford, Kent is assumed (`content/site.ts`, `area`).
- [ ] Tutor bio and photo (`content/site.ts`, `tutor`). No invented qualifications.
- [ ] Confirm the founding offer wording: 5 places, 25 pounds an hour until Easter 2027, then 28 pounds an hour. Set up and manage the inventory using the [database runbook](../db/README.md). An admin founding tag is planned, not yet available.
- [ ] Confirm whether singing is part of Goldleaf or Orah Vocal Coaching (open question in the business plan).
- [ ] Privacy notice approved by the client. Check whether ICO registration is needed.

Trust flags (flip in `content/site.ts` only once true)
- [ ] `dbsEnhanced`
- [ ] `insured`
- [ ] `safeguardingPolicy`

Legal
- [ ] Confirm the registration position with the local authority early years team before launch. The site makes no Ofsted claims.

Local SEO (outside the codebase)
- [ ] Google Business Profile as a service-area business in Ashford, linked to the site.
- [ ] Submit the sitemap in Google Search Console.

Known local-only noise
- `/_vercel/insights/script.js` returns 404 locally. It resolves on Vercel.
