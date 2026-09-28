---
id: 0017
title: Implement admin review moderation
stage: green
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.implement
labels: ["dashboard", "implement", "us12", "admin-reviews", "no-fake-functionality"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/api/admin_reviews.js
 - src/pages/AdminReviews.jsx
 - src/App.jsx
 - specs/003-interactive-dashboard/tasks.md
tests:
 - none (frontend-only story; live-browser verification against real data via headless-Chrome/CDP, cross-checked with direct curl calls to the real Neon-backed backend)
---

## Prompt

> continue

## Response snapshot

Implemented Phase 15 (User Story 12 — Admin review moderation, P3). Confirmed first that no cross-product review-list endpoint exists (`app/api/routes/reviews.py` only has per-product `GET /products/{id}/reviews` and `DELETE /admin/reviews/{id}`), matching the task's own pre-authorization to fan out per product rather than inventing a backend change. Built `src/api/admin_reviews.js` and `src/pages/AdminReviews.jsx`: a search-as-you-type product picker (over the existing customer-facing `fetchProducts`, with a request-key staleness guard applied proactively per the US10/US11 pattern), a rating filter, and a moderate-review action behind the existing `Modal` confirmation pattern.

Needed real review data to verify against and found none disposable existed — the only review in the DB (on "Betta Royal Blue") is real seed/demo data, and deleting it permanently to test moderation would have been an unnecessary destructive action on non-disposable data. Built a fully real one instead: registered a fresh disposable customer, added an address, added a product to cart, placed an order, walked the order through all five admin status transitions to `completed` (the review-creation endpoint requires a real completed-order `order_item_id`, confirmed by reading `review_service.create_review` — it validates ownership, product match, and `OrderStatus.completed` before allowing a review), then posted the review.

**Found and fixed a real bug during live verification**: selecting a product in the autocomplete and trying to load its reviews failed with "Couldn't load reviews right now." Traced it to `adaptProductListItem` (`src/api/adapters.js`) — the shared adapter that shapes every customer-facing product list, including the one this picker reuses — maps `id` to the product's **slug** (for customer-facing routing) and puts the raw backend UUID under `productId`. `AdminReviews.jsx` had called `listProductReviews(selectedProduct.id)`, silently sending a slug where the backend's `uuid.UUID(product_id)` expected a UUID, producing a 500. Fixed by switching to `selectedProduct.productId`. Re-verified after the fix — the real disposable review rendered correctly (4-star rating, text, timestamp), Remove → confirm in the Modal correctly deleted it (cross-checked via a direct `GET /products/:id/reviews` returning `[]`), and the UI correctly settled on "No reviews match this filter."

T098's literal acceptance text ("confirm it no longer appears on the product's public page") doesn't hold against this codebase as-is: grepped `ProductDetail.jsx` and confirmed there is no public reviews display anywhere in the frontend yet. Rather than fabricate one to make the task's wording literally true (constitution §31), verified the actual thing that matters — the moderation action's real effect on the data — via the direct API cross-check instead, and documented the gap plainly in `tasks.md`.

## Outcome

- ✅ Impact: User Story 12 complete (T095-T098). 14 of 16 user stories now done. Remaining: US13, US15 (both P3), then Phase 18 Polish.
- 🧪 Tests: none automated (frontend-only, no backend touched); live-verified via headless-Chrome/CDP, cross-checked against direct `curl` calls at every mutation step.
- 📁 Files: see front-matter.
- 🔁 Next prompts: Continue into Phase 16 (User Story 13 — Admin promotion management), then US15, then Polish (Phase 18).
- 🧠 Reflection: This is the second bug this implementation phase caused by an adapter that reshapes backend data for customer-facing use (`id` → slug) being reused in an admin context that actually needs the raw backend id. The fix pattern (`productId` alongside `id`) already existed in the adapter — the bug was in not reading the adapter closely enough before wiring it into a new consumer. Worth remembering for US13/US15 if either reuses a customer-facing adapter: check what "id" actually means in that shape before assuming it's the backend's raw identifier.

## Evaluation notes (flywheel)

- Failure modes observed: one real frontend bug (wrong id field consumed from a shared adapter), caught by live verification and fixed before being reported as done; not a backend or spec gap this time.
- Graders run and results (PASS/FAIL): live verification (product search, review display, moderation, post-moderation empty state, API cross-check) — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): when reusing any customer-facing adapter (`adaptProductListItem`, `adaptProductDetail`, etc.) in a new admin component, explicitly check which field is the raw backend id before wiring up any endpoint call that needs one — this is the second time `id` being a slug rather than a UUID has caused a silent failure this session.
