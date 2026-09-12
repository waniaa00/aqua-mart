# Currency — `/api/v1/currency`

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/currency/rates` | Public | — | `200 {base_currency: "USD", rates: {USD: "1.0000", GBP: "0.79..", PKR: "280.50.."}, is_fallback}` | FR-019. Cached per research.md §4; `is_fallback=true` if served from the fallback table. |

Currency codes are validated against `USD`/`GBP`/`PKR` everywhere a
`?currency=` query param is accepted across other resource groups (catalog,
cart, orders); an unsupported code returns `400 INVALID_CURRENCY` (FR-020).
There is no separate "select currency" endpoint — setting a preference is
`PATCH /users/me` (see users-addresses.md), consistent with FR-021.
