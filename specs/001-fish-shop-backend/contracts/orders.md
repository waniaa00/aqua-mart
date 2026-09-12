# Orders — `/api/v1/orders`

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/orders` | Owner | `{address_id}` (checks out current cart) | `201 Order` (status `pending`) | FR-030..FR-033. Transactional per data-model.md; `422 INSUFFICIENT_STOCK` aborts with no partial state. Never accepts a client-submitted total (FR-031). |
| GET | `/orders` | Owner | pagination | `200` paginated own `Order` list | FR-035 |
| GET | `/orders/{id}` | Owner | — | `200 Order` (with `items`) | `404 NOT_FOUND` if not owned |
| GET | `/admin/orders` | Admin | query: `status, search, page, limit` | `200` paginated `Order` list, all customers | FR-049 |
| GET | `/admin/orders/{id}` | Admin | — | `200 Order` + customer fulfillment info | |
| PATCH | `/admin/orders/{id}/status` | Admin | `{status}` | `200 Order` | FR-034. Must be a valid forward transition (e.g., cannot go `completed` → `pending`); invalid transition → `400 VALIDATION_ERROR`. |
| POST | `/admin/orders/{id}/cancel` | Admin | — | `200 Order` (status `cancelled`) | Restocks inventory transactionally |

Order status enum: `pending`, `confirmed`, `processing`, `ready_for_delivery`,
`out_for_delivery`, `completed`, `cancelled` (FR-034).
