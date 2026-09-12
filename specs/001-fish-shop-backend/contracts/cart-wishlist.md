# Cart & Wishlist — `/api/v1/cart`, `/api/v1/wishlist`

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/cart` | Owner | `?currency=` | `200 {items: [{product, quantity, line_total}], subtotal, discount_amount, total, currency}` | FR-023, FR-025 — always server-computed |
| POST | `/cart/items` | Owner | `{product_id, quantity}` | `201` updated cart | `422 INSUFFICIENT_STOCK` if quantity exceeds stock (FR-024) |
| PATCH | `/cart/items/{product_id}` | Owner | `{quantity}` | `200` updated cart | same stock check |
| DELETE | `/cart/items/{product_id}` | Owner | — | `200` updated cart | |
| DELETE | `/cart` | Owner | — | `204` | Clears cart |
| POST | `/cart/coupon` | Owner | `{code}` | `200` updated cart with `discount_amount` | FR-046/FR-047. `409 CONFLICT` if a coupon is already applied; `400 COUPON_INVALID` with reason if expired/inactive/limit reached/min not met. |
| DELETE | `/cart/coupon` | Owner | — | `200` updated cart, discount removed | |
| GET | `/wishlist` | Owner | — | `200 [Product...]` | FR-026 |
| POST | `/wishlist/items` | Owner | `{product_id}` | `201` | `409 CONFLICT` if already saved (idempotent-safe: also acceptable to return `200` unchanged — implementation choice) |
| DELETE | `/wishlist/items/{product_id}` | Owner | — | `204` | |
| GET | `/wishlist/items/{product_id}` | Owner | — | `200 {saved: true/false}` | "check whether already saved" (FR-026) |
