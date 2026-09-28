---
id: 0012
title: Implement global search across dashboard roles
stage: green
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.implement
labels: ["dashboard", "implement", "us9", "global-search", "architecture-fix"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/api/admin_customers.js
 - src/components/GlobalSearch.jsx
 - src/components/DashboardHeader.jsx
 - src/index.css
 - specs/003-interactive-dashboard/tasks.md
tests:
 - none (frontend-only story; live-browser verification against real data)
---

## Prompt

> continue

## Response snapshot

Implemented Phase 11 (User Story 9 — Global search), frontend-only against three already-existing endpoints (no backend work). Added `admin_customers.js` first (`listCustomers`, `getCustomerDetail` — ahead of schedule, US11 needs it too, same pattern as `wishlist.js` in US1).

Caught an architecture problem in the Foundational shell's own design before writing `GlobalSearch.jsx`: T013 (built during Foundational) split search into an input owned by `DashboardHeader` and a results area rendered via a `searchSlot` render-prop. That split works for simple display but breaks keyboard navigation — moving an active-result index with Up/Down/Enter needs the input's keydown handler and the result list in the same component. Rather than bolt awkward cross-component event plumbing onto the existing split, redesigned `GlobalSearch` as a fully self-contained unit (icon + input + debounce + fan-out fetch + grouped dropdown + keyboard nav), and simplified `DashboardHeader.jsx` back down to just rendering it — removing the now-unnecessary `searchSlot` prop entirely.

Customer mode fans out to `fetchProducts({search})`, a client-side filter over `fetchServices()`'s small result set, and a client-side filter over the customer's own `fetchOrders()` (by order-id prefix or item name). Admin mode fans out to `fetchProducts`, `listOrders({search})` (US3's extension), and the new `listCustomers({search})`. Results render grouped by resource type with a loading state, debounced 300ms, click-outside-to-close, and Up/Down/Enter navigation across the flattened result list.

**Live verification** against real production/test data: customer search for "Water" correctly grouped results under "Products" (Water Conditioner) and "My Orders" (the order containing it as a line item); admin search for "Four" returned "Customers → Dash Four (email)", cross-checked against a direct `GET /admin/customers?search=Four` call returning the identical single match. Confirmed the debounce and parallel fan-out both work correctly once given enough round-trip time in this environment. This session's Vite-staleness issue recurred a fourth time — this time diagnosed immediately via `ps aux` (rather than trusting `pkill`'s exit status) before it could cost debugging time, confirming the PHR 0011 lesson stuck.

## Outcome

- ✅ Impact: User Story 9 complete — 9 of 16 user stories done (all P1 + all P2 except US14). A real design flaw in the Foundational shell (search input/results split across two components) was found and corrected before it accumulated more dependents.
- 🧪 Tests: none automated (frontend-only, no backend touched); live-verified both roles' search against real data with independent API cross-checks.
- 📁 Files: see front-matter.
- 🔁 Next prompts: Continue to Phase 12 (User Story 14 — Admin product & category management), the last P2 story, then the P3 tier (US10, US11, US12, US13, US15).
- 🧠 Reflection: The `searchSlot` split was a genuine design mistake made three stories ago (Foundational, before any component actually needed keyboard-navigable results) — worth noting as a case where an earlier "wire the slot now, fill it in later" placeholder locked in an interface that didn't fit the actual eventual requirement, and the fix was cheaper to make now (2 components) than it would have been after more of the dashboard depended on the old shape.

## Evaluation notes (flywheel)

- Failure modes observed: none in the shipped feature; one earlier architectural placeholder (T013's `searchSlot`) turned out not to fit and was corrected rather than worked around.
- Graders run and results (PASS/FAIL): live search verification (customer + admin, both grouped correctly) — PASS, cross-checked against direct API calls both times.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): When building a Foundational-phase placeholder specifically to be filled in by a later story, sanity-check it against that later story's actual interaction requirements (here: keyboard navigation) at design time, not just its visual shape.
