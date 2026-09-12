# Admin Dashboard — `/api/v1/admin/dashboard`

Cross-cutting admin reporting (FR-051). Per-domain admin management endpoints
(products, orders, appointments, promotions, reviews) live in their own
contract files under `/admin/...` paths, cross-referenced from README.md.

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/admin/dashboard/summary` | Admin | `?date_from=&date_to=` (optional window, default all-time) | `200 {total_sales, total_orders, orders_by_status: {...}, total_customers, total_products, low_stock_products: [...], total_appointments, appointments_by_status: {...}, best_selling_products: [...], recent_orders: [...], recent_appointments: [...]}` | FR-051. All figures reconcile against underlying tables at request time (SC-006) — computed on read, not a stale cached report. |

`low_stock_products` reuses the same eligibility rule as `Inventory.stock_quantity <= low_stock_threshold`
(FR-036). `best_selling_products` ranks by summed `OrderItem.quantity` across
`completed`/`confirmed`/`processing`/`ready_for_delivery`/`out_for_delivery`
orders (excludes `cancelled`).
