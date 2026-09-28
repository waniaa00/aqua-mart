---
id: 0014
title: Implement customer activity feed honestly
stage: green
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.implement
labels: ["dashboard", "implement", "us16", "activity-feed", "no-fake-functionality"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/components/ActivityFeed.jsx
 - src/pages/Dashboard.jsx
 - specs/003-interactive-dashboard/tasks.md
tests:
 - none (frontend-only story; live-browser verification against real data)
---

## Prompt

> continue

## Response snapshot

Implemented Phase 12A (User Story 16 — Customer activity feed), the story added during the earlier `/sp.analyze` remediation to give FR-010 a backing story. Before writing any code, checked T106a's premise directly against the backend schemas — and found it was more optimistic than reality on two of three counts:

- `AppointmentResponse` has no `created_at`/booked-at field at all (confirmed in `app/schemas/service.py` — only the slot's own `date`/`start_time`).
- `WishlistProductResponse` has no timestamp whatsoever (confirmed in `app/schemas/wishlist.py` — just `{product_id, name, slug, price}`).
- The reviews gap T106a already anticipated (no per-customer review-listing endpoint) was confirmed correct.

Constitution §31 (No Fake Functionality) rules out fabricating either missing timestamp to force a clean chronological merge. Resolved each honestly rather than working around the gap: appointment entries sort by their real scheduled `date`/`start_time` (accurate information about the appointment, explicitly not claimed to be "when it was booked"); wishlist additions are omitted from the feed entirely, the same treatment T106a already prescribed for reviews.

Also deviated from T106b's literal instruction to build a separate `src/api/activity.js` fetch: `Dashboard.jsx` already loads `orders` and `appointments` into state for its KPI tiles and recent-lists sections, so `ActivityFeed.jsx` is a pure presentational component deriving its merged, sorted list from those same arrays via `useMemo` — no redundant network round-trip for data already in memory. Entries open the existing `OrderDetailDrawer`/`AppointmentDetailDrawer` from US4 via callback props, reusing that infrastructure directly rather than adding new navigation.

**Live verification** against real test data: the feed showed "Appointment — Aquarium Setup (CANCELLED, Sep 29)" above "Order placed — Water Conditioner (CONFIRMED, Sep 26)", correctly sorted newest-first by each entry's respective timestamp; clicking the order entry opened the real `OrderDetailDrawer` with an accurate status timeline and totals, confirming the drawer-reuse wiring works.

## Outcome

- ✅ Impact: User Story 16 complete — 11 of 16 user stories done (all P1 + all P2, including this one). Only the P3 tier remains (US10, US11, US12, US13, US15). The activity feed is honest about what it can and can't show, rather than silently fabricating timestamps to hit a "looks complete" bar.
- 🧪 Tests: none automated (frontend-only, no backend touched); live-verified sort order and drawer-reuse against real data.
- 📁 Files: see front-matter.
- 🔁 Next prompts: Continue into the remaining P3 stories (US10, US11, US12, US13, US15), then Polish (Phase 18).
- 🧠 Reflection: This is the fourth spec-vs-backend gap found this implementation phase (after `AdminOrderListItem`/US3, the UTC timezone bug/US7, and the draft-status gap/US14) — all four were only findable by reading real schemas and exercising real data, and all four got fixed or honestly documented rather than silently worked around. The activity feed specifically is a case where "fix" wasn't available (no backend change was in scope) and the right move was transparency instead.

## Evaluation notes (flywheel)

- Failure modes observed: none in shipped code — T106a's own pre-authorization to omit reviews for a missing endpoint extended cleanly to the two newly-found gaps (appointment timestamp, wishlist timestamp) without needing new justification.
- Graders run and results (PASS/FAIL): live verification (sort order, drawer reuse) — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): none specific to this story.
