# Reviews — `/api/v1/products/{product_id}/reviews`

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/products/{product_id}/reviews` | Public | pagination | `200` paginated `Review` list (hides `is_moderated_hidden=true` from non-admins) | FR-045 |
| POST | `/products/{product_id}/reviews` | Owner | `{order_item_id, rating (1-5), review_text}` | `201 Review` | FR-044. `403 FORBIDDEN` (`REVIEW_NOT_ELIGIBLE`) if `order_item_id` doesn't belong to caller, doesn't reference this product, or its order isn't `completed`. `409 CONFLICT` (`ALREADY_REVIEWED`) on duplicate (user_id, order_item_id). |
| DELETE | `/admin/reviews/{id}` | Admin | — | `204` (or sets `is_moderated_hidden=true`) | FR-045 moderation |
