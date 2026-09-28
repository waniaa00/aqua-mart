# Contract: `GET /api/v1/admin/orders` extension

FR-013. Extends the existing, already-shipped endpoint
(`specs/001-fish-shop-backend/contracts/orders.md`) — same path, same
response shape (`PaginatedResponse<OrderResponse>`), same auth (Admin).
Only new query parameters, all optional and backward-compatible with
current callers.

## New query parameters

| Param | Type | Notes |
|---|---|---|
| `search` | string | Case-insensitive match against the order id (prefix) or the owning customer's email |
| `date_from`, `date_to` | ISO date | Filters `placed_at`; either may be given alone |
| `customer_id` | UUID | Exact match on `Order.user_id` |
| `sort` | `placed_at_asc\|placed_at_desc\|total_asc\|total_desc` | Default unchanged: `placed_at_desc` |

All filters compose with the existing `status` filter (AND semantics,
consistent with every other filterable list endpoint in this backend,
e.g. `GET /products`).

**Errors**: adds `400 VALIDATION_ERROR` for an unknown `sort` value or a
malformed `date_from`/`date_to`/`customer_id` — same pattern
`list_products_route` already uses for its own `sort` validation.

**No breaking response-shape change** — the pagination envelope and every
existing `OrderResponse` field are unchanged; existing callers (e.g. any
script or test using `status` only) continue to work unmodified.

## Correction (found during implementation)

`OrderResponse` (used by the customer-facing `GET /orders`) carries no
customer identity at all — no `user_id`, name, or email — which was missed
when this contract was written. FR-013 requires a "customer" column in
the admin table, and `search` requires matching the owning customer's
email server-side, neither of which `OrderResponse` alone can support.

Response type for **this admin route only** is now `AdminOrderListItem`
(`backend/app/schemas/order.py`) — `OrderResponse` plus three additive
fields: `user_id`, `customer_email`, `customer_name`. The customer-facing
`GET /orders`/`GET /orders/{id}` routes are untouched and still return
plain `OrderResponse` — this addition is scoped to the admin list only, so
no customer's data-visibility surface grows.
