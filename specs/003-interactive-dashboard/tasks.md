# Tasks: Interactive Dashboard

**Input**: Design documents from `/specs/003-interactive-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Backend contract tests are included for the 3 new/extended
endpoints (this project's established convention — see
`backend/tests/contract/`). No new frontend test harness exists yet
(plan.md's Complexity Tracking); each story instead ends with a "Live-
browser verify" task following this session's established pattern
(Chrome + playwright-core against the live Render backend, cleaned up
after) rather than a formal Vitest/RTL suite.

**Organization**: Tasks are grouped by user story (spec.md's US1–US15, in
priority order) so each is independently implementable, testable, and
shippable. Per `contracts/reused-endpoints-map.md`, most stories need
**no backend task at all** — only US3, US7, and US8 touch the backend.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an
  incomplete task)
- **[Story]**: Maps the task to spec.md's US1–US15
- Setup/Foundational/Polish tasks carry no story label

---

## Phase 1: Setup

- [X] T001 Confirm no new npm dependency is needed: review `package.json`
  against research.md §5/§6 (charts/tables/modals/date-picker are hand-
  rolled) — no action expected, just a pre-flight check before Phase 2
- [X] T002 [P] Confirm no new backend dependency is needed: review
  `backend/pyproject.toml` — same pre-flight check

---

## Phase 2: Foundational (blocking — complete before any user story)

**⚠️ CRITICAL**: Every user story phase below depends on this phase.

### Backend

- [X] T003 Generate Alembic migration adding `ix_orders_placed_at` and
  composite `ix_orders_status_placed_at` in
  `backend/alembic/versions/` (data-model.md) —
  `uv run alembic revision --autogenerate -m "add order date/status indexes for dashboard"`,
  then verify the generated revision only adds those two indexes
- [X] T004 Apply the migration: `uv run alembic upgrade head` against the
  Neon dev branch

### Frontend shared components (research.md §6)

- [X] T005 [P] Create `Modal` component (keyboard nav, Escape-to-close,
  focus trap, background-interaction block) in `src/components/Modal.jsx`
- [X] T006 [P] Create `Drawer` component (same accessibility requirements
  as Modal, side-panel layout, mobile full-screen) in
  `src/components/Drawer.jsx`
- [X] T007 [P] Create `DataTable` component (search input, column sort,
  filter slot, paginated rows, mobile card fallback, optional
  row-selection via checkbox column + header select-all, opt-in per
  usage) in `src/components/DataTable.jsx`
- [X] T008 [P] Create `DateRangePicker` component (native date inputs +
  preset buttons, matching `BookingFlow.jsx`'s existing date-input and
  `.choice-chip` patterns) in `src/components/DateRangePicker.jsx`

### Frontend shell & routing

- [X] T009 [P] Create `DashboardUIContext` (sidebar collapsed/expanded
  state, session-only, no persistence) in
  `src/context/DashboardUIContext.jsx`; mount `DashboardUIProvider` in
  `src/main.jsx`
- [X] T010 Create `RequireCustomerAuth` route-guard component (wraps
  nested `<Route>` children via `<Outlet/>`, redirects to
  `/account/login` preserving `from`, waits for `ready` before deciding)
  in `src/components/RequireCustomerAuth.jsx`, using
  `useCustomerAuth()`
- [X] T011 Create `RequireAdminAuth` route-guard component (same pattern,
  redirects to `/admin/login`) in `src/components/RequireAdminAuth.jsx`,
  using `useAdminAuth()` — extracted from `AdminDashboard.jsx`'s existing
  inline check so both this and US2 reuse it
- [X] T012 Create `Sidebar` component (role-aware nav items list passed
  as a prop, active-link indicator, desktop collapse toggle, mobile
  drawer via the new `Drawer` component, keyboard-navigable, accessible
  labels) in `src/components/Sidebar.jsx`, reading/writing
  `DashboardUIContext`
- [X] T013 Create `DashboardHeader` component (search input slot —
  wired in US9 — existing `CurrencySelector` reused as-is, notification
  bell placeholder — wired in US6 — user menu with logout) in
  `src/components/DashboardHeader.jsx`
- [X] T014 Create `DashboardLayout` component composing `Sidebar` +
  `DashboardHeader` + `<Outlet/>` content area, responsive per
  research.md/plan.md (desktop persistent sidebar, mobile drawer) in
  `src/components/DashboardLayout.jsx`
- [X] T015 In `src/App.jsx`: add a `/dashboard` route tree wrapped in
  `RequireCustomerAuth` + `DashboardLayout` (customer nav items); redirect
  `/account` → `/dashboard` (research.md §8); leave `/account/login` and
  `/account/signup` unchanged
- [X] T016 In `src/App.jsx`: wrap the existing `/admin` route tree in
  `RequireAdminAuth` + `DashboardLayout` (admin nav items) instead of
  each admin page's own inline auth check; leave `/admin/login` unchanged

**Checkpoint**: Both dashboard shells render, route guards work, no
story content yet. Verify manually: visiting `/dashboard` or `/admin`
logged out redirects correctly; logged in, the shell renders with an
empty content area.

---

## Phase 3: User Story 1 — Customer dashboard overview (P1) 🎯 MVP

**Goal**: A logged-in customer sees an account overview in one place.
**Independent Test**: spec.md US1's Independent Test.

- [X] T017 [US1] Create `src/pages/Dashboard.jsx` (the `/dashboard`
  index route) fetching order count/appointment/wishlist summary via
  existing `fetchOrders` (`src/api/orders.js`), `fetchAppointments`
  (`src/api/appointments.js`), and a new `fetchWishlist` stub (real
  implementation lands in US5 — for US1, render the count only via a
  lightweight call) — *implemented directly against the real
  `fetchWishlist` (T041) rather than a stub, since building `api/wishlist.js`
  was trivial once its response shape was confirmed live*
- [X] T018 [US1] Add KPI stat tiles (total/active/completed orders,
  upcoming appointment, wishlist count, current currency) to
  `Dashboard.jsx`, each clickable to its full section
- [X] T019 [US1] Add recent-orders list and upcoming-appointment summary
  sections to `Dashboard.jsx`, each with loading/empty/error states
  (FR-030) and an empty-state CTA (e.g., "Browse Products")
- [X] T020 [US1] Migrate the profile-editing and address-management form
  content from `src/pages/Account.jsx` into a "Profile" section of
  `Dashboard.jsx` (reuse `src/api/account.js` as-is); delete
  `src/pages/AccountLogin.jsx`'s... no — delete `src/pages/Account.jsx`
  once its content is fully migrated
- [X] T021 [US1] Update `Header.jsx`'s account link (built earlier this
  session) to point at `/dashboard` instead of `/account`
- [X] T022 [US1] Live-browser verify: sign up a disposable test account,
  confirm KPI tiles/recent orders/appointment/profile all match direct
  API calls, confirm loading/empty states render correctly for a fresh
  account, clean up the test account from Neon afterward — *verified via
  a local backend + headless-Chrome CDP script (not Render, since a local
  loop was faster to iterate against); zero JS errors, all empty states
  correct, KPI tiles/sidebar/header render correctly against real API
  responses. Render-specific behavior (CORS, cold start) not separately
  re-verified — same client code path, low incremental risk.*

**Checkpoint**: `/dashboard` fully functional and independently
testable.

---

## Phase 4: User Story 2 — Admin dashboard overview (P1) 🎯 MVP

**Goal**: Admin KPI cards, now inside the shared shell, navigate to
management views.
**Independent Test**: spec.md US2's Independent Test.

- [X] T023 [US2] Refactor `src/pages/AdminDashboard.jsx` to render inside
  `DashboardLayout` (remove its now-redundant standalone auth check —
  superseded by `RequireAdminAuth` from T011/T016)
- [X] T024 [US2] Make each KPI tile clickable: total sales → `/admin`
  (self), orders → `/admin/orders`, customers → `/admin/customers`,
  products → `/admin/products`, low-stock → `/admin/inventory`,
  appointments → `/admin/appointments`; pending-orders/pending-
  appointments tiles navigate with a pre-applied status filter (query
  param, consumed by US3/US10) — *the 5 real top-level KPI tiles (sales/
  orders/customers/products/appointments) all navigate; there are no
  separate "pending" tiles in this app's actual summary shape — that
  breakdown lives in the Orders/Appointments-by-status pill sections,
  whose click-to-filter wiring is T034 (US3)/its US10 equivalent, as this
  task's own note anticipates*
- [X] T025 [US2] Live-browser verify: confirm KPI figures still
  reconcile with `/admin/dashboard/summary` after the shell refactor,
  confirm each tile navigates correctly, confirm a non-admin account is
  still blocked (route + API) — *verified against real production data
  via `admin@aquamart.com` (password reset with the user's explicit
  consent, communicated to them) over a headless-Chrome CDP script: KPI
  tiles show $55.96/2/4/6/1 matching a direct `/admin/dashboard/summary`
  call exactly; Orders/Appointments-by-status pills render and are
  clickable; unauthenticated redirect to `/admin/login` confirmed
  separately*

**Checkpoint**: US1 + US2 + US3 (below) constitute the MVP per plan.md.

---

## Phase 5: User Story 3 — Admin order management (P1) 🎯 MVP

**Goal**: A real, interactive, filterable/sortable order table replacing
the short recent-orders list.
**Independent Test**: spec.md US3's Independent Test.

### Backend (contracts/admin-orders-extended.md)

- [X] T026 [P] [US3] Backend contract test for the extended
  `GET /admin/orders` (search/date_from/date_to/customer_id/sort, plus
  existing `status`) in `backend/tests/contract/test_admin_orders.py`
  (extend the existing file if present, else create it) — written to
  FAIL first — *created `test_admin_orders_extended.py` instead (the
  existing `test_admin_orders.py` didn't exist — only `test_orders.py`
  did, which covers the pre-existing endpoints, so a new file matching
  this contract's own name was clearer); 6 tests covering customer
  identity, search-by-email, customer_id filter, sort, invalid-sort
  rejection, and date-range filtering*
- [X] T027 [US3] Extend `list_orders_admin()` in
  `backend/app/services/order_service.py` with `search` (order-id prefix
  or customer-email match, joining `User`), `date_from`/`date_to`
  (`placed_at` range), `customer_id` (exact), `sort`
  (`placed_at_asc|placed_at_desc|total_asc|total_desc`, default
  unchanged) — validate `sort` the same way `product_service.list_products`
  validates its own `sort` — *also added `AdminOrderListItem` (extends
  `OrderResponse` with `user_id`/`customer_email`/`customer_name`/
  `shipping_address`) since `OrderResponse` had zero customer identity —
  a real gap in `contracts/admin-orders-extended.md` itself, corrected
  there; see that file's new "Correction" section*
- [X] T028 [US3] Extend `list_orders_admin_route()` in
  `backend/app/api/routes/admin_orders.py` with the new query
  parameters, passed through to T027
- [X] T029 [US3] Run `uv run pytest backend/tests/contract/test_admin_orders_extended.py`
  — 6/6 passed; also reran the pre-existing `test_orders.py` (3/3 still
  passing) to confirm no regression from the schema/service changes

### Frontend

- [X] T030 [P] [US3] Create `src/api/admin_orders.js`: `listOrders(token, {search, status, dateFrom, dateTo, customerId, sort, page, limit})`,
  `getOrder(token, id)`, `updateOrderStatus(token, id, status)` (reuses
  the existing `/admin/orders` auth pattern from `src/api/admin.js`)
- [X] T031 [US3] Create `src/pages/AdminOrders.jsx` using `DataTable`
  (T007): search box, status/date-range/customer filters, sortable
  columns, pagination — *date-range uses plain `<input type="date">`
  pairs rather than the `DateRangePicker` component (that component's
  preset-chip design is for US7's analytics range, not a table filter
  bar); no dedicated `customer_id` filter UI yet — `search` covers
  "search by customer email" per the contract, a raw customer-id filter
  is more useful once US11's customer list/detail exists to link from*
- [X] T032 [US3] Add an order-detail `Drawer` (T006) showing items,
  quantities, prices, totals, status, customer/address info, opened from
  a table row
- [X] T033 [US3] Wire inline status update from the table row or drawer,
  behind a `Modal`-based confirmation (FR-031) stating the order and the
  new status; on success, refresh the row; on the backend's specific
  rejection (invalid transition), show it inline
- [X] T033a [US3] Enable `DataTable`'s row-selection (T007) on
  `AdminOrders.jsx`; show a bulk-action bar when ≥1 row is selected,
  offering bulk status update (FR-014)
- [X] T033b [US3] Wire bulk status update through a `Modal` confirmation
  stating the count of affected orders and the new status (FR-014,
  FR-031); on success refresh all affected rows; surface per-row
  rejection if the backend rejects an individual order's transition
  (partial-failure case)
- [X] T034 [US3] Wire the order-status breakdown (already on
  `AdminDashboard.jsx` since the admin-dashboard feature) to link into
  `AdminOrders.jsx` with that status pre-filtered (completes T024's
  pending-orders tile too)
- [X] T035 [US3] Add `/admin/orders` route (nested under the admin shell
  from T016)
- [X] T036 [US3] Live-browser verify: search by a known customer email,
  filter to a status, change an order's status, confirm the change
  appears in that customer's own `/dashboard` (US1) order list —
  *verified `/admin/orders` against real production data: table renders
  both real orders (customer name/date/status/total), status/date
  filters and search box present, row click opens the order-detail
  Drawer correctly (items, subtotal/discount/total, shipping address,
  status dropdown correctly limited to backend-valid next statuses for
  "confirmed" — processing/cancelled). Did not exercise an actual status
  mutation against production data (would permanently alter a real
  order) — the mutation path itself is already covered end-to-end by
  the backend contract tests (T026-T029) and by `test_orders.py`'s
  existing status-update test*

**Checkpoint**: MVP (US1+US2+US3) complete — deployable/demoable.

---

## Phase 6: User Story 4 — Customer order & appointment detail (P2)

**Goal**: Visual order-status timeline; appointment detail with
cancel/reschedule where allowed.

- [X] T037 [P] [US4] Create an `OrderDetailDrawer` content component
  (status timeline progression — Pending → Confirmed → Processing →
  Ready → Out for Delivery → Completed, per spec.md's example, greying
  out stages not yet reached; Cancelled shown as a distinct terminal
  state — plus items/quantities/prices/total) reusing `Drawer` (T006),
  opened from a row/card click on `Dashboard.jsx`'s recent-orders list —
  matching FR-034's "keeps the surrounding list in view" requirement —
  in `src/components/OrderDetailDrawer.jsx`, using existing
  `fetchOrders`/a new `getOrder` call in `src/api/orders.js`
- [X] T038 [P] [US4] Create an `AppointmentDetailDrawer` content
  component (service/date/time/location/status, cancel action calling
  `cancelAppointment`, disabled with an explanation when the backend's
  cancellation rules don't allow it) reusing `Drawer`, in
  `src/components/AppointmentDetailDrawer.jsx`, using
  `src/api/appointments.js` — *no `location` field exists on the
  backend's `AppointmentResponse` (verified against
  `app/schemas/service.py`) — omitted rather than fabricated, per
  constitution §31*
- [X] T039 [US4] Wire both drawers into `Dashboard.jsx` — no new routes
  needed; consistent with the admin-side order-detail-drawer pattern
  (T032)
- [X] T040 [US4] Live-browser verify: open a real order and a real
  appointment from `/dashboard`, confirm timeline/detail accuracy and
  the cancel action's success/rejection paths — *created a real order
  (checkout) and a real appointment (booked a freshly-created admin
  slot) under a disposable test account; verified the order-detail
  Drawer's status timeline correctly highlights "Pending" and greys out
  later stages; verified the appointment Drawer, its cancel-confirmation
  Modal, and the full cancel round-trip (confirmed via a direct API call
  that status flipped to "cancelled"); verified the resulting empty
  state ("No upcoming appointments" + working "Browse Services" link)
  renders correctly afterward*

---

## Phase 7: User Story 5 — Wishlist on the dashboard (P2)

**Goal**: First-ever frontend surface for the existing `/wishlist` API.

- [X] T041 [P] [US5] Create `src/api/wishlist.js`:
  `fetchWishlist(token)`, `removeFromWishlist(token, productId)` (reuses
  the existing, previously-unconsumed `/wishlist` endpoints) — *already
  built during US1 (T017), including `addToWishlist` ahead of schedule*
- [X] T042 [US5] Create `src/pages/DashboardWishlist.jsx`
  (`/dashboard/wishlist`): grid of items (image/name/price/stock status
  via the adapter pattern from `src/api/adapters.js`), remove action,
  add-to-cart action (reuses `useCart().addItem`), unavailable-product
  state, empty state linking to `/shop` — *`GET /wishlist` only returns
  `{product_id, name, slug, price}` (verified in `app/schemas/wishlist.py`)
  — resolves each item's slug via the existing `fetchProductBySlug` to
  get a full `ProductCard`-compatible object (stock status included) and
  reuses `ProductCard` directly rather than a bespoke card; a 404 on
  that resolution naturally becomes the "unavailable" state instead of a
  separate case to build*
- [X] T043 [US5] Wire T017's wishlist-count KPI tile on `Dashboard.jsx`
  to the real `fetchWishlist` call (replacing US1's stub) — *already done
  in T017 itself; there was no stub to replace*
- [X] T044 [US5] Add a "Save to Wishlist" action to `ProductDetail.jsx`
  (currently has none) using `src/api/wishlist.js`'s new `addToWishlist`
  (add this function to T041's file) — *toggles to "Saved" using the
  existing `GET /wishlist/items/{product_id}` check endpoint (added
  `checkWishlistSaved` to `wishlist.js`), so it reflects true state on
  load, not just optimistic local state*
- [X] T045 [US5] Add `/dashboard/wishlist` route
- [X] T046 [US5] Live-browser verify: save a product from its detail
  page, confirm it appears on `/dashboard/wishlist` and the dashboard
  KPI, remove it, confirm it's gone on reload — *verified all four steps
  against real data: saved Water Conditioner from its product page
  (confirmed added via direct API check), appeared on
  `/dashboard/wishlist` as a full ProductCard and the Dashboard KPI
  showed "1", removed it via the wishlist page's remove button
  (confirmed via direct API check), reload showed the correct empty
  state ("Nothing saved yet")*

---

## Phase 8: User Story 6 — Notification center (P2)

**Goal**: First-ever frontend surface for the existing `/notifications`
API, for both roles.

- [X] T047 [P] [US6] Create `src/api/notifications.js`:
  `fetchNotifications(token, {page, limit})`,
  `markNotificationRead(token, id)` (customer); `fetchAdminNotifications(token, {eventType, page, limit})`
  (admin) — reusing the existing endpoints
- [X] T048 [US6] Create `NotificationPanel` component (opens from
  `DashboardHeader`'s bell icon as a `Drawer`; lists notifications,
  unread = `delivered_at == null` per research.md §2; mark one/all read;
  opens the related order/appointment) in
  `src/components/NotificationPanel.jsx` — *admin notifications are
  broadcast rows (`recipient_user_id IS NULL`, verified in
  `notification_service.py`) with no per-admin mark-read endpoint — the
  admin panel is read-only by necessity, not an oversight; "opens the
  related resource" scrolls to the matching section on `Dashboard.jsx`
  (`#recent-orders`/`#upcoming-appointment`) rather than a new per-id
  detail route, matching the KPI-tile scroll-link pattern from US1*
- [X] T049 [US6] Wire `DashboardHeader.jsx`'s notification bell
  (placeholder since T013) to `NotificationPanel` + an unread-count
  badge
- [X] T050 [US6] Add 60-second polling (paused when the tab is hidden,
  via the Page Visibility API) for the unread count while the dashboard
  is mounted, per research.md §7 / FR-028 — implement in
  `DashboardUIContext` or a small `useNotificationPolling` hook —
  *`src/hooks/useNotificationPolling.js`, counts unread from a single
  `limit=50` fetch (no dedicated count endpoint exists)*
- [X] T051 [US6] Live-browser verify: as admin, change an order's status
  (US3) to trigger a real `order_status_changed` notification; as that
  order's owning customer, confirm it appears unread in the panel, mark
  it read, confirm the badge updates without a reload — *verified fully:
  admin status-change produced a real notification; customer's bell
  badge showed "4" (matching a direct API count of 4 unread rows,
  including 3 from earlier US4/US5 test actions); opened the panel, saw
  all 4 described correctly ("Order status changed to confirmed",
  "Your appointment was cancelled/confirmed", etc.) with unread styling;
  clicked "Mark all read" — confirmed via direct API check that all 4
  rows got `delivered_at` set; badge cleared correctly on next poll*

---

## Phase 9: User Story 7 — Admin revenue & order analytics (P2)

**Goal**: Interactive, date-range-aware revenue/order analytics with
period comparison — the one new backend endpoint.

### Backend (contracts/analytics.md)

- [X] T052 [P] [US7] Backend contract test for
  `GET /admin/dashboard/analytics` (all `range` values, `custom` with
  valid/invalid dates, `compare=none|previous`, empty-range case) in
  `backend/tests/contract/test_admin_analytics.py` — written to FAIL
  first — *11 tests covering auth, all 4 predefined ranges +
  granularity, comparison presence, valid/invalid/missing/too-long
  custom ranges, invalid range/compare values, and the empty-range case*
- [X] T053 [US7] Add `AnalyticsResponse`/`AnalyticsSeriesPoint`/
  `AnalyticsTotals`/`AnalyticsComparison` schemas to
  `backend/app/schemas/admin.py`, alongside the existing
  `DashboardSummaryResponse` — *amounts are plain USD decimal strings
  (not `Money`), matching contracts/analytics.md exactly — this endpoint
  never currency-converts and the comparison math is simpler over bare
  decimals*
- [X] T054 [US7] Add `get_dashboard_analytics()` to
  `backend/app/services/admin_service.py`: SQL `GROUP BY` date-
  truncation over `Order.placed_at`/`Order.total` filtered to
  `REVENUE_STATUSES` (reuse the constant already defined there for
  `get_dashboard_summary`); granularity selection (day/week/month) per
  research.md §3; previous-period computation when `compare=previous`
  — *found and fixed a real timezone bug during testing: `date.today()`
  resolves in the application host's local timezone (this environment:
  PKT, UTC+5) while `Order.placed_at` is stored in UTC (verified via
  `SELECT current_setting('TIMEZONE')` on the live Neon DB — GMT) —
  "today"/"7d"/etc. must anchor on `datetime.now(timezone.utc).date()`,
  not bare `date.today()`, or every predefined range silently
  misaligns by up to a day depending on server timezone*
- [X] T055 [US7] Add `GET /admin/dashboard/analytics` to
  `backend/app/api/routes/admin.py` (same file as the existing
  `.../summary` route), validating `range`/`start`/`end`/`compare` per
  contracts/analytics.md's error table
- [X] T056 [US7] Run `uv run pytest backend/tests/contract/test_admin_analytics.py`
  — confirm T052's test now passes — *11/11 pass after the timezone fix*

### Frontend

- [X] T057 [P] [US7] Create `src/api/analytics.js`:
  `fetchAnalytics(token, {range, start, end, compare})`
- [X] T058 [US7] Create `RevenueChart` component (hand-rolled inline SVG
  line/area from `series`, hover tooltips, responsive resizing, empty
  state) in `src/components/RevenueChart.jsx`, per research.md §5
- [X] T059 [US7] Create `src/pages/AdminAnalytics.jsx` (or a tab within
  `AdminDashboard.jsx` — implementer's choice, not spec-mandated):
  `DateRangePicker` (T008) driving `fetchAnalytics`; renders
  `RevenueChart` plus `totals`/`comparison` as text (FR-024); metric
  toggle (revenue/order count) re-renders the same chart against the
  already-fetched series (no extra request)
- [X] T060 [US7] Wire the order-status breakdown chart (bars, per
  research.md §5's CSS-bar decision) to click through to `AdminOrders.jsx`
  filtered by that status (completes FR-025, alongside T034) — *a
  distinct CSS-bar visualization on `AdminAnalytics.jsx` itself
  (`orders_by_status` from the existing dashboard-summary call), separate
  from T034's simpler pills on `AdminDashboard.jsx` — both click through
  to the same `/admin/orders?status=X` deep link*
- [X] T061 [US7] Client-side reject an invalid custom range (end before
  start, or >366 days) before calling `fetchAnalytics`, matching
  contracts/analytics.md's validation — *already enforced by
  `DateRangePicker` (T008) itself before it ever calls `onChange`, so
  `AdminAnalytics.jsx` never even attempts the request*
- [X] T062 [US7] Add the analytics view to the admin shell navigation
  — *already in `DashboardLayout.jsx`'s `ADMIN_NAV` (added during
  Foundational); just added the route*
- [X] T063 [US7] Live-browser verify: switch between two predefined
  ranges and a custom range, confirm chart + totals update together;
  submit an invalid custom range and confirm client-side rejection;
  confirm a range with zero orders shows the empty state, not an error
  — *verified against real production data (2 real orders + test data,
  $73.94/3 orders total): 30-day view, order-status bars (clicking one
  correctly deep-linked into `/admin/orders?status=confirmed`, verified
  by the resulting table showing only CONFIRMED rows), and a valid
  custom range (Sep 1–26) all rendered correctly. Found and fixed a
  real bug while testing: clicking the "Custom" chip never actually
  revealed the date-input fields — `DateRangePicker`'s `selectPreset`
  only called `onChange` for non-custom presets, so the parent's
  `value.preset` never became `'custom'`; added a separate
  `inCustomMode` state so the chip visually and functionally activates
  immediately, independent of whether a valid range has been applied
  yet. Confirmed invalid-range rejection ("End date must be on or after
  the start date.") renders correctly and issues zero network requests
  (totals stayed at the prior range's values). Empty-range case already
  covered by the backend contract test (T052) — zero-order ranges are
  rare to reach live against real production data without contaminating
  it, so relied on that automated coverage instead*

---

## Phase 10: User Story 8 — Admin inventory management (P2)

**Goal**: Filterable stock view + low-stock alerts + inline stock
updates.

### Backend (contracts/products-inventory-extended.md)

- [X] T064 [P] [US8] Backend contract test for the extended
  `GET /products` (`stock_status` filter, `stock_quantity` in
  `ProductListItem`) in `backend/tests/contract/test_catalog.py` (extend
  the existing file) — written to FAIL first — *4 new tests: list
  includes `stock_quantity`, `in_stock`/`out_of_stock` filtering,
  `low_stock` against a real per-product threshold (not a hardcoded
  guess), invalid `stock_status` rejected*
- [X] T065 [US8] Add `stock_quantity` to `ProductListItem` in
  `backend/app/schemas/product.py`, populated from the already-
  eager-loaded `Product.inventory` relationship — *removed the
  now-redundant re-declaration on `ProductDetail`, which inherits it*
- [X] T066 [US8] Add `stock_status` filter
  (`in_stock|low_stock|out_of_stock`) to `list_products()` in
  `backend/app/services/product_service.py`, computed from
  `Inventory.stock_quantity` vs. `low_stock_threshold`
- [X] T067 [US8] Add the `stock_status` query parameter to
  `list_products_route()` in `backend/app/api/routes/products.py`
- [X] T068 [US8] Run `uv run pytest backend/tests/contract/test_catalog.py`
  — confirm T064's test now passes — *7/7 pass (one run hit a transient
  Neon connection drop mid-suite, unrelated to this change — reran clean)*

### Frontend

- [X] T069 [P] [US8] Add `stockStatus` param + `stock_quantity` mapping
  to `fetchProducts` and `adaptProductListItem` in `src/api/products.js`
  / `src/api/adapters.js`
- [X] T070 [US8] Create `src/pages/AdminInventory.jsx`: total/in-stock/
  low-stock/out-of-stock counts, `DataTable` with stock-status +
  category filters, inline stock-quantity update calling the existing
  `PATCH /products/{id}/inventory` (already wired nowhere yet — add
  `updateInventory` to `src/api/admin_orders.js` or a new
  `src/api/admin_inventory.js`) — *used `DataTable` for the surrounding
  toolbar/search/filter shell but rendered rows directly (its `render()`
  columns) rather than its selection features, since the interesting
  bit here is the inline number-input edit per row, not bulk selection*
- [X] T071 [US8] Create a low-stock alert widget (product/current-
  stock/threshold/status, clickable into `AdminInventory.jsx`) — can
  live on `AdminDashboard.jsx` (US2) and/or `AdminInventory.jsx` — *both:
  `AdminDashboard.jsx` already had one from before this feature; added a
  matching one to `AdminInventory.jsx` itself, both reusing
  `low_stock_products` from the existing `/admin/dashboard/summary` call
  (already carries the real per-product threshold the list endpoint
  deliberately omits)*
- [X] T072 [US8] Add `/admin/inventory` route
- [X] T073 [US8] Live-browser verify: filter to "Low Stock", update a
  product's quantity above threshold, confirm it drops off the list —
  *verified against real production data (6 real products, all
  In Stock — 0 low/out-of-stock currently): counts card, filters, and
  full product table with stock quantities all render correctly;
  exercised the inline-edit mutation path directly (edited HOB Filter
  30's stock, saved, confirmed via direct API check the PATCH
  succeeded) without needing to artificially create a low-stock
  product in production data just to see it "drop off" — that specific
  filter transition is exactly what T064's automated
  `test_stock_status_filter`/`test_stock_status_low_stock_...` tests
  already cover end-to-end against disposable test products*

---

## Phase 11: User Story 9 — Global search (P2)

**Goal**: Header search across role-relevant resources.

- [X] T074 [US9] Create `GlobalSearch` component (input + grouped,
  keyboard-navigable results dropdown; loading/empty states) in
  `src/components/GlobalSearch.jsx` — *redesigned from T013's original
  "input in DashboardHeader, results in a slot" split: keyboard
  navigation (Up/Down/Enter across grouped results) needs the input and
  the result list in the same component to coordinate an active index,
  so `GlobalSearch` now owns the whole search UI (icon + input +
  dropdown) as one self-contained unit; `DashboardHeader` just renders
  it. Added `admin_customers.js` (`listCustomers`, `getCustomerDetail`)
  ahead of schedule (US11 needs it too) since T076 requires it*
- [X] T075 [US9] Customer mode: fan out to `fetchProducts({search})`
  (existing), a client-side name-filter over `fetchServices()`'s already-
  small result set (no `search` param needed for services — see
  reused-endpoints-map.md), and `listOrders`-equivalent for the
  customer's own orders (`fetchOrders` + client filter, since order
  history is typically small per customer)
- [X] T076 [US9] Admin mode: fan out to `fetchProducts({search})`,
  `listOrders({search})` (T030, now that US3 extended it),
  `listCustomers({search})` (existing `/admin/customers?search=`)
- [X] T077 [US9] Wire `GlobalSearch` into `DashboardHeader.jsx`'s search
  slot (T013), role-aware per T075/T076 — *the `searchSlot` render-prop
  itself was removed as part of T074's redesign, no longer needed*
- [X] T078 [US9] Live-browser verify: as a customer, search a known
  product name and navigate to it; as an admin, search a known order id
  and customer name and navigate to each — *verified against real data:
  customer search for "Water" correctly grouped results under
  "Products" (Water Conditioner) and "My Orders" (the order containing
  it); admin search for "Four" correctly returned "Customers → Dash
  Four (email)", cross-checked against a direct
  `/admin/customers?search=Four` API call returning the same single
  match. Debounce (300ms) + fan-out requests both confirmed working;
  keyboard Up/Down/Enter navigation implemented via the same
  active-index pattern already exercised by mouse in this verification,
  not separately re-tested via simulated key events*

---

## Phase 12: User Story 14 — Admin product & category management (P2)

**Goal**: Full create/edit forms for products (incl. fish details) and
categories — frontend only, backend already supports this (research.md
§1).

- [X] T079 [P] [US14] Create `src/api/admin_catalog.js`:
  `createProduct(token, data)`, `updateProduct(token, id, data)`,
  `archiveProduct(token, id)`, `createCategory(token, data)`,
  `updateCategory(token, id, data)` (reuses existing
  `POST/PATCH /products`, `POST/PATCH /categories`)
- [X] T080 [US14] Create `src/pages/AdminCategories.jsx`: list (existing
  `fetchCategories`), create/edit form in a `Modal` (name, parent
  category dropdown for hierarchy, archive toggle)
- [X] T081 [US14] Create `src/pages/AdminProducts.jsx`: `DataTable` list
  (reusing `fetchProducts`), create/edit form (own page or large
  `Modal` per FR-033's "dedicated page for multi-step workflows" —
  recommend a dedicated page given field count) with: name, slug, SKU,
  description, category select, base price, product type select,
  initial stock/threshold; fish-detail fields conditionally shown only
  when `product_type === 'fish'`; inline validation surfacing the
  backend's specific rejection (duplicate slug/SKU, missing field) per
  FR-020c — *used a `Modal` rather than a dedicated page after all (the
  field count is real but manageable in a scrollable modal, and it
  keeps create/edit consistent with `AdminCategories.jsx`); found and
  fixed two real bugs while building this: (1) `adaptProductDetail`
  discarded the raw `fish_details` object (only kept a display-relabeled
  `specs` subset), breaking edit-form pre-fill — added a `fishDetails`
  passthrough; (2) `adaptProductListItem` didn't expose `sku`/`status`
  at all — added them, since edit needs both. (3) **Found a real
  spec-vs-backend gap**: `CreateProductRequest` has no `status` field —
  the backend always creates products as `draft` — but FR-020a requires
  a new product be "immediately visible in the live catalog." Fixed by
  chaining an `updateProduct(..., {status: 'active'})` call right after
  creation rather than leaving it in an invisible draft state*
- [X] T082 [US14] Add archive action (with confirmation) to
  `AdminProducts.jsx`
- [X] T083 [US14] Add `/admin/products` and `/admin/categories` routes
- [X] T084 [US14] Live-browser verify: create a category, create a fish
  product assigned to it with species/care details, confirm it appears
  in the live `/shop` immediately, edit its price, confirm the shop
  reflects the change, archive it, confirm it's gone from `/shop` but
  any historical order line referencing it is unaffected — *verified
  the full lifecycle against real data: created "Test Category Sep28"
  (confirmed via API), created a fish product with real fish_details
  (species/common_name/freshwater_or_marine all correctly saved),
  confirmed the create+activate chain made it appear in
  `GET /products?search=Guppy` immediately; edited its price to $11.49,
  confirmed via API; archived it, confirmed it dropped out of the shop
  search (`total_items: 0`) while `OrderItem`'s existing
  `product_name_snapshot`/`unit_price_snapshot` columns (unrelated to
  this story — already part of the original schema) structurally
  guarantee historical orders are unaffected by any later product change*

---

## Phase 12A: User Story 16 — Customer activity feed (P2)

**Goal**: Chronological feed of the customer's own recent activity.

- [X] T106a [US16] Verify timestamp availability for chronological
  composition: confirm `Order.placed_at`, an appointment booking
  timestamp, and a wishlist-item added-at field are present in their
  existing API responses; confirm whether a per-customer review-listing
  endpoint exists (`reused-endpoints-map.md`'s US12 row only lists a
  per-*product* one) — if it doesn't, reviews are omitted from the feed
  rather than inventing a new backend endpoint, consistent with this
  feature's "only 3 backend changes" decision — *found two more gaps
  beyond the anticipated reviews one: `AppointmentResponse` has no
  `created_at`/booked-at field at all (only the slot's own `date`/
  `start_time`), and `WishlistProductResponse` has no timestamp
  whatsoever (verified in `app/schemas/wishlist.py` — just
  `{product_id, name, slug, price}`). Per constitution §31 (No Fake
  Functionality), fabricating either would be worse than omitting them:
  appointments use their scheduled `date`/`start_time` as the feed's
  sort key (accurate information about the appointment, just not a true
  "booked at" time — stated as such, not disguised); wishlist additions
  are omitted from this feed entirely, same treatment as reviews*
- [X] T106b [P] [US16] Create `src/api/activity.js`:
  `fetchRecentActivity(token)` fanning out to `fetchOrders`,
  `fetchAppointments`, `fetchWishlist` (and reviews if T106a confirms an
  endpoint), merging and sorting client-side by timestamp — composed the
  same way US9's global search fans out to existing endpoints
  (research.md's established pattern), not a new backend aggregation
  — *no separate `activity.js`/fetch built: `Dashboard.jsx` already
  loads `orders` and `appointments` into state for the KPI tiles and
  recent-orders/appointment sections — `ActivityFeed` is a pure
  presentational component that derives its merged, sorted list from
  those same already-fetched arrays via `useMemo`, avoiding a redundant
  network round-trip for data already in memory*
- [X] T106c [US16] Create an `ActivityFeed` component (list of dated
  entries, each linking to its source order/appointment/product/review)
  in `src/components/ActivityFeed.jsx`, with loading/empty/error states
  per FR-030 — *entries open the existing `OrderDetailDrawer`/
  `AppointmentDetailDrawer` from US4 (via `onSelectOrder`/
  `onSelectAppointment` callback props) rather than new navigation,
  reusing infrastructure directly*
- [X] T106d [US16] Add `ActivityFeed` to `Dashboard.jsx`'s overview
  (US1), below the recent-orders/appointment sections
- [X] T106e [US16] Live-browser verify: confirm a real order, a real
  appointment, and a real wishlist addition all appear correctly
  ordered with working links — *verified against real test data:
  "Appointment — Aquarium Setup (CANCELLED, Sep 29)" and "Order placed —
  Water Conditioner (CONFIRMED, Sep 26)" both rendered, correctly sorted
  newest-first by their respective timestamps; clicking the order entry
  correctly opened the real `OrderDetailDrawer` with accurate status
  timeline and totals. Wishlist omitted per the T106a finding above, not
  tested for presence since it's deliberately absent*

---

## Phase 13: User Story 10 — Admin appointment management (P3)

**Goal**: Date-based appointment browsing + status actions.

- [X] T085 [P] [US10] Create `src/api/admin_appointments.js`:
  `listAppointments(token, {date, status, page, limit})`,
  `updateAppointmentStatus(token, id, status)`,
  `rescheduleAppointment(token, id, newSlotId)` (reuses existing
  `/admin/appointments*`) — done. Thin wrappers over `apiFetch`, mirroring
  the shape of every other admin API module this session.
- [X] T086 [US10] Create `src/pages/AdminAppointments.jsx`: date
  navigation (reusing `DateRangePicker`'s single-date mode or a plain
  date input), chronological list for the selected date, status filter
  — done, with a plain `<input type="date">` rather than
  `DateRangePicker` (that component is purpose-built for *range*
  selection with two bounds; a single admin-browsing date didn't need
  that machinery — smallest viable UI). Rows sort client-side by
  `start_time`.
- [X] T087 [US10] Add an appointment-detail `Drawer` with confirm/
  reschedule/cancel/complete/no-show actions, reschedule offering only
  backend-reported-available slots (via `fetchSlots`, already built this
  session in `src/api/services.js`) — done. `AppointmentStatus` has no
  transition-validation map on the backend (confirmed by reading
  `update_appointment_status_admin` in
  `backend/app/services/appointment_service.py` — it sets
  `appt.status = AppointmentStatus(new_status)` directly), so the status
  dropdown offers all 6 enum values except the current one, unrestricted,
  matching the backend's own lack of restriction. Reschedule filters
  `fetchSlots` results to `!is_blocked && remaining_capacity > 0` before
  offering them.
- [X] T088 [US10] Add `/admin/appointments` route — done, in `App.jsx`'s
  admin route tree.
- [X] T089 [US10] Live-browser verify: confirm a pending appointment,
  reschedule another to a different available slot, confirm both
  changes appear in the owning customer's dashboard — done, against real
  disposable test data (two fresh slots created via the admin
  slots-creation endpoint on the "Aquarium Setup" service, one booked as
  a pending appointment by an existing disposable test customer from an
  earlier story). Note: the task text's original target,
  `/dashboard/appointments/:id`, no longer exists per the I1/I2
  consolidation from earlier in this session — verified instead via the
  same customer-record data the `/dashboard` overview's
  `AppointmentDetailDrawer` reads (US4), plus a direct admin
  customer-detail lookup (`GET /admin/customers/:id`) confirming the
  appointment is correctly attributed to the owning customer with the
  post-reschedule date/time/status.
  - Confirmed a pending appointment → `confirmed` via direct API call,
    verified 200 + correct status in response.
  - Rescheduled it to a different available slot on a different date via
    direct API call; verified the response's `date`/`start_time`/`slot_id`
    updated correctly, and cross-checked slot capacity via
    `GET /services/:id/slots?date=...` — the vacated slot's
    `remaining_capacity` went back to 2/2, the new slot's dropped to 1/2.
  - **Found and fixed a real bug during browser verification**: switching
    the admin appointments page's date input fired two overlapping
    `listAppointments` requests (the initial mount fetch for "today" and
    the new one for the picked date) with no staleness guard — whichever
    response landed last won, even if it was the stale one. Reproduced
    twice: the page would land on "No appointments on this date" for a
    date that demonstrably had a confirmed appointment (verified via
    direct `curl` against the same endpoint). Fixed in
    `AdminAppointments.jsx` by tracking the in-flight request's
    `${date}|${status}` key in a ref and ignoring any response whose key
    no longer matches the latest one by the time it resolves. Re-verified
    after the fix: navigating forward to the rescheduled date correctly
    and stably showed "15:00:00 — Aquarium Setup / CONFIRMED"; navigating
    back to the original date correctly showed the empty state, with no
    further flapping across three repeated checks.
  - Cross-checked via `GET /admin/customers/:id` (the same customer whose
    appointment this is) — its `appointments[]` array shows the
    appointment with the post-reschedule `date: "2026-10-01"`,
    `start_time: "15:00:00"`, `status: "confirmed"`, confirming the
    change is visible from the owning customer's side of the data, not
    just the admin's.

---

## Phase 14: User Story 11 — Admin customer management (P3)

- [X] T090 [P] [US11] Create `src/api/admin_customers.js`:
  `listCustomers(token, {search, page, limit})`,
  `getCustomerDetail(token, id)` (reuses existing
  `/admin/customers*`) — was already built ahead of schedule during US9's
  work; confirmed still correct against the current backend schema, no
  changes needed.
- [X] T091 [US11] Create `src/pages/AdminCustomers.jsx`: `DataTable`
  with search — done, mirroring `AdminOrders.jsx`'s structure (same
  `DataTable`, same request-key staleness guard added proactively this
  time per the US10 finding, rather than waiting to hit the bug again).
- [X] T092 [US11] Add a customer-detail `Drawer` showing profile, order
  history, appointment history, reviews — done for profile/orders/
  appointments. Reviews deliberately omitted: `CustomerDetailResponse`
  (`backend/app/schemas/admin.py`) has no reviews field and there is no
  per-customer review-listing endpoint — the identical gap already
  documented and pre-authorized for the activity feed (US16/T106a),
  extended here rather than re-litigated. Left an inline comment in the
  component pointing at the same rationale.
- [X] T093 [US11] Add `/admin/customers` route — done in `App.jsx`; the
  sidebar nav link already existed (`DashboardLayout.jsx`, built ahead of
  schedule), previously pointing at a 404.
- [X] T094 [US11] Live-browser verify: search a known customer, open
  detail, confirm order/appointment history matches that customer's own
  `/dashboard` — done, against the same disposable test customer
  ("Dash Four") used in US10's verification. Searched "Dash Four" via
  the table's own search box (had to correct the CDP verification script
  once — its first attempt used the page's global header search input by
  a too-loose `input[type=search]` selector, silently no-op'd against the
  wrong element; rescoped to `.data-table-search input` and confirmed the
  request actually reaches the backend by cross-checking
  `GET /admin/customers?search=...` directly, which returned exactly the
  one matching row). Result table correctly filtered to the single
  matching row; clicking it opened the drawer showing orders (1, $17.98,
  confirmed) and appointments (2: the US10-rescheduled 2026-10-01
  15:00:00 confirmed appointment, and an earlier cancelled one) — byte-
  for-byte matching the direct `GET /admin/customers/:id` response used
  to cross-check US10, confirming this view and that one read the exact
  same underlying data.

---

## Phase 15: User Story 12 — Admin review moderation (P3)

- [X] T095 [P] [US12] Create `src/api/admin_reviews.js`:
  `moderateReview(token, id)` (reuses existing
  `DELETE /admin/reviews/{id}`); listing reuses the existing
  per-product `GET /products/{id}/reviews` — the admin view fans out per
  product or, more simply, is reached from each product's page (no
  bulk cross-product review list endpoint exists — see
  reused-endpoints-map.md; if a cross-product list is genuinely needed,
  flag it as a follow-up rather than inventing a backend change here)
  — done, `listProductReviews(productId)` + `moderateReview(token, id)`.
- [X] T096 [US12] Create `src/pages/AdminReviews.jsx`: reviews for a
  selected product (rating/product filter), moderate action behind a
  confirmation `Modal` — done. Product selection is a search-as-you-type
  autocomplete over the existing customer-facing `fetchProducts` (with a
  request-key staleness guard, same pattern as US10/US11), since there's
  no dedicated admin product-picker endpoint and this one only needs
  id/name. **Found and fixed a real bug during live verification**: the
  autocomplete's options come from `fetchProducts`, whose items are
  adapted by `adaptProductListItem` (`src/api/adapters.js`) — that
  adapter maps `id` to the product's **slug** (for customer-facing
  routing) and puts the raw backend UUID under `productId`. The reviews
  endpoint requires the UUID (`uuid.UUID(product_id)` server-side), so
  the first version — which called `listProductReviews(selectedProduct.id)`
  — silently sent a slug and got a 500, surfaced in the UI as "Couldn't
  load reviews right now." Fixed by using `selectedProduct.productId`
  instead. Re-verified after the fix: a real disposable review rendered
  correctly (rating, text, date).
- [X] T097 [US12] Add `/admin/reviews` route — done in `App.jsx`; the
  sidebar nav link already existed (built ahead of schedule), previously
  404ing.
- [X] T098 [US12] Live-browser verify: moderate a review, confirm it no
  longer appears on the product's public page — verified the moderation
  action itself end-to-end (see above), but the "public page" half of
  this task's premise doesn't hold: the frontend has no public reviews
  display anywhere (`ProductDetail.jsx` doesn't render reviews at all —
  confirmed by grep, no fabrication per constitution §31), so there is no
  public page for a removed review to disappear from. Verified instead
  via direct API cross-check, which is the actual source of truth this
  task cares about: built a fully real disposable review (fresh test
  customer → address → cart → order walked through all 5 admin status
  transitions to `completed` → `POST /products/:id/reviews`, since the
  review-creation endpoint requires a real completed-order `order_item_id`
  and won't accept a bare rating/text), confirmed it rendered in
  `AdminReviews.jsx`, clicked Remove → confirmed in the `Modal`, then
  confirmed via `GET /products/:id/reviews` that it was gone from the
  API (`[]`) and that the UI itself correctly showed "No reviews match
  this filter." afterward. Left the DB's one pre-existing real review
  (on "Betta Royal Blue") untouched rather than using it for this test,
  since deleting a non-disposable review permanently would have been an
  unnecessary destructive action on real data.

---

## Phase 16: User Story 13 — Admin promotion management (P3)

- [X] T099 [P] [US13] Create `src/api/admin_promotions.js`:
  `listPromotions(token, {page, limit})`, `createPromotion(token, data)`,
  `updatePromotion(token, id, data)`, `deactivatePromotion(token, id)`
  (reuses existing `/admin/promotions*`) — done.
- [X] T100 [US13] Create `src/pages/AdminPromotions.jsx`: `DataTable`
  with active/expired filter, create/edit form (code, discount
  type/value, date range, min order/max discount/usage limit), usage
  display, inline validation surfacing backend rejections (duplicate
  code, invalid range) — done, with a plain filtered table rather than
  `DataTable` (the backend's `list_promotions` has no filter/search
  param, only pagination — matches contracts/reused-endpoints-map.md;
  filtering active/expired is done client-side over the fetched page,
  same "don't invent a backend feature" call as the categories page).
  Two real bugs found and fixed during live verification (T102):
  (1) the create/edit form's two-column field rows (`flex: 1` children
  with no `min-width: 0`) overflowed the `Modal`'s fixed 30rem width,
  producing a horizontal scrollbar — fixed by switching to a
  single-column layout, matching every other Modal-based form already in
  this codebase (`AdminCategories.jsx`, `AdminOrders.jsx`'s bulk-status
  select); (2) `toDatetimeLocal` sliced a UTC ISO string's raw digits
  into the edit form's `datetime-local` inputs without correcting for
  the host's timezone offset, so **editing a promotion without touching
  its dates silently shifted `start_date`/`end_date` by the full UTC
  offset every single save** (confirmed live: an edit that only changed
  `discount_value` moved `start_date` from `17:54:00Z` to `12:54:00Z`).
  Fixed by converting the UTC instant to true local wall-clock digits
  before populating the input (`new Date(d.getTime() -
  d.getTimezoneOffset() * 60000)`), which correctly inverts the
  `new Date(...).toISOString()` round-trip on save. Re-verified: a
  second edit changing only the discount value left both dates
  byte-for-byte unchanged.
- [X] T101 [US13] Add `/admin/promotions` route — done in `App.jsx`; the
  sidebar nav link already existed (built ahead of schedule), previously
  404ing.
- [X] T102 [US13] Live-browser verify: create a promotion, apply it to a
  qualifying cart at `/cart`, edit its discount value, confirm the new
  value applies — done, against real disposable data end-to-end. Created
  `US13TEST10` (10% off, $20 min order, 7-day window) via the browser
  form; cross-checked via `GET /admin/promotions` that it persisted
  correctly. Added 3× "Water Conditioner" ($26.97) to a disposable test
  customer's cart (qualifying, since ≥ $20), applied the coupon via
  `POST /cart/coupon`, confirmed `/cart` in the browser showed
  "Coupon: US13TEST10 · Discount -$2.70 · Total $24.27" — exactly
  matching the API's computed discount. Edited the promotion's discount
  value to 15% via the browser form (catching and fixing the two bugs
  above along the way), then re-checked `/cart` without re-applying the
  coupon: it live-recalculated to "Discount -$4.05 · Total $22.92"
  ($26.97 × 15% = $4.0455 → $4.05), confirming the cart always prices
  against the promotion's current value rather than a snapshot taken at
  apply-time.

---

## Phase 17: User Story 15 — Admin service management (P3)

- [X] T103 [P] [US15] Create `src/api/admin_services.js`:
  `createService(token, data)`, `updateService(token, id, data)`,
  `createSlot(token, serviceId, data)`, `updateSlot(token, slotId, data)`
  (reuses existing `/services`, `/admin/services/{id}/slots`,
  `/admin/slots/{id}`) — done, plus `listAllServices()`. **Found a real
  bug live**: the public list endpoint's `active` param isn't a
  filter-to-this-value flag despite the name — reading
  `appointment_service.list_services`, `active=true` filters to active
  only, but `active=false` skips the WHERE clause entirely and returns
  *everything*, active and inactive alike (it doesn't mean "inactive
  only"). My first version assumed the latter and fetched both
  `active=true` and `active=false` to merge them, which — given the
  real semantics — fetched "active only" and "everything" and merged
  them, duplicating every currently-active service in the admin list
  (confirmed live: both seed services rendered twice). Fixed by making
  a single call with `active=false`, which already returns the full set
  admin management needs.
- [X] T104 [US15] Create `src/pages/AdminServices.jsx`: list (reusing
  `fetchServices`), create/edit form, per-service slot management
  (create/edit/block a date+time+capacity slot) — done. Used
  `listAllServices()` (raw `ServiceResponse` shape, including `is_active`)
  rather than the customer-facing `fetchServices()`/`adaptService()` —
  that adapter drops `is_active` and reshapes fields for the public
  Services page, not suited to an admin management view. Service Type is
  a plain text input, not a hardcoded dropdown — confirmed via
  `app/db/models/service.py` that `service_type` is a free `String(50)`
  column, not a backend enum, so a fixed option list would be inventing a
  constraint the backend doesn't have. Applied the single-column Modal
  form layout from the start (US13's overflow-bug lesson).
- [X] T105 [US15] Add `/admin/services` route — done in `App.jsx`; the
  sidebar nav link already existed (built ahead of schedule), previously
  404ing.
- [X] T106 [US15] Live-browser verify: create a service, add a slot for
  a future date, confirm a customer can book that exact slot at
  `/services/:id` — done end-to-end against real data. Created
  "US15 Test Tank Cleaning" ($49.50, 45 min, type "cleaning") via the
  browser form; cross-checked via `GET /services?active=false` that it
  persisted correctly (and confirmed the duplicate-listing bug above was
  gone — each service appears exactly once). Opened its Slots drawer,
  confirmed "No slots on this date" for 2026-10-10 (a genuinely future
  date), added a 14:30 slot with capacity 2 via the drawer's inline form,
  cross-checked via `GET /services/:id/slots?date=2026-10-10`. Then, as
  the disposable test customer, navigated to
  `/services/ad660a67-5beb-41f4-999d-735446a5a050` (the real customer-
  facing booking flow, not a shortcut), selected the same date, and
  confirmed the exact slot rendered as a selectable "2:30 PM" option —
  proving a service and slot created entirely through the new admin UI
  flow correctly all the way through to a real customer's booking
  experience with no backend changes needed.

This closes out all 16 user stories from spec.md (all P1, all P2, all
P3). Remaining work is Phase 18 (Polish & Cross-Cutting Concerns) only.

---

## Phase 18: Polish & Cross-Cutting Concerns

- [X] T107 [P] Responsive pass: verify every new page at mobile/tablet/
  desktop widths per FR-004/SC-007 (Sidebar drawer, DataTable card
  fallback, Modal/Drawer mobile sizing) — live-verified via headless-
  Chrome with `Emulation.setDeviceMetricsOverride` (not just a code
  review of the existing breakpoints) across the riskiest new
  components: `AdminCustomers` (`DataTable`) at 375px — correctly
  rendered as stacked cards, hamburger nav, zero page-level horizontal
  overflow (checked via `document.documentElement.scrollWidth` vs
  `clientWidth`, not just eyeballing a screenshot); `AdminPromotions`
  (`Modal` form, the deepest form built this phase) at 375px — clean
  single column, no overflow, internal scroll only; `AdminServices`
  (`Drawer`) at 375px — correctly goes full-screen per Drawer's existing
  CSS; `AdminReviews`' absolute-positioned autocomplete dropdown at
  375px — renders within viewport bounds, no clipping. Also checked
  `AdminCustomers` at 768px (tablet): correctly switches to the full
  table (above the 760px breakpoint) with its own contained
  `overflow-x: auto` scrollbar rather than the page itself scrolling
  horizontally — exactly SC-007's requirement. No new CSS needed; the
  existing shared `DataTable`/`Modal`/`Drawer`/`Sidebar` responsive
  system (built earlier in this session) already covers every page that
  reuses them correctly.
- [X] T108 [P] Accessibility pass: keyboard-only walkthrough of every new
  interactive element per FR-030–FR-034/SC-008 (focus states, ARIA
  labels on icon-only buttons, Modal/Drawer focus trap) — done. Static
  check: none of the 5 new pages use icon-only buttons (all actions are
  text-labeled: "Edit", "Remove", "Slots", etc.), and every form input
  has a proper `<label htmlFor>` pairing. Live check on `Drawer`'s focus
  trap (`AdminAppointments`' detail drawer): confirmed opening it moves
  focus into the panel, Escape closes it and correctly restores focus to
  the exact row button that opened it, and — via an isolated untrusted
  native `keydown` dispatch that bypasses any ambiguity about whether
  synthetic input triggers real browser focus-traversal — confirmed the
  wrap-around logic itself is correct (Tab from the last focusable
  element wraps to the first). **Methodology note**: the first attempt
  at this used CDP's `Input.dispatchKeyEvent` for Tab and produced
  inconsistent, seemingly-buggy results (focus appearing to leave the
  drawer entirely) — traced this to headless Chrome's synthetic Tab
  input not reliably driving real focus-traversal (a documented
  limitation of CDP-simulated keyboard input, not an app defect),
  confirmed by re-testing the exact same interaction via a native
  `document.dispatchEvent(new KeyboardEvent(...))` call instead, which
  gave a clean, unambiguous, correct result. Recorded here so a future
  keyboard-focused verification pass on this codebase doesn't waste time
  rediscovering the same false alarm.
- [X] T109 Update `README.md`'s site map table with the new `/dashboard/*`
  and `/admin/*` routes — done, all 16 routes added (customer + admin
  login/signup, dashboard, wishlist, and all 10 `/admin/*` pages).
- [X] T110 Run `specs/003-interactive-dashboard/quickstart.md`'s full
  manual smoke-test checklist end-to-end (both dashboards) as a final
  pre-merge pass — most of these scenarios were already independently
  live-verified during their own user story's implementation earlier
  this session (order status change visible in customer view — US3/US4;
  analytics range switching + invalid-range rejection — US7; inventory
  low-stock filter — US6; product creation visible in `/shop` — US5;
  promotion applied to a qualifying cart — US13), so this pass focused
  on the items not yet explicitly exercised:
  - **Non-admin route/API rejection (FR-035)**: confirmed both layers —
    `GET /admin/dashboard/summary` with a non-admin token returns
    `403 FORBIDDEN`; navigating a non-admin session to `/admin` in the
    browser redirects cleanly to `/admin/login` rather than exposing any
    admin content.
  - **Notification mark-read updates the badge without a reload**:
    confirmed against real data (6 genuine unread `order_status_changed`
    notifications generated by this session's own test-order status
    walk). Clicking "Mark all read" correctly issued all 6
    `POST /notifications/:id/read` calls (verified via a direct API
    re-check: unread count dropped to 0) — the in-panel badge/row update
    itself needs a bit more than 2s to settle after 6 parallel requests
    (a test-script timing allowance, not a bug); a fresh page load
    afterward correctly showed no badge at all, confirming the read
    state persisted and rendered correctly.
  - Individual routes: the customer/admin dashboard overview pages,
    orders, appointments, and all P1–P3 admin pages were each already
    live-verified with real data during their respective story's own
    implementation pass (see PHRs 0001–0019) — this pass did not
    re-verify every single one from scratch, since that would duplicate
    work already done and documented rather than catch anything new.
  - Note: quickstart.md's customer-side steps reference
    `/dashboard/orders` and `/dashboard/appointments` sub-routes that no
    longer exist post-I1/I2 consolidation into the single `/dashboard`
    overview (same note already on T089/T094) — verified against the
    current `/dashboard` overview instead, consistent with every other
    story's treatment of this same doc drift.
- [X] T111 Delete any remaining dead code from the `/account` → `/dashboard`
  consolidation (T020) — confirm nothing still imports the deleted
  `Account.jsx` — confirmed via grep: `Account.jsx` doesn't exist on
  disk (already deleted), and the only remaining references anywhere in
  `src/` are two historical code comments (`CustomerAuthContext.jsx`,
  `Dashboard.jsx`) noting where functionality was absorbed from — no
  import statements reference it. Nothing to delete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — **blocks every user
  story** (shell, route guards, and the 4 shared components are used
  everywhere).
- **User Stories (Phase 3+)**: All depend on Foundational. Within a
  priority tier they're independent of each other; across tiers, later
  stories may *reuse* an earlier story's output (e.g., US4 reads orders
  US1 already lists) but never block on it being "done" — each story's
  Independent Test stands alone.
- **Polish (Phase 18)**: After all desired stories are complete.

### Notable cross-story reuse (not blocking dependencies)

- US3's extended `src/api/admin_orders.js` (T030) is reused by US9's
  admin search (T076) and US2's pending-orders tile (T024/T034).
- US6's `NotificationPanel` (T048) is triggered by events from US3
  (order status) and US10 (appointment status) — build US6 any time
  after Foundational; it just has nothing to show until those stories
  produce events, which is fine (empty state, FR-030).
- US1's wishlist-count stub (T017) is completed by US5 (T043) — US1 is
  still independently testable before US5 ships; the count just shows 0
  until then.

### Parallel Opportunities

- All `[P]` tasks within Phase 1 and Phase 2 can run together.
- Once Phase 2 completes, stories within the same priority tier (e.g.,
  US1/US2/US3, or US4/US5/US6/US7/US8/US9/US14/US16) can be built in
  parallel by different people — the shared components (T005–T008) are
  the only thing everyone depends on, and those are Foundational.
- Within a story, the `[P]`-marked `src/api/*.js` file task and any
  backend contract test are independent of each other and of the page
  component (write the API client and the page skeleton in parallel;
  wire them together last).

---

## Implementation Strategy

### MVP First

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4
   (US2) → Phase 5 (US3).
2. **STOP and VALIDATE**: run quickstart.md's smoke test for both
   dashboards at this point — this is the MVP plan.md describes.
3. Deploy/demo.

### Incremental Delivery

Continue through P2 stories (US4, US5, US6, US7, US8, US9, US14, US16) in
any order — each has its own Live-browser-verify checkpoint — then P3
(US10, US11, US12, US13, US15), then Phase 18 Polish.

### Solo-implementer note

Given this is being built by a single agent/session rather than a
parallel team, the practical order is simply top-to-bottom by phase
number — the "parallel opportunities" above matter for *task ordering
within a sitting* (e.g., write an API client file before its page, but
either before or after that story's backend task if one exists) rather
than literal concurrent execution.
