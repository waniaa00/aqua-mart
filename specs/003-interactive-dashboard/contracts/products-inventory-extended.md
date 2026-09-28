# Contract: `GET /api/v1/products` extension (inventory view)

FR-015. Extends the existing, already-shipped catalog endpoint
(`specs/001-fish-shop-backend/contracts/catalog.md`) — same path, same
auth (Public; the dashboard's admin inventory view calls it as an
authenticated admin, but the parameter works the same for anyone). Only a
new filter parameter and one new response field.

## New query parameter

| Param | Type | Notes |
|---|---|---|
| `stock_status` | `in_stock\|low_stock\|out_of_stock` | Computed from each product's `Inventory.stock_quantity` vs. `low_stock_threshold` (already eager-loaded by the existing query, per research.md §3b) — no new join |

Composes with existing filters (`category`, `product_type`, etc.) with AND
semantics, same as every other filter this endpoint already supports.

## Response change

`ProductListItem` gains one field:

```json
{
  "...": "existing fields unchanged",
  "stock_quantity": 3
}
```

- Harmless to expose on the public shop listing (a plain integer, not a
  business secret); the admin inventory table is simply the first
  consumer that needs it in a list view. `ProductDetail` already returns
  `stock_quantity` today — this just adds it to the *list* response too.
- `low_stock_threshold` is intentionally **not** added to the public list
  response (it's an operational detail, not customer-facing information);
  the admin inventory view reads it per-product via the existing
  `GET /products/{slug}` (`ProductDetail`, which already includes it).

**No new endpoint, no schema change** — `Inventory` is unchanged; this is
a query-filter and response-field addition only.
