# Launch checklist (inputs needed from the client)

Environment (Vercel project settings)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the live domain. If missing, the sitemap and canonical URLs point at localhost.
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` (a public email address only shows on the site once this is set), `ENQUIRY_TO_EMAIL`, `ENQUIRY_FROM_EMAIL`, `RESEND_API_KEY` set. Verify the sending domain in Resend, then send one real test enquiry.

Content
- [ ] Confirm the town. Ashford, Kent is assumed (`content/site.ts`, `area`).
- [ ] Tutor bio and photo (`content/site.ts`, `tutor`). No invented qualifications.
- [ ] Confirm the founding offer wording: 5 places, 25 pounds an hour until Easter 2027, then 28 pounds an hour. Update `founding.taken` as places fill.
- [ ] Confirm whether singing is part of Goldleaf or Orah Vocal Coaching (open question in the business plan).
- [ ] Privacy notice reviewed. Check whether ICO registration is needed.

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
