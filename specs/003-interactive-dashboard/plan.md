# Implementation Plan: Interactive Dashboard

**Branch**: `003-interactive-dashboard` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-interactive-dashboard/spec.md`

## Summary

Builds two interactive dashboard experiences — Customer (`/dashboard/*`,
consolidating and extending the existing `/account`) and Admin (`/admin/*`,
extending the existing `/admin`) — as specified in `spec.md`'s 15
prioritized user stories: account/business overviews, order and
appointment management with a visual status timeline, a wishlist and a
notification center (both backend-complete, previously unbuilt on the
frontend), date-range revenue/order analytics with period comparison,
interactive filterable/sortable tables, and full admin CRUD for products,
categories, services, and promotions.

A route-by-route audit of the existing backend (research.md §1) found that
**nearly all of this is a frontend build against already-shipped,
already-tested endpoints**. Only three pieces of backend work are needed:
one new endpoint (date-range analytics, `contracts/analytics.md`) and two
small, additive query-parameter extensions to existing endpoints
(`GET /admin/orders`, `GET /products` — `contracts/*-extended.md`). No new
tables; two new indexes on `orders` (`data-model.md`). No new frontend
dependency — charts, tables, modals, and drawers are hand-rolled
consistent with this codebase's existing zero-UI-library convention
(research.md §5/§6).

The user's plan input also sketched a parallel `/api/v1/dashboard/*` and
`/api/v1/admin/dashboard/*` endpoint surface as an illustrative REST
shape. Per research.md §1, this plan deliberately does **not** build that
surface — it would duplicate the already-existing, already-tested
endpoints this feature instead consumes directly, which the constitution's
Code Quality principle (§28, "avoid duplicate logic") and the plan input's
own "avoid introducing unnecessary architectural changes" instruction both
argue against.

## Technical Context

**Language/Version**: Python 3.12 (backend, for the three endpoint
changes above); JavaScript (ES2022+) / React 19 (frontend) — both
unchanged from the existing stack.
**Primary Dependencies**: Backend — FastAPI, SQLAlchemy 2.0 (async),
Alembic (one new migration), all already in place. Frontend — React,
react-router-dom; **no new npm dependency** (research.md §5/§6: charts,
tables, modals, drawers, date-range picker are hand-rolled).
**Storage**: PostgreSQL via Neon, same database — two new indexes on
`orders`, no new tables (data-model.md).
**Testing**: Backend — pytest + pytest-asyncio against a real Postgres
branch, matching `001-fish-shop-backend`'s existing suite (new contract
tests for the analytics endpoint and the two extended endpoints). Frontend
— this session's established pattern of a full headless-browser (Chrome +
playwright-core) walkthrough against the live Render backend for every
shipped page, verified and cleaned up afterward (no Vitest/RTL/MSW harness
exists in this repo yet — see Complexity Tracking for why one isn't added
here either).
**Target Platform**: Same as the whole platform — Render (backend), Vercel
(frontend), Neon (database), browser-based dashboard over HTTPS.
**Project Type**: Web application — extends the existing `backend/` +
root-level frontend structure; no new top-level project.
**Performance Goals**: SC-001 (customer overview <3s), SC-002 (admin order
lookup+update <30s), SC-005 (range/currency switch <2s) — all standard
interactive-web-app latency, no new performance regime.
**Constraints**: Every figure shown MUST reconcile with backend data
(SC-003) — no client-computed analytics, currency conversion, or totals,
consistent with this session's currency-conversion fix and the
constitution's financial-authority principles (§8, §11). Admin-only data
MUST be backend-enforced independent of UI state (SC-006, FR-035).
Polling (notifications) MUST stay light (FR-028, research.md §7).
**Scale/Scope**: 16 user stories (US16 added post-`/sp.analyze` to give
FR-010 a backing story — composed client-side, no new backend surface),
2 new/3 extended backend surfaces (0 new tables), ~15-20 new frontend
pages/sections reusing 4 new shared components (`DataTable`, `Modal`,
`Drawer`, `DateRangePicker`) plus this session's existing
`Icon`/`ProductImage`/context patterns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against `.specify/memory/constitution.md` v2.0.0:

| Principle | Gate | Status |
|---|---|---|
| §2.1/§2.2 Backend stack; frontend never touches the DB directly | New backend work MUST use the existing FastAPI/SQLAlchemy/Neon/Alembic stack; frontend MUST go through the API | ✅ PASS — Technical Context; every frontend data access in `contracts/reused-endpoints-map.md` is an API call |
| §3/§28 Modular architecture; no duplicate logic | New backend work MUST live in the existing `services/`/`schemas/`/`api/routes/` split, not a parallel structure | ✅ PASS — see Project Structure; research.md §1 explicitly rejects a duplicate `/dashboard/*` surface for exactly this reason |
| §4 API-First, `/api/v1/` prefix | New/extended endpoints MUST use the existing prefix and query-param filter convention | ✅ PASS — `contracts/analytics.md` and the two `*-extended.md` files follow the exact pattern `GET /products` already uses |
| §5 Neon Postgres, Alembic migrations, indexes | Any new index MUST go through a reviewed migration, not direct DB manipulation | ✅ PASS — data-model.md; quickstart.md documents the `alembic revision --autogenerate` step |
| §8/§11 Backend authoritative for financial calculations; single base price/currency, no client-side conversion | Analytics/KPI figures MUST be server-computed; the frontend MUST NOT reintroduce client-side currency math | ✅ PASS — `contracts/analytics.md`'s revenue figures are backend-aggregated; explicitly continues this session's fix removing client-side currency conversion |
| §17 Accessibility | New shared components (Modal, Drawer, DataTable, charts) MUST meet keyboard/focus/ARIA requirements | ✅ PASS — research.md §6 states this explicitly as the reason to hand-roll rather than skip; FR-030–FR-034, SC-008 |
| §18/§19 Auth/authz; server-side enforcement, never UI-only | Every admin-only view and its data MUST be rejected server-side for non-admins, independent of route hiding | ✅ PASS — FR-035–FR-037; every reused/extended/new endpoint keeps its existing `require_admin`/`get_current_user` dependency unchanged |
| §20/§21 Centralized error handling; validation at the API boundary | New/extended endpoints MUST return the existing structured error shape and validate server-side | ✅ PASS — `contracts/analytics.md` and `*-extended.md` both specify `400 VALIDATION_ERROR` cases, reusing the shared error format |
| §22 Testing proportionate to risk | Business-critical new logic (analytics aggregation, order search/filter) MUST have tests | ✅ PASS — Technical Context; new pytest contract tests planned for all three backend changes |
| §23 Performance; avoid N+1, appropriate indexes | The new analytics query and extended order/product filters MUST not introduce N+1 or unindexed scans | ✅ PASS — data-model.md's two new indexes target exactly these query patterns; `stock_status` filter reuses an already-loaded relationship (research.md §3b), adding no query |
| §27 Phase Discipline; no unnecessary scope expansion | This plan MUST NOT build capability spec.md doesn't call for | ✅ PASS — no `/dashboard/*` duplicate surface (see Summary); Complexity Tracking row below justifies the one deliberate scope decision (no new frontend test harness) |
| §31 No Fake Functionality | Loading/empty/error states MUST be real, not placeholder; analytics MUST reflect real data | ✅ PASS — FR-030 requires real states; `contracts/analytics.md`'s empty-range case returns real zeroed totals, not a fabricated chart |
| §34 Scalability; simple enough for a small business | New analytics MUST NOT require infrastructure disproportionate to this platform's scale | ✅ PASS — research.md §4 explicitly rejects a materialized summary table as disproportionate; an indexed aggregate query is sufficient |

No unjustified violations. One deliberate, justified scope decision is
recorded in Complexity Tracking (not a violation — a "simpler alternative
chosen" entry, per that table's purpose).

*Post-Phase-1 re-check: see "Post-Design Constitution Check" below.*

## Project Structure

### Documentation (this feature)

```text
specs/003-interactive-dashboard/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/                       # Phase 1 output
│   ├── analytics.md                 # New endpoint
│   ├── admin-orders-extended.md     # Extended endpoint
│   ├── products-inventory-extended.md  # Extended endpoint
│   └── reused-endpoints-map.md      # Every user story → existing endpoint
├── checklists/
│   └── requirements.md              # Already created by /sp.specify
└── tasks.md                         # Phase 2 output (/sp.tasks — not this command)
```

### Source Code (repository root)

Backend additions sit in the existing `backend/app/` modular structure —
**no new top-level module**, per §3/§28's "no duplicate logic" gate and
research.md §1's decision against a parallel dashboard API surface:

```text
backend/app/
├── api/routes/
│   ├── admin.py                  # existing — add GET .../analytics here (same file as .../summary)
│   ├── admin_orders.py           # existing — extend list_orders_admin_route's params
│   └── products.py               # existing — extend list_products_route's params
├── services/
│   ├── admin_service.py          # existing — add get_dashboard_analytics() beside get_dashboard_summary()
│   ├── order_service.py          # existing — extend list_orders_admin() filters/sort
│   └── product_service.py        # existing — extend list_products() with stock_status
├── schemas/
│   └── admin.py                  # existing — add AnalyticsResponse alongside DashboardSummaryResponse
└── alembic/versions/
    └── <new>_add_order_date_status_indexes.py
```

Frontend additions follow the existing flat `src/pages/`, `src/api/`,
`src/components/`, `src/context/` convention (no nested per-domain
folders, matching every page shipped so far this session):

```text
src/
├── pages/
│   ├── Dashboard.jsx                    # replaces Account.jsx as /dashboard (profile tab absorbs its form); recent orders/appointments + activity feed shown here, detail via OrderDetailDrawer/AppointmentDetailDrawer opened in place — FR-006/FR-008 only require "recent," not a full paginated history, so no separate list route exists
│   ├── DashboardWishlist.jsx            # /dashboard/wishlist
│   ├── AdminOrders.jsx                  # /admin/orders — DataTable + Drawer
│   ├── AdminInventory.jsx               # /admin/inventory
│   ├── AdminAnalytics.jsx               # part of /admin overview or its own tab — chart + DateRangePicker
│   ├── AdminAppointments.jsx            # /admin/appointments — calendar/timeline
│   ├── AdminCustomers.jsx               # /admin/customers (+ :id detail via Drawer)
│   ├── AdminReviews.jsx                 # /admin/reviews
│   ├── AdminPromotions.jsx              # /admin/promotions — list + create/edit form
│   ├── AdminProducts.jsx                # /admin/products — list + create/edit form (fish-details conditional)
│   ├── AdminCategories.jsx              # /admin/categories
│   └── AdminServices.jsx                # /admin/services — list + create/edit + slot management
├── components/
│   ├── DataTable.jsx                    # new shared: search/filter/sort header + paginated rows
│   ├── Modal.jsx                        # new shared
│   ├── Drawer.jsx                       # new shared
│   ├── DateRangePicker.jsx              # new shared
│   ├── NotificationPanel.jsx            # new shared (customer + admin)
│   ├── GlobalSearch.jsx                 # new shared (header)
│   ├── RevenueChart.jsx                 # new — hand-rolled SVG line/area
│   ├── OrderDetailDrawer.jsx            # new shared — customer order detail (US4)
│   ├── AppointmentDetailDrawer.jsx      # new shared — customer appointment detail (US4)
│   └── ActivityFeed.jsx                 # new — customer activity feed (US16)
├── context/
│   └── DashboardUIContext.jsx           # new — sidebar/filter/session UI state (research.md §9)
└── api/
    ├── notifications.js                 # new — thin wrapper, first consumer of existing /notifications
    ├── wishlist.js                      # new — first consumer of existing /wishlist
    ├── reviews.js                       # new — first consumer of existing reviews endpoints
    ├── admin_orders.js                  # extends existing admin.js pattern with the new filter params
    ├── admin_inventory.js               # new — thin wrapper over extended GET /products
    ├── admin_customers.js               # new — first consumer of existing /admin/customers
    ├── admin_appointments.js            # new — first consumer of existing /admin/appointments
    ├── admin_promotions.js              # new — first consumer of existing /admin/promotions
    ├── admin_catalog.js                 # new — first consumer of existing product/category CRUD
    ├── admin_services.js                # new — first consumer of existing service/slot CRUD
    ├── analytics.js                     # new — the one new endpoint
    └── activity.js                      # new — client-side composition over orders/appointments/wishlist (US16), same pattern as global search
```

**Structure Decision**: Extend the existing single-`backend/` +
root-level-frontend layout — this is additive work inside both halves of
the already-established structure (per `001-fish-shop-backend`'s
"Structure Decision" and this session's own precedent), not a new
project. `/account` redirects to `/dashboard` (research.md §8);
`/account/login`/`/account/signup` are unchanged.

## Complexity Tracking

> Not a violation — this project has no automated frontend test harness
> yet (Vitest/RTL/MSW), unlike the `002-frontend-integration` branch's
> research.md, which planned one but never merged it. Recorded here per
> the Constitution Check gate's instruction to justify any deviation from
> what a strict reading of §22 (Testing Principle) might otherwise expect.

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| No new frontend test harness (Vitest/RTL/MSW) added in this plan | This session's established, working verification method — a full headless-browser walkthrough against the live Render backend for every shipped page — has caught every real regression so far (documented in this session's PHRs and commit messages) without the setup cost of a mock-based harness | Adding Vitest/RTL/MSW now (as `002-frontend-integration`'s own research.md once planned) is real, standing infrastructure work orthogonal to this feature's 15 user stories; introducing it here would be exactly the "unnecessary scope expansion" §27 warns against. Worth doing as its own follow-up, not smuggled into this plan. |

## Post-Design Constitution Check

Re-verified after Phase 1 (`research.md`, `data-model.md`, `contracts/`,
`quickstart.md` written): still ✅ PASS on every row above. Notably:
`contracts/analytics.md` confirms revenue figures stay USD/server-computed
(§8/§11 unchanged), `data-model.md` adds indexes rather than a disproportionate
new table (§23/§34), and `contracts/reused-endpoints-map.md` confirms every
admin-only capability keeps its existing `require_admin` dependency
untouched (§18/§19) — no new endpoint in `contracts/` omits an auth
requirement.
