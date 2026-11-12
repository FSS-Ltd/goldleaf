# Admin Today and family selection

**Goal:** Give admin a Today landing and immediate family selection.

**Architecture:** A server-owned admin role reads a London-day batch. Existing Today cards, priority selection and session workspace are reused. Family selection navigates to the validated query URL.

**Spec:** `/admin/today` is the default; `/admin` remains Families. Mobile shows Today, Families, Children, Messages and More; More provides Invoices, Team and Settings.

**Global constraints:** Preserve role checks, event transport, loading boundaries, existing data and historical migrations. No polling or provider mutations.

**Review focus:** Admin-only SQL and grants, London DST boundaries, fixed destinations, keyboard navigation and family authorization.

- [x] Inventory source, Graphify and feature tree; identify reuse.
- [x] Add bounded admin batch, shared Today selection and presentation.
- [x] Add navigation and immediate family selection.
- [x] Run checks and disposable database tests; update maps and review diff. Browser and assistive technology checks remain open.
