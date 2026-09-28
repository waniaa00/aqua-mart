# Quickstart: Interactive Dashboard

## Prerequisites

- Everything in `specs/001-fish-shop-backend/quickstart.md` (backend
  already runs; this feature adds to it, doesn't replace it).
- Frontend: `npm install` at the repo root (already the case for this
  session's prior work — no new npm dependency added by this feature,
  per research.md §5/§6).
- A customer account and an admin account (`admin@aquamart.com` on the
  live Neon dev data, or any account with `role=admin`) to exercise both
  dashboard experiences.

## Backend: new migration

```bash
cd backend
uv run alembic revision --autogenerate -m "add order date/status index for dashboard analytics"
# verify the generated revision only adds ix_orders_placed_at and
# ix_orders_status_placed_at (data-model.md) before applying:
uv run alembic upgrade head
```

## Backend: new/extended endpoints to implement

1. `GET /admin/dashboard/analytics` — new (`contracts/analytics.md`).
2. `GET /admin/orders` — extend with `search`/`date_from`/`date_to`/
   `customer_id`/`sort` (`contracts/admin-orders-extended.md`).
3. `GET /products` — extend with `stock_status` filter +
   `stock_quantity` field (`contracts/products-inventory-extended.md`).

Everything else this feature's frontend calls already exists — see
`contracts/reused-endpoints-map.md` before writing any other backend code.

## Manual smoke test — customer dashboard

1. Log in as a customer with at least one order and one appointment.
2. Visit `/dashboard` — confirm order/appointment/wishlist counts match
   what `/dashboard/orders`, `/dashboard/appointments`, and
   `/dashboard/wishlist` show individually.
3. Add a product to the wishlist from a product page, confirm it appears
   in `/dashboard/wishlist`, remove it, confirm it's gone on reload.
4. Open the notification panel (header bell) — mark one notification
   read, confirm the unread count decreases without a page reload.
5. Resize the browser to a mobile width — confirm the sidebar becomes a
   drawer and tables become scrollable/card-based.

## Manual smoke test — admin dashboard

1. Log in as an admin. Visit `/admin` — confirm KPI cards match
   `/admin/orders`, `/admin/customers`, `/admin/appointments` counts.
2. Open `/admin/orders`, search for a known customer's order, filter to
   "Pending", change its status, confirm the change appears in that
   customer's own `/dashboard/orders`.
3. Open the analytics section, switch between 7-day and 30-day ranges,
   confirm the chart and the "Estimated Total"-style text values change
   together; try an invalid custom range (end before start) and confirm
   it's rejected client-side before ever reaching the backend.
4. Open `/admin/inventory`, filter to "Low Stock", update one product's
   stock quantity, confirm it drops off the low-stock list once above
   threshold.
5. Create a new product via `/admin/products` (with fish details if
   `product_type=fish`), confirm it appears in the live `/shop`
   immediately.
6. Create a new promotion via `/admin/promotions`, confirm it can be
   applied to a qualifying cart at `/cart`.
7. As a non-admin account, attempt to navigate directly to `/admin` and
   to call `GET /admin/dashboard/summary` with that account's token —
   confirm both are rejected (route-level and API-level, per FR-035).

## Cleanup after manual testing against the live Neon dev database

Any test order/appointment/promotion/product created during a manual
smoke test against the shared dev database should be removed afterward
(same pattern already used this session for e2e-test accounts) — see
prior PHRs under `history/prompts/002-frontend-integration/` and this
feature's own PHRs for the exact cleanup SQL pattern.
