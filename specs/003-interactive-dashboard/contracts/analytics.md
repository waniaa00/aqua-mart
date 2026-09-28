# Contract: Admin Revenue & Order Analytics (new endpoint)

FR-021–FR-023, FR-025. The only genuinely new backend endpoint this
feature adds — everything else in this directory documents extensions to
existing endpoints. Error format, pagination envelope, and Money shape
follow `specs/001-fish-shop-backend/contracts/README.md`.

## `GET /api/v1/admin/dashboard/analytics`

**Auth**: Admin.

**Query parameters**:

| Param | Type | Required | Notes |
|---|---|---|---|
| `range` | `today\|7d\|30d\|90d\|12mo\|custom` | Yes | |
| `start`, `end` | ISO date (`YYYY-MM-DD`) | Only when `range=custom` | `end` MUST NOT be before `start`; span MUST NOT exceed 366 days |
| `compare` | `none\|previous` | No, default `previous` | Omitted from the response when no previous period is well-defined (e.g. a custom range with no equivalent prior span) |

**Success response** `200`:

```json
{
  "range": { "start": "2026-08-25", "end": "2026-09-24" },
  "granularity": "day",
  "series": [
    { "date": "2026-08-25", "revenue": "123.45", "order_count": 4 }
  ],
  "totals": {
    "revenue": "3456.78",
    "order_count": 112,
    "average_order_value": "30.86"
  },
  "comparison": {
    "previous_totals": { "revenue": "3100.00", "order_count": 98, "average_order_value": "31.63" },
    "absolute_diff": { "revenue": "356.78", "order_count": 14, "average_order_value": "-0.77" },
    "percentage_diff": { "revenue": "11.51", "order_count": 14.29, "average_order_value": "-2.43" }
  }
}
```

- `granularity` is server-chosen (see research.md §3): `day` for
  `today`/`7d`/`30d`, `week` for `90d`, `month` for `12mo` and custom spans
  over ~60 days, `day` otherwise for shorter custom spans.
- `revenue`/`order_count` only include orders in the same
  revenue-counting statuses `admin_service.get_dashboard_summary` already
  uses (`REVENUE_STATUSES`) — kept consistent with the existing KPI
  snapshot rather than introducing a second definition of "revenue."
- Amounts are plain USD decimal strings (not the `Money` shape) —
  consistent with the existing `/admin/dashboard/summary` endpoint's
  `total_sales`, which is also not currency-converted (admin reporting is
  USD-only across this backend today).
- `comparison` is omitted entirely (not `null`) when `compare=none` or no
  previous period applies.

**Errors**:

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `start`/`end` for `range=custom`; `end` before `start`; span > 366 days; unknown `range`/`compare` value |
| 401/403 | `UNAUTHENTICATED`/`FORBIDDEN` | Not logged in / not an admin |

**Empty case**: `range` with zero matching orders returns `200` with an
empty `series` and all-zero `totals` (never a 404 or 500) — FR-030,
User Story 7 acceptance scenario 5.
