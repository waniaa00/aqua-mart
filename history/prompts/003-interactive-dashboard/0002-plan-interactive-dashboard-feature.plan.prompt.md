---
id: 0002
title: Plan Interactive Dashboard Feature
stage: plan
date: 2026-09-24
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.plan
labels: ["dashboard", "plan", "analytics", "backend-extension", "reused-endpoints", "no-new-dependency"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-interactive-dashboard/plan.md
 - specs/003-interactive-dashboard/research.md
 - specs/003-interactive-dashboard/data-model.md
 - specs/003-interactive-dashboard/quickstart.md
 - specs/003-interactive-dashboard/contracts/analytics.md
 - specs/003-interactive-dashboard/contracts/admin-orders-extended.md
 - specs/003-interactive-dashboard/contracts/products-inventory-extended.md
 - specs/003-interactive-dashboard/contracts/reused-endpoints-map.md
 - CLAUDE.md
tests:
 - none
---

## Prompt

# Implementation Plan: Interactive Customer & Admin Dashboard

## 1. Plan Overview

* Build a modern, responsive, highly interactive dashboard system for the pet fish shop.
* Implement two dashboard experiences: Customer Dashboard, Admin Dashboard.
* Use a shared application shell where possible.
* Keep customer and admin functionality separated through role-based access control.
* Integrate the dashboard with the existing: Product system, Order system, Appointment system, Service system, Inventory system, Customer/user system, Reviews system, Promotions system, Notification system, Multi-currency system.
* Follow the project's existing technology decisions: Frontend JavaScript/TypeScript React-based application; Backend Python; API FastAPI; Database Neon PostgreSQL; Package/environment management `uv` for Python; API versioning `/api/v1/`.
* Follow the existing project constitution and specifications.
* Avoid introducing unnecessary technologies or architectural changes.

## 2. Architecture Strategy

* Use a dashboard-oriented frontend architecture.
* Separate dashboard routes by user role.
* Suggested route structure: `/dashboard`, `/dashboard/orders`, `/dashboard/appointments`, `/dashboard/wishlist`, `/dashboard/profile`, `/dashboard/notifications`, `/admin`, `/admin/orders`, `/admin/products`, `/admin/inventory`, `/admin/appointments`, `/admin/customers`, `/admin/services`, `/admin/reviews`, `/admin/promotions`.
* Create reusable dashboard components, reusable data-fetching patterns, reusable table/chart/modal/drawer/filter/pagination/notification components.
* Keep business logic out of presentation components; API communication inside dedicated API/service modules; authentication and authorization centralized; role-based route protection; dashboard data scoped to the authenticated user where required.

## 3. Dashboard Application Shell

* Reusable shell: sidebar, header, main content area, breadcrumbs, notifications, user profile menu, currency selector, theme controls.
* Responsive sidebar: desktop expanded/collapsible; tablet compact with expand/collapse; mobile hidden by default with drawer + overlay.
* Preserve navigation state where appropriate; active navigation indicators; icons; keyboard navigation; visible focus states; accessible labels on icon-only buttons.

## 4. Global Dashboard Header

* Global search, currency selector, notification button, user/profile menu, theme control if supported; responsive, no mobile overflow.
* Global search: suggestions where applicable; results navigate to Products/Orders/Services/Customers (admin). Unread notification count; open notification center from button; display authenticated user's profile info.

## 5. Multi-Currency Integration

* Integrate with existing multi-currency system (USD/GBP/PKR); use backend-provided conversion data; no frontend-only hardcoded exchange rates; consistent formatting; update on currency change; preserve selection; distinguish original transaction currency vs. display currency; avoid rounding inconsistencies; server-calculated authoritative totals.

## 6. Notification Center

* Unread/read notifications, type, timestamp, related resource; mark as read/unread/all read; open related order/appointment/promotion; unread count in header; loading/empty/error states; optimistic UI only where safe; synchronize after mutations.

## 7. Customer Dashboard

### 7.1 Overview
Personalized welcome; KPI cards (total orders, active orders, upcoming appointments, wishlist items); recent activity; recent orders; upcoming appointments; quick actions; account info.

### 7.2 KPI Cards
Reusable component: label, value, icon, trend, supporting text, loading state; values from backend; no admin-only metrics exposed.

### 7.3 Orders
Order number/date/status/total/item count/payment status; search/filter/sort/pagination; detail navigation; timeline; visual status; responsive mobile cards.

### 7.4 Order Details
Order info, products, quantities, prices, discounts, taxes, shipping, total, payment status, fulfillment status; timeline; customer actions; prevent unauthorized access.

### 7.5 Appointments
Service/date/time/status/location/assigned staff; calendar view; list/timeline view; navigation to details; clear status; cancellation/rescheduling per business rules.

### 7.6 Activity Feed
Order placed/status changed, appointment booked/updated, review submitted, promotion received; chronological; meaningful timestamps; loading/empty states.

### 7.7 Wishlist
Product image/name/price/availability; remove/add-to-cart/open product; out-of-stock state; responsive layout.

### 7.8 Quick Actions
Browse products, view orders, book service, view appointments, view wishlist, update profile — accessible from overview.

## 8. Admin Dashboard

### 8.1 Overview
High-level metrics: revenue, orders, customers, appointments, products, low-stock; date-range filtering (today/7d/30d/custom); admin-only data protected.

## 9. Admin KPI System
Total revenue, total orders, AOV, new customers, pending appointments, low-stock products; comparison values (current, previous period, % change) where available; no misleading comparisons when data unavailable; handle zero/missing-data cases.

## 10. Revenue Analytics
Interactive chart; daily/weekly/monthly; date-range selection; currency selection; tooltips; formatted values; empty/loading/error states; backend-sourced.

## 11. Sales Analytics
Track revenue/orders/units sold/AOV; filter by date; product/service distinction; visual trends; interactive inspection; no sensitive info to non-admins.

## 12. Order Analytics
Total/pending/processing/completed/cancelled; status distribution; interactive charts; date-range filter; link to order management.

## 13. Admin Order Management
Order ID/customer/date/status/payment status/total; search/filter/sort/pagination/status filter/date filter; row + bulk selection; bulk actions; details drawer/modal; authorized status updates; confirmation before destructive actions; UI update after mutation; safe error handling.

## 14. Inventory Dashboard
Total/in-stock/low-stock/out-of-stock counts; low-stock alerts; inventory trends where available; filter by category/stock status; link to product management; visual warnings; prevent unauthorized modifications.

## 15. Product Analytics
Units sold, revenue, orders containing product, inventory status; sort by performance; date-range filter; navigate to product details; avoid expensive per-render queries; use optimized backend aggregation.

## 16. Appointment Dashboard
Upcoming/pending/confirmed/completed/cancelled; calendar/list/timeline views; date navigation; filter by service/status/date; detail drawer/modal; authorized status updates.

## 17. Service Analytics
Bookings, revenue, popular services, completion rate, cancellation rate; date filter; charts/tables; link to service management; respect business rules.

## 18. Customer Management
Name/email/registration date/order count/appointment count/total spending (authorized); search/filter/sort/pagination; detail view with order/appointment history and activity; protect sensitive data; enforce admin authz.

## 19. Review Management
Customer/product-service/rating/text/date/moderation status; search/filter/sort/pagination; authorized moderation; confirm destructive actions; update state after moderation.

## 20. Promotion Management
Name/discount type/value/dates/status; filter by status; search/sort; create/edit interfaces where in scope; validate data; prevent invalid/conflicting states.

## 21. Quick Actions
Add product, update inventory, view orders, manage appointments, add service, manage customers, review moderation, manage promotions; reusable components; respect permissions.

## 22. Interactive Charts
Approved charting solution; reusable components; line/bar/area/doughnut; tooltips/legends/responsive/accessible labels; avoid complexity; readable on mobile; backend aggregation for large datasets.

## 23. Global Filtering
Reusable filter components: date range, status, category, service, currency; predictable state; sync with API; avoid duplicate logic; preserve during navigation; reset on request.

## 24. Data Fetching
Dedicated API service modules; endpoints under `/api/v1/`; suggested customer endpoints (`GET /api/v1/dashboard/customer[...]`) and admin endpoints (`GET /api/v1/admin/dashboard[...]`); query params for date ranges/pagination/search/sort/filter/currency; standardized responses/errors; Pydantic validation; DB queries in service/repository layers.

## 25. Backend Dashboard Services
Dedicated service layer: customer dashboard, admin dashboard, analytics, notification services; reuse existing repositories; avoid duplicated logic; DB aggregation for metrics; optimize queries; indexes; transactions for mutations; authoritative financial calculations.

## 26. Database Optimization
Indexes for user ID, order status/date, appointment date/status, product stock, review status, promotion status; optimize aggregations; avoid N+1; avoid unnecessary columns; pagination; DB-level filter/sort; analyze slow queries.

## 27. State Management
Categories: auth, user, currency, notification, dashboard data, filter, UI state; avoid unnecessary global state; local state where appropriate; sync mutations with cache; prevent stale data; handle concurrency.

## 28. Loading States
Skeletons for KPI cards/tables/charts/appointment lists/activity feeds; no misleading zero values while loading; prevent layout shift; consistent patterns.

## 29. Empty States
Reusable component; messaging for no orders/appointments/empty wishlist/no notifications/no matching products/no analytics data/no matching customers; relevant action; no generic technical errors for normal empty states.

## 30. Error Handling
Consistent API error handling; user-friendly messages; handle network/401/403/validation/500/timeout; retry actions; prevent full-dashboard crashes from one component; approved logging.

## 31. Optimistic UI
Only for low-risk interactions (mark notification read, remove wishlist item, toggle simple preference); never for money/order-status/inventory/appointment confirmation; revert on failure.

## 32. Modal and Drawer System
Reusable Modal/Drawer; drawers for order/appointment/customer/product details; modals for confirmations/short forms/destructive actions; escape-to-close, focus management, keyboard nav, mobile sizing; prevent background interaction.

## 33. Responsive Design
Mobile-first where practical; mobile/tablet/desktop/large-desktop; tables→cards on small screens; charts resize; sidebar→drawer; filters collapse; modals/drawers fit small screens; avoid unnecessary horizontal scroll.

## 34. Accessibility
WCAG-oriented; semantic HTML; labels; keyboard nav; focus states; contrast; not color-alone status; accessible chart descriptions; meaningful names; dialogs trap focus; screen-reader-friendly structure.

## 35. Security
Auth + role-based authz enforced; never trust frontend role info; validate authz per endpoint; scope customer queries by user ID; restrict admin endpoints; prevent IDOR; validate query params; sanitize content; never expose passwords/tokens/secrets/payment info; rate limiting where supported; follow constitution.

## 36. Performance
Lazy-load large sections; avoid loading every admin module upfront; pagination; caching; avoid duplicate requests; debounce search; optimize charts/images/re-renders; backend aggregation; monitor response times; optimize slow queries.

## 37. API Caching and Refresh
Caching strategy for non-immediate-consistency data; refresh orders/appointments/inventory/notifications after relevant mutations; avoid aggressive polling; manual refresh; consider background refresh for summaries.

## 38. Testing Strategy
Backend: dashboard endpoints, authz, role restrictions, data isolation, date filters, pagination, sorting, search, currency, aggregations, error responses, empty/large datasets.
Frontend: rendering, responsive nav, sidebar collapse, mobile drawer, currency selector, notifications, filters, charts, tables, pagination, modals, drawers, loading/empty/error states.
Integration: frontend-FastAPI comms, auth flow, role-based access, customer/admin dashboard data, order/appointment/inventory/notification updates.
Accessibility: keyboard nav, focus, screen-reader labels, contrast, modal accessibility, responsive layouts.

## 39. Dashboard Acceptance Testing
Verify role-scoped access, data isolation, metric accuracy (orders/appointments/inventory/currency), filters/pagination/sorting/search, chart correctness, notification updates, responsive layouts, keyboard nav, loading/empty/error states.

## 40. Implementation Order
Phase 1: review architecture/auth/models/API conventions/routing.
Phase 2: dashboard backend services, customer + admin endpoints, authorization, aggregation queries.
Phase 3: shared shell (sidebar/header/responsive nav/global UI).
Phase 4: customer overview/KPI/orders/appointments/activity/wishlist.
Phase 5: admin overview/KPI/revenue/sales/order analytics.
Phase 6: admin order management/inventory/product analytics/appointment dashboard/service analytics.
Phase 7: customer management/review management/promotion management/admin quick actions.
Phase 8: notifications/currency/filters/search/sorting/pagination.
Phase 9: loading/empty/error states/optimistic interactions/modal-drawer system.
Phase 10: optimize backend queries/indexes/frontend rendering/caching/charts.
Phase 11: backend/frontend/integration/accessibility/responsive/security tests.
Phase 12: final QA, acceptance criteria, API security, customer/admin separation, production config, deployment prep.

## 41. Suggested Component Structure
Shared: DashboardLayout, Sidebar, DashboardHeader, Breadcrumbs, NotificationCenter, CurrencySelector, UserMenu, KpiCard, DataTable, FilterBar, DateRangePicker, SearchInput, Pagination, ChartCard, Modal, Drawer, EmptyState, LoadingSkeleton, ErrorState, ConfirmationDialog.
Customer: CustomerOverview, CustomerOrderList, CustomerOrderDetails, CustomerAppointmentList, CustomerAppointmentDetails, CustomerActivityFeed, CustomerWishlist.
Admin: AdminOverview, RevenueChart, SalesChart, OrderAnalytics, AdminOrderTable, InventoryOverview, LowStockAlert, ProductAnalytics, AppointmentCalendar, AppointmentAnalytics, ServiceAnalytics, CustomerTable, CustomerDetails, ReviewTable, PromotionTable, AdminQuickActions.

## 42. Suggested Backend Structure
`app/api/v1/dashboard/{customer.py,admin.py}`; `app/services/dashboard/{customer_dashboard.py,admin_dashboard.py,analytics.py}`; `app/repositories/{orders.py,appointments.py,products.py,customers.py,reviews.py,promotions.py}`; `app/schemas/dashboard/{customer,admin,analytics}` schemas. DB access outside route handlers; schemas separate from DB models; reuse existing domain services.

## 43. Observability
Log dashboard API failures; monitor API latency, DB query performance, error rates, auth/authz failures; avoid logging sensitive customer info; meaningful error context without secrets; monitor expensive analytics endpoints.

## 44. Production Readiness
Verify env vars, DB connection, auth config, CORS, API security, production URLs, frontend env config, error handling, logging, migrations, indexes, responsive behavior, accessibility, permissions, monitoring, backup/recovery strategy.

## 45. Definition of Done
Customer + admin dashboards fully implemented; routing/auth/authz correct; customer data isolation verified; admin-only data protected; dashboard APIs under `/api/v1/`; orders/appointments/inventory/analytics displayed correctly; charts interactive/responsive; search/filter/sort/pagination work; currency selector works for USD/GBP/PKR; notifications work; loading/empty/error states implemented; modals/drawers accessible; responsive across breakpoints; keyboard nav works; accessibility addressed; backend queries optimized; security satisfied; automated + integration tests pass; final QA complete; ready for production integration.

## Response snapshot

Ran `.specify/scripts/bash/setup-plan.sh --json` (branch already `003-interactive-dashboard` from the prior `/sp.specify` turn) and read both the existing `001-fish-shop-backend/plan.md` (for this project's actual plan-document conventions) and the real backend route files directly, rather than taking the plan input's suggested `/api/v1/dashboard/*` endpoint sketch at face value.

That direct read found the plan input's premise needs correcting: a route-by-route audit showed **13 of this feature's 15 user stories are already fully served by existing, already-tested backend endpoints** with zero new backend work — wishlist, notifications, admin orders/appointments/customers, reviews, promotions, and product/category/service CRUD all already exist, just with no frontend consumer yet. Building the parallel `/api/v1/dashboard/*` and `/api/v1/admin/dashboard/*` surface the plan input sketched would have duplicated all of that, violating the constitution's own "no duplicate logic" principle (§28) and the plan input's own "avoid introducing unnecessary architectural changes" line. Only three backend changes are actually needed, all documented in `contracts/`: one new endpoint (`GET /admin/dashboard/analytics`, date-range revenue/order analytics — nothing today computes this) and two small additive query-parameter extensions to existing endpoints, found by reading the actual route/service code rather than assuming: `GET /admin/orders` currently supports only `status`+pagination (FR-013 needs search/date/customer filters + sort), and `GET /products` doesn't expose stock counts or a stock-status filter in its list response (FR-015's inventory view needs both) even though the `Inventory` relationship is already eager-loaded there.

Also grounded the frontend side directly: `package.json` has exactly four dependencies (react, react-dom, react-router-dom, three) and zero chart/table/modal/date-picker libraries; every visual in this codebase so far (icons, placeholder art, currency formatting) is hand-rolled. research.md documents nine Decision/Rationale/Alternatives-considered entries on this basis: no new npm dependency for charts/tables/modals/drawers/date-range-picker (hand-rolled, matching existing convention); notification "unread" is `delivered_at == null` (an existing field already repurposed this way in `notification_service.mark_read`, found by reading it — no schema change needed); `/account` consolidates into `/dashboard` per the plan input's own suggested route shape, with `/account/login`/`/account/signup` unchanged; polling (not push) at 60s for notifications only, confirming the spec's Clarifications answer; Context (not TanStack Query) for state, continuing this session's and `002-frontend-integration`'s established reasoning.

Wrote `plan.md` (Technical Context, a 13-row Constitution Check — all PASS, no unjustified violations — Project Structure showing backend changes land in three *existing* files rather than a new module tree, and one Complexity Tracking entry justifying not adding a new frontend test harness in this plan), `data-model.md` (no new tables; two new `orders` indexes), `quickstart.md` (migration + manual smoke-test scripts for both dashboards, including the negative-authorization check), and four `contracts/` files (the new analytics endpoint; the two extended endpoints; a reused-endpoints-map.md mapping every one of the 15 user stories to its real backend endpoint(s) — the actual implementation reference). Ran `update-agent-context.sh claude`, then manually cleaned up its output in `CLAUDE.md` (the script's naive line-parser truncated the verbose Technical Context mid-sentence).

## Outcome

- ✅ Impact: `specs/003-interactive-dashboard/plan.md` and its Phase 0/1 artifacts are ready for `/sp.tasks`. The plan materially descopes backend risk versus what the plan input itself sketched — 3 backend changes instead of an implied ~13-endpoint parallel API surface — while still satisfying every FR in spec.md, because the audit found the real backend already covers almost all of it.
- 🧪 Tests: none (plan stage — no code changes); `plan.md`'s Technical Context and Constitution Check specify the testing approach `/sp.tasks` should schedule (backend contract tests for the 3 changes; this session's established live headless-browser walkthrough pattern for the frontend).
- 📁 Files: `specs/003-interactive-dashboard/{plan.md,research.md,data-model.md,quickstart.md}`, `specs/003-interactive-dashboard/contracts/{analytics.md,admin-orders-extended.md,products-inventory-extended.md,reused-endpoints-map.md}`, `CLAUDE.md` (agent context, cleaned up post-script), this PHR.
- 🔁 Next prompts: `/sp.tasks` to break this into dependency-ordered, testable tasks — given the size (15 user stories, 4 new shared frontend components, 3 backend changes), tasks.md should probably group by the same phases `plan.md`'s Project Structure implies (shell + shared components first, then per-story pages) rather than literally the user's 12-phase input, since several of those phases (e.g., "Phase 10: optimize queries/caching/charts") are cross-cutting polish better folded into each story's own tasks than a separate late phase.
- 🧠 Reflection: The single highest-value thing this planning pass did was refuse to trust the plan input's illustrative endpoint list and instead read the actual route files — every one of the "13 stories already covered" findings would have been invisible from the spec/plan documents alone and would have led to real duplicate-endpoint work if taken at face value.

## Evaluation notes (flywheel)

- Failure modes observed: none new this turn; continues the pattern from the `/sp.specify` PHR of verifying backend claims against actual source rather than the user-supplied plan text, which is advisory/illustrative even when it reads as prescriptive (e.g., literal endpoint paths).
- Graders run and results (PASS/FAIL): Constitution Check — PASS (13/13 rows, no unjustified violations); Post-Design Constitution Check re-verification — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): When `/sp.tasks` runs, explicitly cross-check each generated task against `contracts/reused-endpoints-map.md` before writing it, so no task accidentally re-specifies building an endpoint that row already marks "Existing."
