# Catalog — `/api/v1/products`, `/api/v1/categories`

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/products` | Public | query: `search, category, product_type, species, min_price, max_price, available, freshwater_or_marine, difficulty, featured, sort, currency, page, limit` | `200` paginated `Product` (money shape per product) | FR-012..FR-015, FR-018. Filters AND-composed (FR-013). `sort` ∈ `price_asc,price_desc,newest,oldest,popularity,rating,featured`. |
| GET | `/products/{slug}` | Public | `?currency=` | `200 Product` (includes `fish_details` if `product_type=fish`, `average_rating`, `review_count`) | `404 NOT_FOUND` |
| POST | `/products` | Admin | Product + optional `fish_details` fields | `201 Product` | FR-048 |
| PATCH | `/products/{id}` | Admin | partial Product fields | `200 Product` | includes price/status/featured updates |
| DELETE | `/products/{id}` | Admin | — | `204` (soft: sets `status=archived`) | Never hard-deletes a product referenced by an OrderItem |
| POST | `/products/{id}/images` | Admin | `{url, display_order}` | `201 ProductImage` | |
| GET | `/categories` | Public | — | `200` tree of `Category` | FR-011 |
| POST | `/categories` | Admin | `{name, parent_id?}` | `201 Category` | |
| PATCH | `/categories/{id}` | Admin | `{name?, parent_id?, is_archived?}` | `200 Category` | |

Inventory (admin-only mutation, part of the Product resource per data-model):

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| PATCH | `/products/{id}/inventory` | Admin | `{stock_quantity?, low_stock_threshold?, adjust_by?}` | `200 {stock_quantity, low_stock_threshold, status}` | FR-036. Rejects a result `< 0` with `400 VALIDATION_ERROR`. |
