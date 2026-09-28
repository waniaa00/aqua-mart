# Phase 1 Data Model: Interactive Dashboard

This feature adds **no new tables**. It reuses every entity already defined
in `specs/001-fish-shop-backend/data-model.md` (User, Address, Category,
Product/Inventory/FishDetails, Cart, Wishlist, Order, Service/Appointment/
AppointmentSlot, Review, Promotion, CurrencyRate, Notification) exactly as
they stand. The only backend-side change is two new indexes to support the
one new query pattern this feature introduces (date-range analytics).

## Schema changes

### New indexes (Alembic migration)

- `ix_orders_placed_at` on `orders(placed_at)` — supports the analytics
  endpoint's date-range bucketing.
- `ix_orders_status_placed_at` on `orders(status, placed_at)` (composite)
  — supports both the analytics endpoint (filters by revenue-counting
  statuses, then buckets by date) and the existing admin order table's
  status+date filtering, which today does a sequential scan at this
  table's current size but will benefit as order volume grows.

No other schema changes. `notifications.delivered_at` is reused as the
"read" marker (see research.md §2) — no column added or renamed.

## Analytics query shape (not a stored entity)

The new `GET /admin/dashboard/analytics` endpoint's request/response is a
query parameter shape and a computed response, not a persisted entity:

**Request** (query parameters):

- `range`: one of `today | 7d | 30d | 90d | 12mo | custom` (required)
- `start`, `end`: ISO dates, required only when `range=custom`; `end` MUST
  NOT be before `start`; the span MUST NOT exceed 366 days (FR-022's
  "sensible bound")
- `compare`: `none | previous` (default `previous`)

**Response** (shape, not a DB table):

```text
{
  "range": { "start": "2026-08-25", "end": "2026-09-24" },
  "granularity": "day" | "week" | "month",
  "series": [
    { "date": "2026-08-25", "revenue": "123.45", "order_count": 4 },
    ...
  ],
  "totals": {
    "revenue": "3456.78",
    "order_count": 112,
    "average_order_value": "30.86"
  },
  "comparison": {          // present only when compare=previous and a
                            // previous period is well-defined for `range`
    "previous_totals": { "revenue": "...", "order_count": 0, "average_order_value": "..." },
    "absolute_diff": { "revenue": "...", "order_count": 0, "average_order_value": "..." },
    "percentage_diff": { "revenue": "...", "order_count": 0, "average_order_value": "..." }
  }
}
```

Revenue figures use the same `Money`-free plain-decimal-string convention
as other aggregate figures in `admin_service.py` (e.g., `total_sales` in
the existing dashboard summary) — always USD, matching that endpoint's
existing behavior (admin reporting is not currency-converted, per the
already-established pattern this session found and left unchanged).

`granularity` is chosen server-side based on `range` (day for
today/7d/30d, week for 90d, month for 12mo/long custom spans) so the
frontend never has to guess how many points to expect.

## Frontend-only concepts (not persisted server-side)

- **Dashboard UI state**: sidebar collapsed/expanded, active table filters,
  last-viewed analytics range — held in `DashboardUIContext`
  (`src/context/`), scoped to the browser session, never sent to the
  backend as its own resource.
- **Search result**: a transient, client-side-assembled list from calling
  the existing per-resource search endpoints (`GET /products?search=`,
  `GET /admin/orders?search=` if supported, `GET /admin/customers?search=`)
  in parallel and grouping the results by type — not a new backend
  endpoint (see contracts/reused-endpoints-map.md for exactly which
  existing search parameters each resource type uses).

## Entity Relationship Summary

Unchanged from `specs/001-fish-shop-backend/data-model.md` — this feature
adds two indexes to `Order` and otherwise reads the existing graph. See
that document for the full diagram.
