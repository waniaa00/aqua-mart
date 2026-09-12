# Promotions — `/api/v1/admin/promotions`

Coupon *application* happens via `POST/DELETE /cart/coupon` (see
cart-wishlist.md) since it's a cart-mutation from the customer's perspective.
This file covers admin management of the Promotion/Coupon catalog (FR-046).

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/admin/promotions` | Admin | pagination | `200` paginated `Promotion` list | |
| POST | `/admin/promotions` | Admin | `{code, discount_type, discount_value, start_date, end_date, min_order_amount?, max_discount_amount?, usage_limit?}` | `201 Promotion` | `409 CONFLICT` on duplicate code |
| PATCH | `/admin/promotions/{id}` | Admin | partial fields incl. `is_active` | `200 Promotion` | |
| DELETE | `/admin/promotions/{id}` | Admin | — | `204` (soft: `is_active=false`) | Existing orders that used it are unaffected — the discount is already baked into `Order.discount_amount` |

Validation performed server-side at application time (in `/cart/coupon`, not
here): active window, `min_order_amount`, `usage_limit > times_used`, and the
"one coupon per order" rule (FR-047).
