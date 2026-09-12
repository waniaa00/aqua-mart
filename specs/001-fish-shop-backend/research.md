# Phase 0 Research: Pet Fish Shop Backend API

All items below were resolvable directly from the user-supplied plan, the
ratified constitution (v2.0.0), and this project's existing frontend
implementation (`src/context/CurrencyContext.jsx`, README.md) — no unknown
was left as `NEEDS CLARIFICATION` in Technical Context.

## 1. ORM: SQLAlchemy vs. SQLModel

- **Decision**: Plain SQLAlchemy 2.0 (async engine/session) for ORM models, with a fully separate Pydantic v2 layer for request/response schemas.
- **Rationale**: The constitution (§3, §32) and the user's own Architecture Requirements explicitly state "Database models must remain separate from API schemas." SQLModel's core design merges a SQLAlchemy table model and a Pydantic schema into one class — convenient for small CRUD apps, but structurally in tension with that separation requirement once fish/product/order models grow domain-specific validation and multiple response shapes (e.g., a `Product` list-item shape vs. a full detail shape vs. an admin-only shape). Plain SQLAlchemy + separate `schemas/` keeps that boundary explicit and enforceable in code review.
- **Alternatives considered**: SQLModel (rejected — model/schema coupling); Tortoise ORM (rejected — smaller ecosystem, weaker Alembic-equivalent migration story than SQLAlchemy+Alembic, which the constitution mandates by name).

## 2. Authentication mechanism

- **Decision**: Stateless JWT access tokens (short-lived, e.g., 30–60 min) signed with a server-held `SECRET_KEY`, issued at login/registration; role (`customer`/`admin`) embedded as a claim; `Authorization: Bearer <token>` on protected routes. Passwords hashed with `bcrypt` called directly (not via `passlib`).
- **Rationale**: FastAPI's own security tooling (`fastapi.security.OAuth2PasswordBearer`) is built around bearer tokens; JWT avoids server-side session storage, keeping the API stateless and horizontally scalable, and cleanly carries the role claim FR-006/FR-007 need for authorization checks in route dependencies. bcrypt is a well-established, constitution-compliant ("hash passwords securely," §19) choice with mature Python support.
- **Amendment (implementation time)**: originally planned as `passlib[bcrypt]`. During Foundational implementation, `passlib` 1.7.4's bcrypt backend self-test (`detect_wrap_bug`) failed against `bcrypt` 4.x/5.x with `ValueError: password cannot be longer than 72 bytes` — a known incompatibility, since `passlib` is unmaintained and its self-test predates bcrypt's stricter 72-byte enforcement. Switched to calling `bcrypt.hashpw`/`bcrypt.checkpw` directly in `app/core/security.py`, and added an explicit 72-byte max-length check to `RegisterRequest`/`ChangePasswordRequest` password validation (`app/schemas/user.py`) so a legitimately long passphrase fails validation with a clear message instead of hitting bcrypt's hard limit. No behavior change from the customer's perspective; `passlib` was dropped from `pyproject.toml`.
- **Alternatives considered**: Server-side session cookies (rejected — adds session-store infrastructure not otherwise needed, and the user's own spec input says "session/token" without mandating cookies); Argon2 hashing (viable alternative to bcrypt, no strong reason to prefer it here — noted for a future security-hardening pass, roadmap Phase 18, if desired).

## 3. Testing approach

- **Decision**: `pytest` + `pytest-asyncio` + FastAPI's `httpx.ASGITransport`-based async test client, run against a dedicated test PostgreSQL database (Docker Compose Postgres locally / CI, or a disposable Neon branch) rather than SQLite.
- **Rationale**: The constitution mandates PostgreSQL/Neon; SQLite lacks full parity on constraints, `NUMERIC`/`DECIMAL` handling, and concurrent-transaction behavior that FR-037/FR-041 (oversell/overbooking prevention) specifically need to be tested against. Using real Postgres for tests avoids false confidence from a weaker substitute.
- **Alternatives considered**: SQLite in-memory (rejected — insufficient parity for the concurrency/decimal-precision requirements this spec calls out); `testcontainers-python` for ephemeral Postgres per test run (viable, deferred as an implementation-time choice between this and a Neon test branch — both satisfy the "real Postgres" requirement, so left as a `/sp.tasks`-time decision, not a planning blocker).

## 4. Exchange-rate provider & caching strategy

- **Decision**: Reuse the same free, key-less provider the existing frontend prototype already uses (`open.er-api.com`, per `src/context/CurrencyContext.jsx`), fetched server-side now (moving the source of truth for conversion to the backend per FR-018), cached for 12 hours (matching the frontend's existing TTL), with a fixed fallback-rate table used when the provider is unreachable and no cached rate exists (FR-019).
- **Rationale**: Consistency with a provider this project already depends on reduces new operational surface area (no new API key/config to manage) and matches the existing fallback-rate precedent already validated in the frontend. The backend becomes the authoritative source once this feature ships; the frontend's own client-side fetch (from the current prototype) is superseded, to be removed as part of the future frontend-integration feature (roadmap Phase 16), not this one.
- **Alternatives considered**: A paid provider with SLA guarantees (exchangerate.host, Open Exchange Rates) — noted as a reasonable future upgrade if uptime becomes an issue, but not required to satisfy FR-016 through FR-022 now.

## 5. Monetary precision

- **Decision**: Store money as fixed-precision `NUMERIC(12,4)` columns in Postgres, use Python `Decimal` throughout the service/schema layers, and only ever format to a currency's conventional decimal places at the API response boundary.
- **Rationale**: FR-022 explicitly forbids binary floating-point for money; `NUMERIC` + `Decimal` end-to-end is the standard, constitution-aligned (§11/§35 in the original combined doc) approach and avoids rounding-error classes of bugs entirely.
- **Alternatives considered**: Integer minor-units (cents) — a valid alternative, rejected only because multi-currency conversion with a floating exchange rate (e.g., PKR has no simple "cents" concept at consumer scale) makes `Decimal` arithmetic more directly traceable to the FR-018 response shape (`base_price`, `display_price`, `exchange_rate` all as decimals).

## 6. Appointment slot capacity & concurrency safety

- **Decision**: Model `AppointmentSlot` with an explicit `capacity` (admin-configured) and a `booked_count`; accept a new `Appointment` only inside a database transaction that re-checks `booked_count < capacity` with a row-level lock (`SELECT ... FOR UPDATE`) immediately before incrementing, per the Clarifications' "configurable capacity per slot" decision.
- **Rationale**: This is the standard safe pattern for preventing overbooking under concurrent requests (FR-041, SC-003) without needing a distributed lock service, and mirrors the same pattern used for inventory deduction (FR-037) — one consistent concurrency-safety technique reused across both hot paths.
- **Alternatives considered**: Optimistic concurrency (version column + retry) — viable, but row-level locking is simpler to reason about for the low-contention, low-volume-per-slot nature of appointment booking; noted as an option if profiling later shows lock contention.

## 7. Project layout: monorepo vs. separate frontend

- **Decision**: Add `backend/` as a sibling directory to the existing root-level frontend, rather than moving the frontend into a `frontend/` subdirectory to match the plan's generic "Option 2" diagram literally.
- **Rationale**: The existing frontend (`src/`, `index.html`, `vite.config.js`, `package.json`) is a working, previously-shipped prototype; relocating it is unrelated churn with no functional benefit to this feature and would violate the "smallest viable change" default policy. Root-level frontend + `backend/` sibling is a common, well-understood monorepo shape that still gives the backend its own `pyproject.toml`/dependency boundary.
- **Alternatives considered**: Moving frontend into `frontend/` now (rejected — unnecessary scope creep for a backend-only feature); a fully separate repository for the backend (rejected — the constitution and roadmap treat this as one project/platform, and a single repo simplifies the shared PHR/ADR/constitution governance already in place).
