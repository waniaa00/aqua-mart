# Notifications — `/api/v1/notifications`

Notifications are recorded as events (constitution §24/§29; FR-052/FR-053);
delivery channel is an implementation detail behind a service abstraction,
not part of this API contract's guarantees beyond "the event was recorded."

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/notifications` | Owner | pagination | `200` paginated own `Notification` list | In-app notification center for a customer |
| POST | `/notifications/{id}/read` | Owner | — | `200` | Marks `delivered_at`/read state (implementation detail) |
| GET | `/admin/notifications` | Admin | `?event_type=low_stock_alert` | `200` paginated list, `recipient_user_id IS NULL` rows (admin-addressed) | FR-053 |

Notification creation is **not** a directly callable endpoint — rows are
inserted by other services (`order_service`, `appointment_service`,
`inventory_service`) as a side effect of the triggering event, inside or
immediately after the same transaction, per FR-052/FR-053. A notification
failure must never roll back or block the triggering transaction (constitution
§24: "External failures must produce controlled application errors" —
notification delivery is treated as best-effort, not transactional with the
core operation).
