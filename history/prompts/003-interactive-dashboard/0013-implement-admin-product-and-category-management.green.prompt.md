---
id: 0013
title: Implement admin product and category management
stage: green
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.implement
labels: ["dashboard", "implement", "us14", "product-crud", "category-crud", "draft-status-gap"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/api/admin_catalog.js
 - src/api/adapters.js
 - src/pages/AdminCategories.jsx
 - src/pages/AdminProducts.jsx
 - src/App.jsx
 - specs/003-interactive-dashboard/tasks.md
tests:
 - none (frontend-only story; live-browser verification with API cross-checks at every step)
---

## Prompt

> continue

## Response snapshot

Implemented Phase 12 (User Story 14 — Admin product & category management), the last P2 story. Read `CreateProductRequest`/`UpdateProductRequest`/`FishDetailsRequest`/`CreateCategoryRequest`/`UpdateCategoryRequest` directly from `backend/app/schemas/product.py` before building the forms, rather than guessing field names from the spec.

`admin_catalog.js`: thin wrappers over the existing product/category CRUD endpoints. `AdminCategories.jsx`: list + create/edit `Modal` (name, parent dropdown, archive toggle). `AdminProducts.jsx`: `DataTable` list + create/edit `Modal` with the full field set, fish-details fieldset conditionally shown for `product_type === 'fish'`.

Building the edit form surfaced two real bugs in earlier work: `adaptProductDetail` (from US1-era `adapters.js`) discarded the raw `fish_details` object, keeping only a display-relabeled `specs` subset unsuitable for re-editing — added a `fishDetails` passthrough. `adaptProductListItem` never exposed `sku` or `status` at all — added both, since the edit form needs to pre-fill them.

A third issue was more consequential: verification showed a newly-created product came back with `status: "draft"`, not visible in `/shop` — traced to `CreateProductRequest` genuinely having no `status` field; the backend always creates products as `draft`. But FR-020a explicitly requires a new product be "immediately visible in the live catalog." This is a real spec-vs-backend-behavior gap, same class as the `AdminOrderListItem` gap found in US3. Fixed on the frontend side (no backend change needed): chained an `updateProduct(id, {status: 'active'})` call immediately after `createProduct` succeeds, rather than leaving new products silently invisible.

**Live verification**, the full lifecycle against real data: created a category ("Test Category Sep28", confirmed via API); created a fish product with real `fish_details` (species, common name, freshwater/marine — all correctly saved, confirmed via `GET /products/{slug}`); confirmed the create+activate chain made it appear in a live shop search immediately; edited its price to $11.49 and confirmed via API; archived it and confirmed it dropped out of shop search results (`total_items: 0`). The "historical orders unaffected" half of the scenario didn't need new verification — `OrderItem.product_name_snapshot`/`unit_price_snapshot` (pre-existing columns from the original backend build) structurally guarantee it regardless of any later product change.

## Outcome

- ✅ Impact: User Story 14 complete — 10 of 16 user stories done (everything except the P3 tier). A real product-creation gap (drafts not immediately visible, contradicting FR-020a) was caught and fixed before it could surprise an admin using the feature for the first time.
- 🧪 Tests: none automated (frontend-only, no backend touched this story); full create→verify→edit→verify→archive→verify lifecycle live-verified with an API cross-check at every step.
- 📁 Files: see front-matter.
- 🔁 Next prompts: Continue into the P3 tier — US10 (admin appointment management), US11 (admin customer management), US12 (review moderation), US13 (promotion management), US15 (service management) — then Polish.
- 🧠 Reflection: The draft-status gap is the third instance this implementation phase of a spec acceptance-scenario assuming behavior the actual backend doesn't provide by default (after the `AdminOrderListItem` customer-identity gap in US3 and the UTC-timezone gap in US7). All three were only findable by reading real backend source and then actually exercising the flow end-to-end — none would have surfaced from re-reading the spec/plan/tasks more carefully.

## Evaluation notes (flywheel)

- Failure modes observed: two adapter bugs (missing `fishDetails`/`sku`/`status` passthrough) were self-introduced this same session while building the edit form, caught immediately by trying to actually use the form rather than after the fact. The draft-status gap was pre-existing backend behavior, not something this session introduced, but only surfaced because verification checked the real API response instead of trusting the create call's 201 status as sufficient.
- Graders run and results (PASS/FAIL): live full-lifecycle verification (create → shop-visible → edit → archive → shop-hidden) — PASS at every step, each cross-checked against a direct API call.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): none specific to this story — the "read the real schema before building the form, then verify the real API response after" pattern has now paid off three times in a row and is worth keeping as the default for every remaining CRUD-shaped story (US11 customers, US13 promotions, US15 services all have the same shape).
