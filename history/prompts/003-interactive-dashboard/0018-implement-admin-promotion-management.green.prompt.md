---
id: 0018
title: Implement admin promotion management
stage: green
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.implement
labels: ["dashboard", "implement", "us13", "admin-promotions", "timezone-bug"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/api/admin_promotions.js
 - src/pages/AdminPromotions.jsx
 - src/App.jsx
 - specs/003-interactive-dashboard/tasks.md
tests:
 - none (frontend-only story; live-browser verification against real data via headless-Chrome/CDP, cross-checked with direct curl calls to the real Neon-backed backend)
---

## Prompt

> continue

## Response snapshot

Implemented Phase 16 (User Story 13 — Admin promotion management, P3). Read `app/schemas/promotion.py` and `app/api/routes/admin_promotions.py` first — `list_promotions` takes only page/limit, no filter param, so the active/expired filter is done client-side over the fetched page (matching the same "don't invent a backend feature" call already made for the categories page). Built `src/api/admin_promotions.js` and `src/pages/AdminPromotions.jsx`: a plain filtered table (not `DataTable`, since there's no server-side search/filter to back it), a create/edit form in the existing `Modal` pattern.

**Found and fixed two real bugs during live verification (T102)**:

1. The form's two-column field rows (`display: flex` with `flex: 1` children) overflowed the `Modal`'s fixed 30rem width — `flex` items don't shrink below their content's intrinsic width without an explicit `min-width: 0`, and a `datetime-local` input's native width is wide enough to blow past half of the modal's ~440px content area. Caught it by screenshot (a visible horizontal scrollbar inside the modal). Fixed by switching to a single-column layout, matching every other Modal-based form already in this codebase.

2. A more serious one: `toDatetimeLocal` (used to pre-fill the edit form's date inputs from the backend's UTC ISO strings) just sliced the first 16 characters of the ISO string — treating UTC digits as if they were already local wall-clock time. Combined with the save path's `new Date(form.start_date).toISOString()` (which correctly interprets its input as local time and converts to UTC), this meant **editing a promotion without touching its dates silently shifted `start_date`/`end_date` by the full host timezone offset on every save**. Confirmed live: editing only `discount_value` moved `start_date` from `2026-09-28T17:54:00Z` to `12:54:00Z` — a 5-hour drift that would compound on every subsequent edit. Fixed by properly converting the UTC instant to local wall-clock digits (`new Date(d.getTime() - d.getTimezoneOffset() * 60000)`) before populating the input, which correctly inverts the save path's conversion. Re-verified: a second edit changing only the discount value left both dates byte-for-byte unchanged.

Verified the full T102 acceptance scenario against real disposable data: created `US13TEST10` (10% off, $20 min, 7-day window) via the browser form; added 3× a real product to a disposable test customer's cart ($26.97, qualifying); applied the coupon via direct API and confirmed `/cart` in the browser showed the correct discount; edited the discount to 15% via the browser form (where the two bugs above were caught and fixed); re-checked `/cart` without re-applying the coupon and confirmed it live-recalculated to the new value ($4.05 off, matching $26.97 × 15%), proving the cart always prices against the promotion's current state rather than a stale snapshot.

## Outcome

- ✅ Impact: User Story 13 complete (T099-T102). 15 of 16 user stories now done. Remaining: US15 (P3), then Phase 18 Polish.
- 🧪 Tests: none automated (frontend-only, no backend touched); live-verified via headless-Chrome/CDP, cross-checked against direct `curl` calls at every mutation step.
- 📁 Files: see front-matter.
- 🔁 Next prompts: Continue into Phase 17 (User Story 15 — Admin service management, the last user story), then Polish (Phase 18): responsive pass, accessibility pass, README site-map update, quickstart.md smoke test, dead-code cleanup.
- 🧠 Reflection: The timezone bug is the second one this implementation phase (after the UTC-vs-host-timezone bug found in US7's analytics date resolution) — both were silent, both would have shipped clean through a code-only review, and both were only findable by actually performing an edit and diffing the before/after API state rather than just checking that the save succeeded. Worth generalizing: any `datetime-local` input populated from a backend UTC timestamp needs the explicit local-conversion treatment, not a string slice — should double check `AdminOrders.jsx`'s date-range filters and any future admin form touching dates for the same pattern.

## Evaluation notes (flywheel)

- Failure modes observed: two real frontend bugs (modal layout overflow; timezone round-trip corruption), both caught by live verification with before/after API diffing rather than surface-level "did it save" checks, both fixed and re-verified within the same pass.
- Graders run and results (PASS/FAIL): live verification (create, cart application, edit, live recalculation, date-stability re-check) — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): audit every existing admin `datetime-local` field (order date-range filters, any others) for the same naive-slice bug pattern now that it's been found twice in this codebase; a quick grep for `.slice(0, 16)` or `.slice(0, 10)` against ISO date strings would surface any remaining instances cheaply.
