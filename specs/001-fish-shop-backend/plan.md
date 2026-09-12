# Implementation Plan: Pet Fish Shop Backend API

**Branch**: `001-fish-shop-backend` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fish-shop-backend/spec.md`

## Summary

This plan implements the backend API defined in `spec.md`: authentication and
roles, a fish/aquarium product catalog with search/filter/sort/pagination,
multi-currency pricing (USD/GBP/PKR), cart, wishlist, addresses, orders with
authoritative server-side pricing and transaction-safe inventory, aquarium
service appointments with capacity-limited slots, reviews, single-coupon
promotions, admin catalog/order/appointment management, dashboard statistics,
and notification events — as versioned (`/api/v1/`) REST APIs built with
FastAPI over Neon PostgreSQL, per the ratified project constitution (v2.0.0).

The user also supplied a full 21-phase platform roadmap (Foundation through
Production Readiness) covering this backend plus frontend integration, the
3D/immersive experience, and platform-wide security/performance/QA/production
hardening. That roadmap is preserved in full under "Full Platform Roadmap
(reference)" below. Per the constitution's Phase Discipline principle ("do not
implement future-phase features prematurely") and this being a single-feature
plan scoped to `spec.md`, this document's concrete Technical Context,
Constitution Check, Project Structure, and Phase 0/1 design artifacts cover
only the **backend** (roadmap Phases 1–15, which map onto spec.md's FR-001
through FR-058). Frontend integration (roadmap Phase 16), the 3D experience
(Phase 17), and platform-wide hardening/performance/QA/production phases
(18–21) are out of this feature's scope and will each become their own future
feature spec once this backend exists, rather than being folded into this plan.

## Technical Context

**Language/Version**: Python 3.12 (backend); existing frontend stays on its current React 19 / Vite stack — untouched by this feature
**Primary Dependencies**: FastAPI, Pydantic v2 (+ pydantic-settings), SQLAlchemy 2.0 (async), Alembic, HTTPX, PyJWT, bcrypt (used directly, not via Passlib — see research.md §2 amendment), uv (dependency/venv management)
**Storage**: PostgreSQL via Neon (serverless Postgres), one database for this feature; Alembic-managed schema
**Testing**: pytest + pytest-asyncio + httpx.ASGITransport (FastAPI's recommended async test client) against a dedicated test Postgres database (a local Postgres via Docker Compose, or a disposable Neon branch)
**Target Platform**: Linux server (containerized), consumed by a browser-based frontend over HTTPS
**Project Type**: Web application — new `backend/` service added alongside the existing root-level frontend (see Structure Decision)
**Performance Goals**: Standard interactive web-API latency (sub-second p95 for catalog/cart/order reads under light load); no high-throughput/real-time requirement stated in spec.md
**Constraints**: All financial calculations decimal-safe (no binary float for money, FR-022); all inventory/appointment-capacity decrements safe under concurrent requests (FR-037, FR-041); no real payment processing in this scope (FR-033); admin vs. customer authorization enforced server-side on every protected route (FR-006, FR-007)
**Scale/Scope**: Small-to-medium single-tenant shop (per constitution's Scalability principle: "simple enough for a small business" while allowing future growth); ~22 data entities per spec.md Key Entities / data-model.md; 15 REST resource groups (`/api/v1/auth`, `users`, `products`, `categories`, `inventory`, `cart`, `wishlist`, `orders`, `services`, `appointments`, `reviews`, `promotions`, `currency`, `notifications`, `admin`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against `.specify/memory/constitution.md` v2.0.0:

| Principle | Gate | Status |
|---|---|---|
| §2.1 Backend stack (Python/FastAPI/Pydantic/SQLAlchemy-or-SQLModel/PostgreSQL/Neon/Alembic/uv) | Technical Context MUST use exactly this stack | ✅ PASS — see Technical Context; SQLAlchemy chosen over SQLModel, justified in research.md |
| §2.2 Frontend never directly accesses the production DB | This feature adds no frontend DB access | ✅ PASS — backend-only feature; frontend integration is a future feature |
| §3 Modular architecture, models/schemas/routes/business-logic/DB-ops/tests separated per domain | Project Structure MUST show this separation | ✅ PASS — see Project Structure |
| §4 API-First, `/api/v1/` prefix, predictable/versioned/documented | Contracts MUST use `/api/v1/` and be documented | ✅ PASS — see contracts/ |
| §5 Neon Postgres primary DB, Alembic migrations, referential integrity | Data model MUST specify keys/constraints/indexes | ✅ PASS — see data-model.md |
| §9/§12/§32 Data integrity, transaction-safe critical operations | Data model MUST call out transactional boundaries | ✅ PASS — see data-model.md "Transactional operations" |
| §11 Currency: single base price, no permanently duplicated per-currency prices | Data model MUST NOT add a price-per-currency table | ✅ PASS — Product has one base_price/base_currency; CurrencyRate is a rate cache, not a price store |
| §19 Security (hashing, RBAC, ownership validation, secrets via env) | Contracts MUST mark auth/role requirements per endpoint | ✅ PASS — see contracts/*.md "Auth" column |
| §20/§21 Centralized error handling & validation at the API boundary | Contracts MUST define a shared error shape | ✅ PASS — see contracts/README.md error format |
| §25 Environment configuration, no secrets committed | quickstart.md MUST document `.env.example` | ✅ PASS — see quickstart.md |
| §27 Phase Discipline — no premature future-phase work | Frontend/3D/hardening phases MUST be excluded from this plan's concrete scope | ✅ PASS — see Summary |
| §31 No Fake Functionality (e.g., no fake payment success) | Data model/contracts MUST NOT model a fake "paid" state | ✅ PASS — Order has no payment-status field in this scope, per spec.md FR-033/Assumptions |

No violations requiring justification; Complexity Tracking table is empty.

*Post Phase 1 re-check: unchanged — data-model.md and contracts/ were built directly against this table's requirements; see "Post-Design Constitution Check" at the end of this file.*

## Project Structure

### Documentation (this feature)

```text
specs/001-fish-shop-backend/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
│   ├── README.md
│   ├── auth.md
│   ├── users-addresses.md
│   ├── catalog.md
│   ├── currency.md
│   ├── cart-wishlist.md
│   ├── orders.md
│   ├── services-appointments.md
│   ├── reviews.md
│   ├── promotions.md
│   ├── notifications.md
│   └── admin.md
└── checklists/
    └── requirements.md   # already created by /sp.specify
```

### Source Code (repository root)

The existing frontend (`src/`, `index.html`, `vite.config.js`, `package.json`
at repo root) is untouched by this feature. A new `backend/` directory is
added alongside it — this repo becomes a light monorepo, matching the
"Web application" structure while avoiding an unrelated, out-of-scope move
of the existing frontend into a `frontend/` subdirectory:

```text
backend/
├── app/
│   ├── main.py                    # FastAPI app factory, router mounting, startup/shutdown
│   ├── core/
│   │   ├── config.py              # pydantic-settings, reads .env
│   │   ├── security.py            # password hashing, JWT issue/verify
│   │   └── exceptions.py          # centralized exception → structured error response
│   ├── db/
│   │   ├── database.py            # async engine/session factory
│   │   └── models/                # SQLAlchemy ORM models, one module per domain
│   │       ├── user.py            # User, UserProfile
│   │       ├── address.py
│   │       ├── category.py
│   │       ├── product.py         # Product, ProductImage, FishDetails, Inventory
│   │       ├── cart.py            # Cart, CartItem
│   │       ├── wishlist.py        # Wishlist, WishlistItem
│   │       ├── order.py           # Order, OrderItem
│   │       ├── service.py         # Service, Appointment, AppointmentSlot
│   │       ├── review.py
│   │       ├── promotion.py       # Promotion, Coupon
│   │       ├── currency.py        # CurrencyRate
│   │       └── notification.py
│   ├── schemas/                   # Pydantic request/response models, one module per domain (mirrors db/models/)
│   ├── api/
│   │   └── routes/                # thin FastAPI routers, one per resource group; call services, return schemas
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── products.py
│   │       ├── categories.py
│   │       ├── inventory.py
│   │       ├── cart.py
│   │       ├── wishlist.py
│   │       ├── orders.py
│   │       ├── services.py
│   │       ├── appointments.py
│   │       ├── reviews.py
│   │       ├── promotions.py
│   │       ├── currency.py
│   │       ├── notifications.py
│   │       └── admin.py
│   ├── services/                  # business logic, one module per domain (per constitution §3/§32)
│   │   ├── auth_service.py
│   │   ├── product_service.py
│   │   ├── inventory_service.py
│   │   ├── cart_service.py
│   │   ├── order_service.py
│   │   ├── appointment_service.py
│   │   ├── currency_service.py
│   │   ├── review_service.py
│   │   ├── promotion_service.py
│   │   ├── notification_service.py
│   │   └── admin_service.py
│   └── utils/                     # pagination helpers, decimal-safe money helpers, slugify, etc.
├── alembic/
│   ├── env.py
│   └── versions/
├── tests/
│   ├── contract/                  # one test module per contracts/*.md, asserts request/response shape + status codes
│   ├── integration/                # end-to-end flows: register→login→browse→cart→checkout, book appointment, etc.
│   └── unit/                       # service-layer logic: currency conversion, discount math, slot-capacity checks
├── .env.example
└── pyproject.toml
```

**Structure Decision**: Add a new `backend/` FastAPI service at the repo root
per the constitution's mandated stack and modular-architecture principle
(§3/§32: thin routes, business logic in `services/`, DB models separate from
API `schemas/`). The existing frontend stays exactly where it is; connecting
it to this backend is deliberately deferred to a future "frontend
integration" feature (roadmap Phase 16), keeping this plan's diff limited to
what `spec.md` actually specifies.

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*

## Post-Design Constitution Check

Re-verified after Phase 1 (data-model.md, contracts/, quickstart.md were
written): still ✅ PASS on every row above. Notably: `data-model.md` confirms
`Product` carries exactly one `base_price`/`base_currency` (§11), `Order` has
no fabricated payment-success field (§31), every entity in `data-model.md`
has explicit keys/constraints/indexes (§5), and every endpoint in `contracts/`
states its required role, matching §19's ownership/RBAC requirement.

## Full Platform Roadmap (reference)

The user-authored plan input described the following 21-phase, full-platform
roadmap. It is preserved here verbatim as project context for future features
(frontend integration, 3D experience, and platform-wide hardening phases);
this plan's concrete design work above covers Phases 1–15 only, matching the
backend scope of `spec.md`.

1. Project Foundation — Python/uv/FastAPI setup, React app setup, Neon connection, health check, API versioning, error-handling foundation.
2. Database Architecture — all 22 models, keys/relationships/constraints/indexes, Alembic migrations.
3. Authentication and User Management — registration, login, profile, roles, resource-ownership validation.
4. Product Catalog — all product types, fields, fish details, admin management.
5. Search, Filtering, Sorting, and Pagination.
6. Multi-Currency System — USD/GBP/PKR, conversion, caching, preference persistence.
7. Inventory Management — stock tracking, thresholds, transaction-safe updates.
8. Shopping Cart and Wishlist.
9. Orders and Checkout — full order flow, statuses, transaction safety.
10. Aquarium Services — service catalog, admin management.
11. Appointment Booking — scheduling, capacity, conflict prevention.
12. Reviews and Ratings.
13. Promotions and Discounts — coupon validation rules.
14. Notifications — event-driven, abstracted delivery channel.
15. Admin Dashboard — statistics and cross-domain admin management.
16. Frontend Integration — connect the existing React frontend to this backend; **out of this feature's scope**.
17. 3D and Immersive Experience — Three.js/R3F enhancements; **out of this feature's scope**.
18. Security Hardening — full security review across the whole platform; **out of this feature's scope** (though §19/§37 constitution gates already apply to this feature's own design).
19. Performance Optimization — platform-wide, post-stability; **out of this feature's scope**.
20. Testing and Quality Assurance — full-system integration/edge-case pass across frontend+backend; **out of this feature's scope** (this feature's own `tests/` are in-scope, see Project Structure).
21. Production Readiness — deployment configuration and documentation for the whole platform; **out of this feature's scope**.

MVP scope (per the user's input): Phases 1–11 + basic admin management —
i.e., everything this plan's backend covers except Reviews (12), Promotions
(13), and Notifications (14), which spec.md still includes as P3 stories.
Post-MVP scope named by the user (advanced notifications/promotions/
analytics, 3D, AI advisor, fish compatibility checker, loyalty points,
subscriptions, gift cards, delivery tracking, multi-vendor) is out of scope
for this feature and is not modeled in data-model.md.
