---
id: 0003
title: Interactive Dashboard task breakdown
stage: tasks
date: 2026-09-24
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.tasks
labels: ["dashboard", "tasks", "reused-endpoints", "user-story-organized", "mvp"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-interactive-dashboard/tasks.md
tests:
 - none
---

## Prompt

# Tasks: Interactive Customer & Admin Dashboard

## Phase 1 — Project Analysis & Dashboard Foundation

*   Review the existing project constitution.

*   Review the dashboard `sp.specify.md`.

*   Review the dashboard `sp.plan.md`.

*   Review the existing frontend architecture.

*   Review the existing FastAPI backend architecture.

*   Review existing authentication and authorization implementation.

*   Review existing database models.

*   Review existing API conventions.

*   Review existing user roles.

*   Review existing currency system.

*   Review existing order system.

*   Review existing appointment system.

*   Review existing product and inventory system.

*   Review existing notification system.

*   Review existing review and promotion systems.

*   Confirm reusable components already available in the project.

*   Define dashboard implementation boundaries.

*   Create dashboard feature/module structure.

*   Confirm customer and admin route separation.

*   Confirm protected route strategy.

*   Confirm API service architecture.

*   Confirm dashboard state-management strategy.

* * *

# Phase 2 — Backend Dashboard Architecture

## Dashboard API Structure

*   Create dashboard API module structure.

*   Create customer dashboard API module.

*   Create admin dashboard API module.

*   Create dashboard schema module.

*   Create dashboard service module.

*   Create analytics service module.

*   Connect dashboard services with existing repositories/services.

*   Follow `/api/v1/` API versioning.

## Customer Dashboard APIs

*   Implement `GET /api/v1/dashboard/customer`.

*   Implement `GET /api/v1/dashboard/customer/orders`.

*   Implement `GET /api/v1/dashboard/customer/appointments`.

*   Implement `GET /api/v1/dashboard/customer/activity`.

*   Add authentication requirements.

*   Restrict customer data to authenticated user.

*   Add pagination where required.

*   Add sorting where required.

*   Add filtering where required.

*   Add date-range filtering where required.

*   Add validation for all query parameters.

## Admin Dashboard APIs

*   Implement `GET /api/v1/admin/dashboard`.

*   Implement `GET /api/v1/admin/dashboard/sales`.

*   Implement `GET /api/v1/admin/dashboard/orders`.

*   Implement `GET /api/v1/admin/dashboard/inventory`.

*   Implement `GET /api/v1/admin/dashboard/appointments`.

*   Implement `GET /api/v1/admin/dashboard/services`.

*   Implement `GET /api/v1/admin/dashboard/customers`.

*   Add admin authorization.

*   Prevent non-admin users from accessing admin APIs.

*   Add pagination.

*   Add filtering.

*   Add sorting.

*   Add search parameters.

*   Add date-range parameters.

* * *

# Phase 3 — Backend Dashboard Services

## Customer Dashboard Service

*   Create customer dashboard service.

*   Aggregate customer order metrics.

*   Aggregate active order metrics.

*   Aggregate appointment metrics.

*   Retrieve upcoming appointments.

*   Retrieve recent orders.

*   Retrieve customer activity.

*   Retrieve wishlist information.

*   Retrieve notification information where required.

*   Return dashboard data using dedicated response schemas.

## Admin Dashboard Service

*   Create admin dashboard service.

*   Aggregate total revenue.

*   Aggregate order counts.

*   Aggregate customer counts.

*   Aggregate appointment counts.

*   Aggregate product counts.

*   Aggregate low-stock products.

*   Aggregate pending orders.

*   Aggregate pending appointments.

*   Return dashboard summary data.

## Analytics Service

*   Create reusable analytics service.

*   Implement revenue aggregation.

*   Implement sales aggregation.

*   Implement order-status aggregation.

*   Implement product-performance aggregation.

*   Implement inventory aggregation.

*   Implement appointment aggregation.

*   Implement service-performance aggregation.

*   Implement customer aggregation.

*   Support date ranges.

*   Support currency display requirements.

* * *

# Phase 4 — Database Optimization

*   Review dashboard-related database queries.

*   Identify expensive queries.

*   Identify potential N+1 queries.

*   Optimize dashboard aggregation queries.

*   Add indexes for user IDs where required.

*   Add indexes for order dates.

*   Add indexes for order statuses.

*   Add indexes for appointment dates.

*   Add indexes for appointment statuses.

*   Add indexes for product stock status.

*   Add indexes for review status.

*   Add indexes for promotion status.

*   Optimize customer search queries.

*   Optimize order search queries.

*   Optimize appointment queries.

*   Verify query performance with realistic data volumes.

* * *

# Phase 5 — Dashboard Routing

## Customer Routes

*   Create `/dashboard` route.

*   Create `/dashboard/orders`.

*   Create `/dashboard/appointments`.

*   Create `/dashboard/wishlist`.

*   Create `/dashboard/profile`.

*   Create `/dashboard/notifications`.

*   Add protected route handling.

*   Redirect unauthenticated users appropriately.

*   Prevent customer access to admin routes.

## Admin Routes

*   Create `/admin`.

*   Create `/admin/orders`.

*   Create `/admin/products`.

*   Create `/admin/inventory`.

*   Create `/admin/appointments`.

*   Create `/admin/customers`.

*   Create `/admin/services`.

*   Create `/admin/reviews`.

*   Create `/admin/promotions`.

*   Add admin-only route protection.

*   Redirect unauthorized users appropriately.

* * *

# Phase 6 — Dashboard Application Shell

*   Create `DashboardLayout`.

*   Create `Sidebar`.

*   Create `DashboardHeader`.

*   Create main dashboard content container.

*   Create breadcrumb component.

*   Implement active navigation states.

*   Implement desktop sidebar.

*   Implement collapsible sidebar.

*   Implement mobile sidebar drawer.

*   Add drawer overlay.

*   Add sidebar keyboard interactions.

*   Add accessible navigation labels.

*   Preserve appropriate navigation state.

* * *

# Phase 7 — Global Header

*   Implement global search input.

*   Implement search interaction.

*   Add search suggestions where supported.

*   Connect search to relevant API endpoints.

*   Implement currency selector.

*   Implement notification button.

*   Implement unread notification counter.

*   Implement user profile menu.

*   Implement theme control if included.

*   Make header responsive.

*   Prevent mobile header overflow.

*   Add keyboard accessibility.

* * *

# Phase 8 — Currency Selector

*   Create `CurrencySelector`.

*   Add USD option.

*   Add GBP option.

*   Add PKR option.

*   Connect selector to currency state.

*   Connect currency state to dashboard API requests.

*   Update dashboard monetary values when currency changes.

*   Implement currency formatting.

*   Handle currency loading state.

*   Handle currency conversion errors.

*   Preserve selected currency where appropriate.

*   Ensure backend remains authoritative for financial calculations.

* * *

# Phase 9 — Notification Center

*   Create notification state.

*   Create notification API integration.

*   Create `NotificationCenter`.

*   Display unread notifications.

*   Display read notifications.

*   Display timestamps.

*   Display notification types.

*   Implement mark-as-read.

*   Implement mark-as-unread where supported.

*   Implement mark-all-as-read.

*   Implement notification navigation.

*   Update unread counter after mutations.

*   Implement notification loading state.

*   Implement notification empty state.

*   Implement notification error state.

* * *

# Phase 10 — Shared Dashboard Components

*   Create `KpiCard`.

*   Create `DataTable`.

*   Create `FilterBar`.

*   Create `DateRangePicker`.

*   Create `SearchInput`.

*   Create `Pagination`.

*   Create `ChartCard`.

*   Create `Modal`.

*   Create `Drawer`.

*   Create `EmptyState`.

*   Create `LoadingSkeleton`.

*   Create `ErrorState`.

*   Create `ConfirmationDialog`.

*   Ensure components are reusable.

*   Ensure components support responsive layouts.

*   Ensure components meet accessibility requirements.

* * *

# Phase 11 — Customer Dashboard Overview

*   Create `CustomerOverview`.

*   Connect customer dashboard API.

*   Display personalized welcome section.

*   Display total orders KPI.

*   Display active orders KPI.

*   Display upcoming appointments KPI.

*   Display wishlist KPI.

*   Display recent orders.

*   Display upcoming appointments.

*   Display recent activity.

*   Display quick actions.

*   Implement loading state.

*   Implement empty state.

*   Implement error state.

* * *

# Phase 12 — Customer Orders

*   Create customer order list.

*   Connect customer orders API.

*   Display order number.

*   Display order date.

*   Display order status.

*   Display payment status.

*   Display order total.

*   Display item count.

*   Implement order search.

*   Implement order filtering.

*   Implement order sorting.

*   Implement pagination.

*   Implement responsive mobile order cards.

*   Create customer order details view.

*   Display order products.

*   Display quantities.

*   Display pricing.

*   Display discounts.

*   Display taxes.

*   Display shipping.

*   Display total.

*   Display payment status.

*   Display fulfillment status.

*   Display order timeline.

*   Verify customer cannot access another customer's order.

* * *

# Phase 13 — Customer Appointments

*   Create customer appointment list.

*   Connect customer appointment API.

*   Display service name.

*   Display appointment date.

*   Display appointment time.

*   Display appointment status.

*   Display location.

*   Display assigned staff where applicable.

*   Create calendar view.

*   Create list view.

*   Create timeline view where applicable.

*   Implement appointment filtering.

*   Implement appointment navigation.

*   Implement appointment detail view.

*   Implement cancellation behavior according to business rules.

*   Implement rescheduling behavior according to business rules.

*   Add confirmation dialogs where required.

* * *

# Phase 14 — Customer Activity Feed

*   Create `CustomerActivityFeed`.

*   Connect activity API.

*   Display order events.

*   Display appointment events.

*   Display review events.

*   Display promotion events.

*   Display relevant account events.

*   Sort activity chronologically.

*   Format timestamps.

*   Implement loading state.

*   Implement empty state.

*   Implement error state.

* * *

# Phase 15 — Customer Wishlist

*   Create customer wishlist page/component.

*   Connect wishlist data.

*   Display product image.

*   Display product name.

*   Display price.

*   Display availability.

*   Implement remove-from-wishlist.

*   Implement add-to-cart.

*   Implement product navigation.

*   Display out-of-stock state.

*   Add loading state.

*   Add empty state.

*   Add error handling.

*   Update UI after wishlist mutations.

* * *

# Phase 16 — Customer Quick Actions

*   Create quick-action component.

*   Add browse-products action.

*   Add view-orders action.

*   Add book-service action.

*   Add view-appointments action.

*   Add wishlist action.

*   Add profile action.

*   Verify each action navigates correctly.

*   Ensure actions are keyboard accessible.

* * *

# Phase 17 — Admin Dashboard Overview

*   Create `AdminOverview`.

*   Connect admin dashboard API.

*   Display revenue KPI.

*   Display order KPI.

*   Display customer KPI.

*   Display appointment KPI.

*   Display product KPI.

*   Display low-stock KPI.

*   Display pending-order information.

*   Display pending-appointment information.

*   Add date-range selector.

*   Add custom date range support.

*   Implement loading state.

*   Implement empty state.

*   Implement error state.

* * *

# Phase 18 — Admin KPI System

*   Create reusable admin KPI cards.

*   Implement total revenue card.

*   Implement total orders card.

*   Implement average order value card.

*   Implement new customers card.

*   Implement pending appointments card.

*   Implement low-stock products card.

*   Add current-period values.

*   Add previous-period values where supported.

*   Add comparison percentage where supported.

*   Handle zero-value comparisons.

*   Handle unavailable comparison data.

*   Ensure KPI calculations match backend values.

* * *

# Phase 19 — Revenue Analytics

*   Create revenue analytics component.

*   Connect sales/revenue API.

*   Implement daily revenue view.

*   Implement weekly revenue view.

*   Implement monthly revenue view.

*   Implement date-range selection.

*   Implement currency selection.

*   Add interactive tooltips.

*   Add chart legends where required.

*   Add responsive chart behavior.

*   Implement empty chart state.

*   Implement loading state.

*   Implement error state.

*   Verify chart values against backend data.

* * *

# Phase 20 — Sales Analytics

*   Create sales analytics component.

*   Display revenue.

*   Display order count.

*   Display units sold.

*   Display average order value.

*   Add date filtering.

*   Add product/service filtering where supported.

*   Add interactive chart behavior.

*   Add tooltips.

*   Add responsive behavior.

*   Validate analytics against backend aggregation.

* * *

# Phase 21 — Order Analytics

*   Create order analytics component.

*   Display total orders.

*   Display pending orders.

*   Display processing orders.

*   Display completed orders.

*   Display cancelled orders.

*   Create order-status distribution chart.

*   Add date filtering.

*   Add interactive chart behavior.

*   Link analytics to order management.

*   Verify data accuracy.

* * *

# Phase 22 — Admin Order Management

*   Create `AdminOrderTable`.

*   Connect admin orders API.

*   Display order ID.

*   Display customer.

*   Display date.

*   Display status.

*   Display payment status.

*   Display total.

*   Implement search.

*   Implement filtering.

*   Implement sorting.

*   Implement pagination.

*   Implement row selection.

*   Implement bulk selection.

*   Implement allowed bulk actions.

*   Create order detail drawer.

*   Create order detail view.

*   Implement authorized status updates.

*   Add confirmation for sensitive actions.

*   Refresh order data after mutations.

*   Handle mutation failures.

* * *

# Phase 23 — Inventory Dashboard

*   Create inventory overview.

*   Connect inventory API.

*   Display total products.

*   Display in-stock products.

*   Display low-stock products.

*   Display out-of-stock products.

*   Create low-stock alert component.

*   Implement stock-status filtering.

*   Implement category filtering.

*   Link inventory items to products.

*   Add inventory loading state.

*   Add inventory error state.

*   Add empty state.

*   Verify inventory values against database.

* * *

# Phase 24 — Product Analytics

*   Create product analytics component.

*   Display units sold.

*   Display product revenue.

*   Display order count.

*   Display inventory status.

*   Implement date filtering.

*   Implement sorting.

*   Implement product-performance ranking within the dashboard's descriptive display.

*   Link analytics to product details.

*   Optimize product analytics API.

*   Verify aggregation accuracy.

* * *

# Phase 25 — Admin Appointment Dashboard

*   Create admin appointment dashboard.

*   Connect appointment API.

*   Display upcoming appointments.

*   Display pending appointments.

*   Display confirmed appointments.

*   Display completed appointments.

*   Display cancelled appointments.

*   Create calendar view.

*   Create list view.

*   Create timeline view.

*   Implement date navigation.

*   Implement service filtering.

*   Implement status filtering.

*   Implement date filtering.

*   Create appointment detail drawer.

*   Implement authorized status updates.

*   Add confirmation where required.

* * *

# Phase 26 — Service Analytics

*   Create service analytics component.

*   Connect service analytics API.

*   Display booking count.

*   Display service revenue.

*   Display popular services.

*   Display appointment completion information.

*   Add date filtering.

*   Create charts/tables.

*   Link analytics to service management.

*   Verify calculations against appointment/order data.

* * *

# Phase 27 — Customer Management

*   Create admin customer table.

*   Connect customer dashboard API.

*   Display customer name.

*   Display email.

*   Display registration date.

*   Display order count.

*   Display appointment count.

*   Display total spending where authorized.

*   Implement customer search.

*   Implement customer filtering.

*   Implement sorting.

*   Implement pagination.

*   Create customer detail view.

*   Display customer order history.

*   Display appointment history.

*   Display relevant activity.

*   Protect sensitive customer information.

*   Verify admin authorization.

* * *

# Phase 28 — Review Management

*   Create review management table.

*   Connect review API.

*   Display customer.

*   Display product/service.

*   Display rating.

*   Display review text.

*   Display review date.

*   Display moderation status.

*   Implement search.

*   Implement filtering.

*   Implement sorting.

*   Implement pagination.

*   Implement authorized moderation actions.

*   Add moderation confirmation.

*   Refresh review data after moderation.

*   Handle moderation errors.

* * *

# Phase 29 — Promotion Management

*   Create promotion management interface.

*   Connect promotion API.

*   Display promotion name.

*   Display discount type.

*   Display discount value.

*   Display start date.

*   Display end date.

*   Display promotion status.

*   Implement status filtering.

*   Implement search.

*   Implement sorting.

*   Implement pagination.

*   Implement create/edit functionality if included in project scope.

*   Validate promotion data.

*   Prevent invalid promotion states.

*   Add confirmation for destructive actions.

* * *

# Phase 30 — Admin Quick Actions

*   Create admin quick-action component.

*   Add add-product action.

*   Add inventory action.

*   Add order-management action.

*   Add appointment-management action.

*   Add service-management action.

*   Add customer-management action.

*   Add review-management action.

*   Add promotion-management action.

*   Verify role permissions for every action.

* * *

# Phase 31 — Global Filters

*   Create reusable dashboard filter system.

*   Implement date-range filter.

*   Implement status filter.

*   Implement category filter.

*   Implement service filter.

*   Implement currency filter where required.

*   Connect filter state to API requests.

*   Prevent duplicated filter logic.

*   Implement filter reset.

*   Preserve filters where appropriate.

*   Test filter combinations.

* * *

# Phase 32 — Search, Sorting & Pagination

*   Create reusable search input.

*   Implement debounced search.

*   Add customer search.

*   Add order search.

*   Add product search.

*   Add appointment search where required.

*   Add review search.

*   Implement reusable sorting.

*   Implement reusable pagination.

*   Validate page size.

*   Validate page number.

*   Handle no-results state.

*   Verify backend pagination metadata.

* * *

# Phase 33 — Modal & Drawer System

*   Implement reusable modal.

*   Implement reusable drawer.

*   Add order detail drawer.

*   Add appointment detail drawer.

*   Add customer detail drawer.

*   Add product information drawer where required.

*   Add confirmation dialogs.

*   Implement Escape-to-close.

*   Implement focus trapping.

*   Implement keyboard navigation.

*   Implement responsive mobile behavior.

*   Prevent background interaction when appropriate.

* * *

# Phase 34 — Loading States

*   Create reusable dashboard skeleton.

*   Create KPI skeleton.

*   Create table skeleton.

*   Create chart skeleton.

*   Create appointment skeleton.

*   Create activity-feed skeleton.

*   Prevent layout shifts.

*   Ensure loading states do not display misleading values.

*   Verify loading behavior for slow API responses.

* * *

# Phase 35 — Empty States

*   Create reusable empty-state component.

*   Add no-orders state.

*   Add no-appointments state.

*   Add empty-wishlist state.

*   Add no-notifications state.

*   Add no-search-results state.

*   Add no-analytics-data state.

*   Add no-customer-results state.

*   Add no-inventory-results state.

*   Add appropriate actions where applicable.

* * *

# Phase 36 — Error Handling

*   Create centralized dashboard API error handling.

*   Handle network errors.

*   Handle unauthorized errors.

*   Handle forbidden errors.

*   Handle validation errors.

*   Handle server errors.

*   Handle timeout errors.

*   Display user-friendly messages.

*   Add retry actions where appropriate.

*   Prevent individual dashboard components from crashing the entire dashboard.

*   Log unexpected errors using the project's approved logging system.

* * *

# Phase 37 — Optimistic Interactions

*   Identify safe optimistic interactions.

*   Implement optimistic notification read state.

*   Implement optimistic wishlist removal where appropriate.

*   Implement optimistic UI preferences where applicable.

*   Avoid optimistic financial mutations.

*   Avoid optimistic inventory mutations.

*   Avoid optimistic appointment confirmation.

*   Avoid optimistic consequential order-status changes.

*   Implement rollback on failed optimistic requests.

* * *

# Phase 38 — Responsive UI

*   Test mobile dashboard layout.

*   Test tablet dashboard layout.

*   Test desktop dashboard layout.

*   Test large-screen dashboard layout.

*   Convert wide tables to mobile-friendly cards where appropriate.

*   Test responsive charts.

*   Test mobile sidebar drawer.

*   Test mobile filter panel.

*   Test responsive modals.

*   Test responsive drawers.

*   Remove unintended horizontal overflow.

*   Verify touch targets.

* * *

# Phase 39 — Accessibility

*   Add semantic HTML.

*   Add accessible labels.

*   Add keyboard navigation.

*   Add visible focus states.

*   Verify color contrast.

*   Ensure status is not communicated by color alone.

*   Add accessible chart descriptions.

*   Verify icon-only buttons have labels.

*   Verify modal focus management.

*   Verify drawer focus management.

*   Verify screen-reader navigation.

*   Test dashboard with keyboard only.

* * *

# Phase 40 — Security

*   Protect customer dashboard routes.

*   Protect admin dashboard routes.

*   Enforce backend authentication.

*   Enforce backend authorization.

*   Validate role permissions server-side.

*   Scope customer queries by authenticated user.

*   Prevent IDOR vulnerabilities.

*   Validate query parameters.

*   Validate request bodies.

*   Prevent unauthorized order access.

*   Prevent unauthorized appointment access.

*   Prevent unauthorized customer-data access.

*   Prevent unauthorized inventory modifications.

*   Prevent unauthorized review moderation.

*   Prevent unauthorized promotion management.

*   Ensure secrets are never returned to frontend.

*   Ensure sensitive information is not logged.

* * *

# Phase 41 — Frontend State Management

*   Define authentication state.

*   Define user state.

*   Define currency state.

*   Define notification state.

*   Define dashboard data state.

*   Define filter state.

*   Define UI state.

*   Keep page-specific state local where appropriate.

*   Avoid unnecessary global state.

*   Synchronize API mutations with dashboard data.

*   Prevent stale dashboard information.

*   Handle concurrent API requests safely.

* * *

# Phase 42 — API Caching & Refresh

*   Identify dashboard data suitable for caching.

*   Implement appropriate caching strategy.

*   Avoid duplicate API requests.

*   Refresh order data after order mutations.

*   Refresh appointment data after appointment mutations.

*   Refresh inventory after inventory changes.

*   Refresh notifications after notification mutations.

*   Add manual refresh where useful.

*   Avoid unnecessary polling.

*   Add background refresh only where appropriate.

* * *

# Phase 43 — Performance Optimization

*   Lazy-load large dashboard sections.

*   Lazy-load admin modules where appropriate.

*   Optimize API requests.

*   Prevent duplicate requests.

*   Debounce search.

*   Optimize database queries.

*   Optimize chart rendering.

*   Optimize image loading.

*   Reduce unnecessary component re-renders.

*   Use backend aggregation for analytics.

*   Test dashboard response times.

*   Identify and resolve slow endpoints.

* * *

# Phase 44 — Backend Testing

*   Test customer dashboard endpoint.

*   Test customer orders endpoint.

*   Test customer appointments endpoint.

*   Test customer activity endpoint.

*   Test admin dashboard endpoint.

*   Test sales endpoint.

*   Test admin orders endpoint.

*   Test inventory endpoint.

*   Test appointments endpoint.

*   Test services endpoint.

*   Test customers endpoint.

*   Test authentication.

*   Test authorization.

*   Test customer data isolation.

*   Test pagination.

*   Test sorting.

*   Test filtering.

*   Test search.

*   Test currency handling.

*   Test dashboard aggregations.

*   Test empty datasets.

*   Test large datasets.

*   Test API error responses.

* * *

# Phase 45 — Frontend Testing

*   Test dashboard layout.

*   Test sidebar.

*   Test mobile navigation.

*   Test header.

*   Test global search.

*   Test currency selector.

*   Test notification center.

*   Test KPI cards.

*   Test charts.

*   Test tables.

*   Test filters.

*   Test sorting.

*   Test pagination.

*   Test modals.

*   Test drawers.

*   Test loading states.

*   Test empty states.

*   Test error states.

*   Test customer dashboard.

*   Test admin dashboard.

* * *

# Phase 46 — Integration Testing

*   Test frontend-to-FastAPI integration.

*   Test authentication flow.

*   Test customer dashboard flow.

*   Test admin dashboard flow.

*   Test customer order retrieval.

*   Test admin order retrieval.

*   Test order-status update.

*   Test appointment retrieval.

*   Test appointment-status update.

*   Test inventory retrieval.

*   Test notification updates.

*   Test currency switching.

*   Test search.

*   Test filtering.

*   Test pagination.

*   Test role-based route protection.

* * *

# Phase 47 — Accessibility Testing

*   Test keyboard navigation.

*   Test focus management.

*   Test modal focus trapping.

*   Test drawer focus trapping.

*   Test screen-reader labels.

*   Test icon-only buttons.

*   Test chart accessibility.

*   Test color contrast.

*   Test responsive accessibility.

*   Test form accessibility.

*   Test error-message accessibility.

* * *

# Phase 48 — Security Testing

*   Test unauthenticated dashboard access.

*   Test customer attempting admin access.

*   Test customer attempting another customer's data access.

*   Test unauthorized order access.

*   Test unauthorized appointment access.

*   Test unauthorized inventory mutation.

*   Test unauthorized review moderation.

*   Test unauthorized promotion management.

*   Test malicious query parameters.

*   Test invalid pagination parameters.

*   Test invalid filtering parameters.

*   Test API authorization on every protected endpoint.

*   Verify sensitive data is not exposed.

* * *

# Phase 49 — Responsive & Cross-Device QA

*   Test mobile layout.

*   Test tablet layout.

*   Test desktop layout.

*   Test large desktop layout.

*   Test sidebar behavior.

*   Test header behavior.

*   Test charts.

*   Test tables.

*   Test filters.

*   Test modals.

*   Test drawers.

*   Test touch interactions.

*   Test keyboard interactions.

*   Test different viewport widths.

*   Verify no unintended horizontal overflow.

* * *

# Phase 50 — Data Accuracy QA

*   Compare dashboard revenue against source order data.

*   Compare order counts against source order records.

*   Compare appointment counts against appointment records.

*   Compare inventory counts against product inventory.

*   Compare customer counts against user/customer records.

*   Compare service analytics against appointment/service records.

*   Verify currency conversions.

*   Verify displayed totals.

*   Verify date-range calculations.

*   Verify period comparisons.

*   Verify chart values.

*   Verify KPI values.

* * *

# Phase 51 — Production Configuration

*   Configure production API URL.

*   Configure production database connection.

*   Configure authentication environment variables.

*   Configure CORS.

*   Configure frontend environment variables.

*   Verify production database migrations.

*   Verify required indexes.

*   Verify logging configuration.

*   Verify error handling.

*   Verify security configuration.

*   Verify monitoring.

*   Verify backup/recovery dependencies.

*   Verify deployment configuration.

* * *

# Phase 52 — Final Dashboard QA

*   Verify all customer dashboard routes.

*   Verify all admin dashboard routes.

*   Verify all dashboard APIs.

*   Verify authentication.

*   Verify authorization.

*   Verify customer data isolation.

*   Verify admin permissions.

*   Verify orders.

*   Verify appointments.

*   Verify inventory.

*   Verify analytics.

*   Verify notifications.

*   Verify currency selector.

*   Verify search.

*   Verify filters.

*   Verify sorting.

*   Verify pagination.

*   Verify charts.

*   Verify loading states.

*   Verify empty states.

*   Verify error states.

*   Verify responsive layouts.

*   Verify accessibility.

*   Verify security.

*   Verify performance.

* * *

# Phase 53 — Definition of Done

*   Customer dashboard is implemented.

*   Admin dashboard is implemented.

*   Dashboard routes are protected.

*   Backend authorization is enforced.

*   Customer data isolation is verified.

*   Admin-only functionality is protected.

*   Dashboard APIs are implemented under `/api/v1/`.

*   Customer dashboard APIs are working.

*   Admin dashboard APIs are working.

*   Orders are displayed correctly.

*   Appointments are displayed correctly.

*   Inventory is displayed correctly.

*   Analytics are displayed correctly.

*   Charts are interactive.

*   Search works correctly.

*   Filtering works correctly.

*   Sorting works correctly.

*   Pagination works correctly.

*   USD currency display works.

*   GBP currency display works.

*   PKR currency display works.

*   Notifications work correctly.

*   Loading states are implemented.

*   Empty states are implemented.

*   Error states are implemented.

*   Modals are implemented.

*   Drawers are implemented.

*   Responsive layouts work.

*   Keyboard navigation works.

*   Accessibility requirements are addressed.

*   Database queries are optimized.

*   Security requirements are satisfied.

*   Backend tests pass.

*   Frontend tests pass.

*   Integration tests pass.

*   Accessibility tests pass.

*   Security tests pass.

*   Final QA is complete.

*   Dashboard is ready for production integration.

## Response snapshot

Ran `.specify/scripts/bash/check-prerequisites.sh --json` (confirmed `AVAILABLE_DOCS`: research.md, data-model.md, contracts/, quickstart.md) and re-read `.specify/templates/tasks-template.md` for the required structure and strict checklist format (`- [ ] [TaskID] [P?] [Story?] Description with file path`).

The 53-phase input above is organized as cross-cutting technical layers (routing, then shell, then each shared component type, then testing types, then QA types), which does not match either the tasks template's mandated structure or this project's own `/sp.tasks` command contract, both of which require organizing by independently-shippable user story. It also assumes a parallel `/api/v1/dashboard/*` and `/api/v1/admin/dashboard/*` backend surface (Phase 2's 11 new endpoints) that `plan.md`/`research.md` already rejected after reading the actual backend source — 13 of 15 user stories are served by existing, tested endpoints (`contracts/reused-endpoints-map.md`), and only 3 backend changes are real work (`contracts/analytics.md`, `contracts/admin-orders-extended.md`, `contracts/products-inventory-extended.md`).

So `tasks.md` was generated using the phase input as a checklist of *concerns to cover* (shell, header, currency, notifications, each shared component, each dashboard section, loading/empty/error states, optimistic UI, responsive/accessibility/security, testing) rather than as the literal phase structure, and instead organized around spec.md's 15 user stories per the template's actual contract: Phase 1 Setup (dependency pre-flight — no new npm/pip packages needed, confirming research.md §5/§6) → Phase 2 Foundational (blocking shared work: the 2 new order indexes; the 4 shared components — Modal/Drawer/DataTable/DateRangePicker; `RequireCustomerAuth`/`RequireAdminAuth` route guards refactored out of the existing inline admin check; `Sidebar`/`DashboardHeader`/`DashboardLayout` shell; `/dashboard` and `/admin` nested routing) → Phase 3–17 one phase per user story in spec.md's priority order (US1/US2/US3 P1 = MVP; US4/US5/US6/US7/US8/US9/US14 P2; US10/US11/US12/US13/US15 P3), each with concrete file-path tasks cross-referenced against `contracts/reused-endpoints-map.md` so no task re-specifies an endpoint that row already marks "Existing" — only US3, US7 (the new analytics endpoint), and US8 get backend tasks, each preceded by a `[P]` contract-test task written to fail first → Phase 18 Polish (responsive/accessibility passes, quickstart.md's smoke test, README site-map update, dead-code cleanup from the `/account`→`/dashboard` consolidation). Each story phase ends with a "Live-browser verify" task following this session's established Chrome/playwright-core-against-Render pattern, since no frontend test harness exists yet (plan.md's Complexity Tracking justification) — this substitutes for a formal Vitest/RTL task per story. Total: 111 numbered tasks (T001–T111) across 18 phases, plus Dependencies & Execution Order, Parallel Opportunities, and a solo-implementer Implementation Strategy section (the template's team-oriented "parallel opportunities" reframed as task-ordering guidance for a single agent/session).

## Outcome

- ✅ Impact: `specs/003-interactive-dashboard/tasks.md` is ready to drive implementation. MVP scope is explicitly Phase 1–5 (Setup, Foundational, US1, US2, US3 = T001–T036); everything after is incremental by priority tier.
- 🧪 Tests: none this stage (tasks-generation only); `tasks.md` itself schedules backend contract tests for US3/US7/US8 (T026, T052, T064) and a live-browser verification task at the end of every user-story phase.
- 📁 Files: `specs/003-interactive-dashboard/tasks.md`, this PHR.
- 🔁 Next prompts: Begin implementation at Phase 1 (T001–T002), then Phase 2 Foundational (T003–T016) — the shared shell/components everything else depends on — before touching any user-story phase.
- 🧠 Reflection: The highest-value move here was refusing the phase input's literal cross-cutting structure (which would produce a tasks.md un-shippable until nearly every phase finished) in favor of the template's user-story organization, while still using the input's phase list as a completeness checklist so nothing it named (optimistic-UI rules, empty/loading/error states, accessibility, security) got dropped — those concerns are now embedded inside each story's tasks and the Polish phase instead of living in 53 separate un-orderable phases.

## Evaluation notes (flywheel)

- Failure modes observed: none new; continues this feature's established pattern (see PHR 0001, 0002) of treating slash-command input text as illustrative/advisory rather than a literal spec to transcribe, and verifying every "new endpoint" claim in the input against `contracts/reused-endpoints-map.md` before writing a task for it.
- Graders run and results (PASS/FAIL): Format validation — PASS (every task line matches `- [ ] [TaskID] [P?] [Story?] Description`); story-independence check — PASS (each user-story phase's tasks + Live-browser-verify task are self-contained given Foundational is done); reused-endpoint cross-check — PASS (only US3/US7/US8 carry backend tasks, matching `contracts/reused-endpoints-map.md`'s "Extended"/"New" rows).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): When implementation begins, verify after Phase 2 (Foundational) that `RequireAdminAuth` genuinely subsumes `AdminDashboard.jsx`'s existing inline auth check before deleting it, rather than assuming the refactor is safe from the task description alone.
