# Auth — `/api/v1/auth`

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/auth/register` | Public | `{name, email, password}` | `201` `{id, email, role}` | FR-001/002/003. `409 EMAIL_ALREADY_REGISTERED` on duplicate. Password hashed before storage. |
| POST | `/auth/login` | Public | `{email, password}` | `200 {access_token, token_type: "bearer"}` | FR-004. `401 UNAUTHENTICATED` for either wrong email or wrong password — same message, no field hint. |
| POST | `/auth/change-password` | Owner | `{current_password, new_password}` | `204` | FR-005. `400 VALIDATION_ERROR` if `current_password` wrong. |

Token: JWT bearer, `role` claim used by route dependencies to gate Admin
endpoints (FR-006). No `/auth/forgot-password` in this scope (see spec.md
Assumptions).
