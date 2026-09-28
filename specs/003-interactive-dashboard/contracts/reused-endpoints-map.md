# Reused Endpoint Map

Per research.md §1: this feature is almost entirely a frontend build
against endpoints that already exist and are already tested. This table
is the implementation reference — for each `spec.md` user story, exactly
which endpoint(s) power it, so nothing gets reinvented. "New/Extended"
entries link to their own contract file in this directory; everything
else is documented in `specs/001-fish-shop-backend/contracts/`.

| User Story | Endpoint(s) | Status |
|---|---|---|
| US1 Customer overview | `GET /orders?limit=…`, `GET /appointments`, `GET /wishlist`, `GET /users/me` | Existing |
| US2 Admin overview | `GET /admin/dashboard/summary` | Existing |
| US3 Admin order management | `GET /admin/orders`, `GET /admin/orders/{id}`, `PATCH /admin/orders/{id}/status` | [Extended](./admin-orders-extended.md) |
| US4 Order/appointment detail | `GET /orders/{id}`, `GET /appointments/{id}`, `POST /appointments/{id}/cancel` | Existing |
| US5 Wishlist widget | `GET /wishlist`, `DELETE /wishlist/items/{product_id}` | Existing (no frontend consumer yet) |
| US6 Notification center | `GET /notifications`, `POST /notifications/{id}/read`, `GET /admin/notifications` | Existing (no frontend consumer yet) — see research.md §2 for "unread" derivation |
| US7 Revenue & order analytics | `GET /admin/dashboard/analytics` | [New](./analytics.md) |
| US8 Inventory management | `GET /products`, `PATCH /products/{id}/inventory` | [Extended](./products-inventory-extended.md) (list filter/field) + existing (mutation) |
| US9 Global search | `GET /products?search=`, `GET /admin/orders?search=` (once extended), `GET /admin/customers?search=`, `GET /services` (client-side name filter — no `search` param on this small, rarely-paginated list) | Existing/Extended, composed client-side |
| US10 Admin appointment management | `GET /admin/appointments`, `PATCH .../status`, `POST .../reschedule` | Existing |
| US11 Admin customer management | `GET /admin/customers`, `GET /admin/customers/{id}` | Existing |
| US12 Review moderation | `GET /products/{id}/reviews`, `DELETE /admin/reviews/{id}` | Existing (no frontend consumer yet) |
| US13 Promotion management | `GET/POST/PATCH/DELETE /admin/promotions` | Existing (no frontend consumer yet) |
| US14 Product & category management | `POST/PATCH /products`, `POST/PATCH /categories` | Existing (no frontend consumer yet) |
| US15 Service management | `POST/PATCH /services`, `POST/PATCH /admin/services/{id}/slots`, `PATCH /admin/slots/{id}` | Existing (no frontend consumer yet) |
| US16 Customer activity feed | `GET /orders`, `GET /appointments`, `GET /wishlist`, reviews (endpoint TBD — verify a per-customer review listing exists; US12's row only lists a per-*product* one) | Composed client-side, same pattern as US9's global search — no dedicated activity-log endpoint |
| Currency selector (cross-cutting) | `PATCH /users/me` (`preferred_currency`) | Existing — already wired this session |

## Notes for implementers

- "Existing (no frontend consumer yet)" endpoints are fully built and
  tested on the backend (per `001-fish-shop-backend`'s 48-test suite) —
  this feature is purely their first UI, not new backend risk.
- US9's global search intentionally has no single backend endpoint; it
  fans out to 2–4 existing per-resource searches in parallel and groups
  the results client-side (FR-029). This keeps the backend simple (no new
  cross-resource search index) at the cost of a few small parallel
  requests, acceptable at this app's scale (constitution §34).
- Every "Existing" row's auth/ownership rules are unchanged from their
  original contract — this feature does not alter who can call what, only
  builds UI on top.
