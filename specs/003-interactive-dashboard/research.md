# Phase 0 Research: Interactive Dashboard

Grounded in a direct read of the current frontend (`src/`), the current
backend (`backend/app/`), and the already-shipped `001-fish-shop-backend`
contracts — not just the spec/plan inputs.

## 1. What's actually new on the backend

A route-by-route check against `backend/app/api/routes/` found that **every
dashboard capability except date-range analytics already has a working,
tested endpoint**:

| Spec capability | Existing endpoint | New work needed |
|---|---|---|
| Customer orders/appointments/wishlist/addresses | `GET /orders`, `GET /appointments`, `GET /wishlist`, `GET /users/me/addresses` | None |
| Notifications + unread state | `GET /notifications`, `POST /notifications/{id}/read` | None (see §2 below) |
| Admin order table + status update | `GET /admin/orders`, `PATCH /admin/orders/{id}/status` | None |
| Admin inventory + stock update | `GET /products`, `PATCH /products/{id}/inventory` | None |
| Admin appointment management | `GET /admin/appointments`, `PATCH .../status`, `POST .../reschedule` | None |
| Admin customer list/detail | `GET /admin/customers`, `GET /admin/customers/{id}` | None |
| Review list/moderate | `GET/POST /products/{id}/reviews`, `DELETE /admin/reviews/{id}` | None |
| Promotion CRUD | `GET/POST/PATCH/DELETE /admin/promotions` | None |
| Product/category CRUD | `POST/PATCH /products`, `POST/PATCH /categories` | None |
| Service/slot CRUD | `POST/PATCH /services`, `POST/PATCH .../slots` | None |
| Admin dashboard KPIs (fixed snapshot) | `GET /admin/dashboard/summary` | None (reused as-is) |
| Admin order table: status filter + pagination | `GET /admin/orders` | **Yes — extend with `search`/`date_from`/`date_to`/`customer_id`/`sort`, see §3a** |
| Admin inventory view: stock status/category filter | `GET /products` | **Yes — extend with `stock_status` filter + expose `stock_quantity`, see §3b** |
| **Date-range revenue/order analytics** | *none* | **Yes — new endpoint, see §3** |

A later verification pass while writing `contracts/` found two more gaps
beyond the analytics endpoint originally identified when this table was
first drafted — both are small, additive query-parameter extensions to
already-existing, already-tested endpoints, not new endpoints or schema
changes. See §3a/§3b.

**Decision**: This feature's frontend work consumes existing endpoints
directly wherever one already exists; it does **not** introduce a parallel
`/api/v1/dashboard/*` or `/api/v1/admin/dashboard/*` surface that would
duplicate them, even though the user's plan input sketched those paths as
illustrative REST shapes. `contracts/reused-endpoints-map.md` documents the
real mapping.
**Rationale**: The constitution's Code Quality principle (§28) forbids
duplicate logic, and the plan input itself says "avoid introducing
unnecessary technologies or architectural changes." A second endpoint
surface returning the same data through different shapes would be exactly
that.
**Alternatives considered**: A dedicated `/dashboard/*` aggregation layer
that wraps existing endpoints (rejected — adds a network hop and a second
response shape to keep in sync for no benefit, since the existing endpoints
already return exactly what each dashboard section needs).

## 2. Notification "unread" state

**Decision**: A notification is unread when `delivered_at` is `null`;
`POST /notifications/{id}/read` already sets `delivered_at` to the current
time. The frontend computes "unread count" client-side from the page of
results it already has (or a dedicated cheap count), rather than needing a
new backend field.
**Rationale**: `notification_service.mark_read` already repurposes
`delivered_at` this way (confirmed by reading `notification_service.py`);
the field name is a slight misnomer (originally meant for delivery-channel
tracking per `data-model.md`'s "delivery channel is an abstraction"
comment) but the mechanism already works. No schema or endpoint change
needed.
**Alternatives considered**: Adding a dedicated `is_read` column (rejected
— `delivered_at` already carries this meaning in the one place it's
written; renaming it is a larger, unrelated migration for no behavior
change).

## 3. Date-range analytics endpoint

**Decision**: One new endpoint, `GET /admin/dashboard/analytics`, accepting
`range` (`today|7d|30d|90d|12mo|custom`), `start`/`end` (required only when
`range=custom`), and `compare` (`none|previous`, default `previous`).
Returns a series (one point per day for `today`/`7d`/`30d`, per week for
`90d`, per month for `12mo`/custom spans over ~60 days) of `{date, revenue,
order_count}`, plus `totals: {revenue, order_count, average_order_value}`
for the requested range, and — when `compare=previous` and a previous
period is well-defined — `comparison: {previous_totals, absolute_diff,
percentage_diff}` for each of those three metrics.
**Rationale**: Matches FR-021–FR-023 exactly; computed via SQL `GROUP BY`
date-truncation over `Order.placed_at`/`Order.total` (`REVENUE_STATUSES`
already defined in `admin_service.py` for the existing summary — reused
here for consistency on what counts as "revenue"), never in the browser,
per the constitution's currency/financial-authority principles (§8, §11).
**Alternatives considered**: Separate endpoints per predefined range
(rejected — `range`+`start`/`end` as query params is one endpoint,
consistent with how every other list endpoint in this backend already
takes filters as query params, e.g. `GET /products`); a generic
"analytics query language" (rejected — far more than this spec's three
acceptance scenarios need; YAGNI per constitution §27/§28).

## 3a. Extending `GET /admin/orders` for FR-013

**Decision**: Add four optional query parameters to the existing
`GET /admin/orders` (currently `status`, `page`, `limit` only): `search`
(matches order id prefix or the owning customer's email, case-
insensitive), `date_from`/`date_to` (filters `placed_at`), `customer_id`,
and `sort` (`placed_at_asc|placed_at_desc|total_asc|total_desc`, default
unchanged at `placed_at_desc`). No new endpoint, no response-shape change
— `order_service.list_orders_admin` gains the extra filter/sort logic the
same way `product_service.list_products` already composes its filters.
**Rationale**: FR-013 explicitly requires search/date/customer filtering
and sorting on the admin order table; the endpoint as it stands today only
supports status + pagination, confirmed by reading
`app/api/routes/admin_orders.py` and `order_service.list_orders_admin`
directly rather than assuming from the contract docs.
**Alternatives considered**: A separate `/admin/orders/search` endpoint
(rejected — every other list endpoint in this backend expresses filters as
query params on the same GET; a second endpoint for the same resource
would be the inconsistency, not the fix).

## 3b. Extending `GET /products` for FR-015 (inventory view)

**Decision**: Add an optional `stock_status` filter
(`in_stock|low_stock|out_of_stock`, computed from each product's already-
eager-loaded `Inventory.stock_quantity`/`low_stock_threshold` — no extra
query) and add `stock_quantity` to `ProductListItem` (harmless to expose
publicly; `low_stock_threshold` stays admin-only context, read from the
same already-loaded relationship without a schema change to the public
response — the admin inventory view reads it via `GET /products/{slug}`'s
existing `ProductDetail`, which already returns it).
**Rationale**: FR-015 requires filtering by stock status; `Inventory` is
already `selectinload`-joined into every `list_products` query today (confirmed
by reading `product_service.list_products`) purely to build `average_rating`-
adjacent fields — the data is already in memory, just not filterable or
exposed as a count.
**Alternatives considered**: A dedicated `/admin/inventory` endpoint
(rejected — same reasoning as §3a: `GET /products` already has every other
catalog filter this feature's inventory view needs (`category`,
`product_type`); adding one more is smaller and more consistent than a
parallel endpoint).

## 4. New database indexes

**Decision**: Add two indexes via Alembic migration: `orders(placed_at)`
and a composite `orders(status, placed_at)` (the analytics query filters by
`REVENUE_STATUSES` and buckets by date; the existing admin order table
already filters/sorts by `status` and would also benefit). No new indexes
needed for appointments/products — their existing single-column indexes
already cover this feature's filters (confirmed against `data-model.md`).
**Rationale**: Constitution §23 (avoid N+1, use appropriate indexes) and
§26 of the plan input. The analytics endpoint's query pattern (filter by
status + date range, group by date) is exactly what a composite index on
`(status, placed_at)` serves.
**Alternatives considered**: A materialized/summary table refreshed
periodically (rejected — real complexity for a small-business-scale order
volume per constitution §34 "Scalability... simple enough for a small
business"; an indexed aggregate query is sufficient and stays consistent
in real time, which a periodic refresh would not).

## 5. Charting approach

**Decision**: Hand-rolled inline SVG for the revenue chart (a simple
line/area path from the analytics series) and CSS-based bar segments for
the order/appointment status breakdowns — no new npm dependency.
**Rationale**: `package.json` currently has exactly four dependencies
(react, react-dom, react-router-dom, three) and zero UI/charting/date
libraries; every existing visual (icons, placeholder art, gradients) is
hand-rolled per the codebase's established pattern (`Icon.jsx`,
`PlaceholderArt.jsx`). The chart needs of this spec (one line/area series,
a handful of status-breakdown bars, hover tooltips) don't need a charting
library's full feature set. Matches the plan input's own "avoid
introducing unnecessary technologies" instruction.
**Alternatives considered**: Recharts or Chart.js (rejected — a real,
sizeable new dependency, and this app has deliberately stayed
dependency-light through every prior feature this session; revisit only if
a future feature needs chart types genuinely hard to hand-roll, e.g. true
candlestick/heatmap visualizations).

## 6. Tables, modals, drawers, date-range picker

**Decision**: Build four small shared components — `DataTable` (search/
filter/sort header + paginated rows, used by every admin list in this
feature), `Modal`, `Drawer`, and `DateRangePicker` — as plain React +
existing CSS conventions (no headless-UI/Radix dependency). The date-range
picker reuses the pattern already shipped in `BookingFlow.jsx` (native
`<input type="date">` pair) plus a row of preset buttons (matching the
existing `.choice-chip` pattern from `BookingFlow`/`BuildMyAquarium`).
**Rationale**: This is the first feature needing a *reusable* table/modal/
drawer (prior admin work — `AdminDashboard.jsx` — used plain markup since
it only ever showed short lists), so building shared components now is the
right point to introduce them, per FR-030–FR-034's cross-cutting
requirements. No accessible-component library is already in use, and
adding one (e.g., Radix) for exactly four components is more than this
feature needs — hand-rolled with correct ARIA/focus-trap/Escape handling
satisfies FR-030–FR-034 and the constitution's Accessibility principle
(§17) without a new dependency.
**Alternatives considered**: Radix UI primitives for Modal/Drawer
(rejected — real accessibility value, but a new dependency for four
components this app can implement correctly itself, consistent with §5's
reasoning); a table library like TanStack Table (rejected — this
project's tables are simple paginated lists with a handful of filters,
not virtualized/deeply-nested data; a hand-rolled `DataTable` is smaller
and has no new dependency to track).

## 7. Polling

**Decision**: Poll `GET /notifications` (for unread count) every 60
seconds while the dashboard is open and the tab is visible (paused via the
Page Visibility API when the tab is backgrounded); KPI/analytics figures
re-fetch on demand (route change, filter change, explicit refresh) rather
than on a timer, since they're not named in spec.md as needing live
updates the way notifications are (User Story 6, FR-028).
**Rationale**: Matches the Clarifications decision (polling, not push) at
the lowest reasonable frequency that still feels responsive for a
small-business admin/customer count, while "MUST NOT be so frequent as to
place unreasonable load" (FR-028).
**Alternatives considered**: Polling every dashboard data source on the
same timer (rejected — unnecessary load per FR-028 for data that isn't
time-sensitive, e.g. a customer's own order list doesn't need to refetch
every 60s while they're reading it).

## 8. Route structure: consolidating `/account` into `/dashboard`

**Decision**: The customer dashboard lives at `/dashboard` (overview) with
sub-routes `/dashboard/orders`, `/dashboard/orders/:id`,
`/dashboard/appointments`, `/dashboard/appointments/:id`,
`/dashboard/wishlist`, `/dashboard/profile` (absorbs the existing
`Account.jsx` profile+addresses form), `/dashboard/notifications`. The
existing `/account` route redirects to `/dashboard` (profile tab);
`/account/login` and `/account/signup` are unchanged (pure auth entry
points, not dashboard content). The admin dashboard keeps its existing
`/admin` base and gains `/admin/orders`, `/admin/products`,
`/admin/categories`, `/admin/inventory`, `/admin/appointments`,
`/admin/customers`, `/admin/services`, `/admin/promotions`,
`/admin/reviews`; `/admin/login` is unchanged.
**Rationale**: Directly matches the plan input's suggested route
structure (§2), which is a reasonable, conventional shape; per
`spec.md`'s own Assumptions ("existing URLs may be reused or consolidated
at planning time"), this is exactly that planning decision.
**Alternatives considered**: Keeping `/account` as the customer dashboard's
name instead of introducing `/dashboard` (rejected — the plan input is
explicit about `/dashboard`, and "dashboard" is the correct name for what
this page becomes: an overview with drill-down sections, not just a
profile-and-addresses form).

## 9. State management

**Decision**: Extend the existing Context pattern — no new state library.
`DashboardUIContext` (sidebar collapsed/expanded, active filters — session-
only, not persisted) sits alongside the existing `CustomerAuthContext`,
`AdminAuthContext`, `CartContext`, `CurrencyContext`. Each dashboard page/
section fetches its own data via the existing `src/api/*.js` module
pattern (plain `useState`/`useEffect`, cancellation via a `cancelled` flag
— identical to every page shipped so far this session).
**Rationale**: Consistent with every prior decision this session and the
`002-frontend-integration` branch's own research.md decision #2 (Context
over TanStack Query — "real benefits, but a new pattern... for marginal
gain at this app's current complexity").
**Alternatives considered**: TanStack Query (rejected again, same
reasoning as before — still no cross-page cache-sharing need acute enough
to justify it; worth reconsidering if a future feature needs it).
