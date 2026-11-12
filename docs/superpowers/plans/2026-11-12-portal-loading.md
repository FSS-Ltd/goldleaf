# Portal loading states

## Goal
Replace visible opening text with accessible, page-shaped portal and account skeletons.

## Architecture
Reuse existing Suspense and SDK boundaries. Static presentation does not mount PortalShell or reveal navigation, identity or data. Content-only variants remain inside the existing main element. Dashboard, list, detail, message, profile and auth shapes reflect their respective layouts.

## Spec
Announce truthful progress through a status region, hide decorative shapes from assistive technology, and disable animation for reduced-motion preferences. Keep Saving and Sending feedback unchanged. Pull-request CI tests the merge ref; deployment runs only on push or manual dispatch.

## Global Constraints
No new dependencies, artificial delay, polling, pre-authorization subscriptions or fake user data. No local Chrome; preserve the active preview and private configuration.

## Review Focus
Check landmark nesting, role fencing, mobile layout, motion preference, route fallbacks, and pull-request deployment isolation.

## Plan
- [x] Inventory routes, shells and existing primitives; no skeleton implementation exists.
- [x] Add rendering tests for announcements, hidden shapes, variants and main ownership; confirm failure first.
- [x] Replace loading fallbacks and SDK branches while retaining action feedback.
- [x] Run checks and inspect changes; update the feature tree and scoped graph.

## Ledger
The new rendering test failed first because PortalLoading did not exist, then passed after implementation. Production-build visual review and real assistive technology remain separate checks. Graph extraction is scoped; prior SQL and semantic gaps remain.
