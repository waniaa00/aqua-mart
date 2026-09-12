# Users & Addresses — `/api/v1/users`

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/users/me` | Owner | — | `200 {id, email, name, role, preferred_currency}` | FR-005 |
| PATCH | `/users/me` | Owner | `{name?, preferred_currency?}` | `200` updated profile | FR-005, FR-021. `400 VALIDATION_ERROR` on unsupported currency. |
| GET | `/users/me/addresses` | Owner | — | `200 [Address...]` | FR-027 |
| POST | `/users/me/addresses` | Owner | Address fields (FR-028) | `201 Address` | |
| PATCH | `/users/me/addresses/{id}` | Owner | partial Address fields | `200 Address` | `404 NOT_FOUND` if not owned |
| DELETE | `/users/me/addresses/{id}` | Owner | — | `204` | Does not affect past orders' address snapshots (FR-029) |
| POST | `/users/me/addresses/{id}/default` | Owner | — | `200 Address` | Unsets previous default atomically |
| GET | `/users/me/orders` | Owner | pagination | `200` paginated `Order` list | FR-035 |
| GET | `/users/me/appointments` | Owner | pagination | `200` paginated `Appointment` list | FR-042/FR-043 |
