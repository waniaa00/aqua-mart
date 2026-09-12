# Services & Appointments — `/api/v1/services`, `/api/v1/appointments`

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/services` | Public | `?active=true` | `200 [Service...]` | FR-038 |
| GET | `/services/{id}` | Public | — | `200 Service` | |
| POST | `/services` | Admin | Service fields | `201 Service` | |
| PATCH | `/services/{id}` | Admin | partial Service fields (incl. `is_active`) | `200 Service` | |
| GET | `/services/{id}/slots` | Public | `?date=YYYY-MM-DD` | `200 [{slot_id, date, start_time, remaining_capacity}]` | Only unblocked slots with `remaining_capacity > 0` shown as available |
| POST | `/admin/services/{id}/slots` | Admin | `{date, start_time, capacity}` | `201 AppointmentSlot` | FR-041 |
| PATCH | `/admin/slots/{id}` | Admin | `{capacity?, is_blocked?}` | `200 AppointmentSlot` | Blocking does not cancel existing appointments (edge case in spec.md) |
| POST | `/appointments` | Owner | `{service_id, slot_id, address_id?, notes?}` | `201 Appointment` (status `pending`) | FR-039..FR-041. Transactional slot-capacity check (data-model.md); `422 SLOT_UNAVAILABLE` on full/blocked/inactive-service. |
| GET | `/appointments` | Owner | pagination | `200` paginated own `Appointment` list | FR-042 |
| GET | `/appointments/{id}` | Owner | — | `200 Appointment` | `404 NOT_FOUND` if not owned |
| POST | `/appointments/{id}/cancel` | Owner | — | `200 Appointment` (status `cancelled`) | Decrements slot `booked_count`; subject to cancellation-window rule (implementation detail, `/sp.tasks`) |
| GET | `/admin/appointments` | Admin | query: `date, status, page, limit` | `200` paginated `Appointment` list, all customers | FR-050 |
| PATCH | `/admin/appointments/{id}/status` | Admin | `{status}` | `200 Appointment` | statuses: `pending,confirmed,in_progress,completed,cancelled,no_show` |
| POST | `/admin/appointments/{id}/reschedule` | Admin | `{new_slot_id}` | `200 Appointment` | Atomically releases old slot capacity and claims new slot capacity |
