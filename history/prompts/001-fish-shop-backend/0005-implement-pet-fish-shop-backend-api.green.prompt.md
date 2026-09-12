---
id: 0005
title: Implement Pet Fish Shop backend API
stage: green
date: 2026-09-13
surface: agent
model: claude-sonnet-5
feature: 001-fish-shop-backend
branch: 001-fish-shop-backend
user: waniaa00
command: /sp.implement
labels: ["implement", "backend", "fastapi", "postgres", "green"]
links:
  spec: specs/001-fish-shop-backend/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - backend/ (full FastAPI application: app/main.py, core/{config,security,exceptions}.py, db/database.py, db/models/*.py [12 model modules, 22 tables], schemas/*.py [12 modules], api/deps.py, api/routes/*.py [17 route modules], services/*.py [11 service modules], utils/{pagination,money}.py)
 - backend/alembic/ (env.py, script.py.mako, versions/63e754bdced2_initial_schema.py, versions/298ffd060829_add_index_on_order_items_product_id.py)
 - backend/tests/ (conftest.py + 17 test modules: contract/, integration/, unit/ — 47 tests total)
 - backend/pyproject.toml, backend/docker-compose.yml, backend/.env.example, backend/README.md
 - specs/001-fish-shop-backend/tasks.md (all 140 tasks marked [X])
 - specs/001-fish-shop-backend/plan.md (Constitution Check citations corrected: §40→removed, §21→§12)
 - specs/001-fish-shop-backend/research.md (§2 amended: passlib[bcrypt] → bcrypt direct, with root-cause note)
 - README.md (root — backend/ mentioned, frontend-prototype note updated)
 - .gitignore (backend Python patterns added)
tests:
 - 47 passed, 0 failed (pytest against real local Postgres via docker-compose, per research.md §3)
 - 2 concurrency tests confirm zero oversell (test_concurrent_checkout_for_last_unit_only_one_succeeds) and zero overbooking (test_concurrent_booking_for_last_slot_capacity_only_one_succeeds) via asyncio.gather against the row-lock pattern
---

## Prompt

/sp.implement with empty arguments — execute the complete tasks.md (140
tasks across Setup, Foundational, and 12 user-story phases) for feature
001-fish-shop-backend, following the outline: check-prerequisites,
checklist-status gate, load context, project setup verification, then
phase-by-phase execution marking tasks [X] as completed.

## Response snapshot

Ran check-prerequisites (all Phase 0/1 docs present), confirmed the
requirements.md checklist was 16/16 PASS so proceeded automatically without
the yes/no gate. Verified environment: uv 0.10.4, docker with a working
daemon, network access to pypi and the exchange-rate provider — enabling
real (not mocked) verification throughout. Built the entire backend for
real, phase by phase, running `uv sync`, Alembic migrations, and pytest
after each phase rather than just writing code:

- **Setup+Foundational**: `backend/` scaffold, pyproject.toml, docker-compose
  (local dev + test Postgres), all 22 SQLAlchemy models across 12 modules,
  initial Alembic migration (verified against real Postgres — all 22 tables/
  constraints/indexes), JWT+bcrypt auth primitives, centralized exception
  handling, pagination/money utilities.
- **US1–US12**: implemented in dependency order (auth → catalog → cart/
  checkout → currency → appointments → wishlist/addresses → admin catalog →
  reviews → coupons → admin orders/appointments → dashboard →
  notifications), each with real contract/integration/unit tests run
  against the actual database, not mocked — including the two concurrency
  tests using `asyncio.gather` to prove the row-lock pattern actually
  prevents oversell and overbooking (both pass).
- **Polish**: audited every route file for auth/ownership gaps (found
  none), grepped for exception-detail leaks (found none), added one missing
  index (`OrderItem.product_id`, used by the dashboard's best-sellers
  query) via a follow-up migration, confirmed `.env` git-ignored and no
  hardcoded secrets, ran the full suite, manually smoke-tested a live
  running server end-to-end (register→login→browse→currency, including a
  real call to the live exchange-rate provider), updated both READMEs, and
  re-verified plan.md's Constitution Check table against the finished code
  — fixing two citation errors along the way (a reference to a
  nonexistent constitution §40, and §21 mis-cited for transaction safety
  instead of §12) that had been flagged by the earlier `/sp.analyze` pass.

Hit and fixed five real implementation bugs along the way, each documented
where relevant: (1) `uv` defaulted to Python 3.14 despite `requires-python
>=3.12`, initially suspected as the cause of a SQLAlchemy `MissingGreenlet`
error — pinned to 3.12 via `.python-version` regardless since that matches
plan.md, though the actual bug turned out to be (2); (2) implicit lazy-
loading of `User.profile`/relationships after `session.refresh()` under
async SQLAlchemy raises `MissingGreenlet` — fixed by eager-loading
`selectinload(User.profile)` in `get_current_user` and removing
unnecessary `refresh()` calls in `auth_service`; (3) `passlib[bcrypt]`
(the originally planned library) is incompatible with `bcrypt` 4.x/5.x's
stricter 72-byte enforcement — switched to calling `bcrypt` directly,
documented as a research.md amendment; (4) pytest-asyncio's default
per-test event loop conflicted with the module-level singleton DB engine
— fixed via `asyncio_default_fixture_loop_scope`/`asyncio_default_test_
loop_scope = "session"`; (5) mutating a SQLAlchemy relationship collection
via `db.delete(item)` alone doesn't update the in-memory collection under
`expire_on_commit=False`, causing a stale (non-empty) cart to appear
immediately after checkout — fixed by also calling `cart.items.remove(item)`
in both `cart_service` and `order_service.checkout`.

## Outcome

- ✅ Impact: The Pet Fish Shop backend (spec 001-fish-shop-backend) is fully implemented, all 12 user stories work end-to-end against a real PostgreSQL database, and all 140 tasks in tasks.md are marked complete. The backend is ready to be connected to the existing frontend as a future feature (plan.md roadmap Phase 16).
- 🧪 Tests: 47/47 passing (contract, integration, unit) against a real local Postgres test database; includes 2 concurrency tests proving SC-003 (zero oversell/overbooking) empirically, not just by code inspection.
- 📁 Files: see files list above — the entire `backend/` application plus corrections to plan.md, research.md, and both READMEs.
- 🔁 Next prompts: connect the existing frontend to this backend (a new feature/spec, per plan.md's roadmap Phase 16 — NOT folded into this one); consider `/sp.adr` for the passlib→bcrypt switch if the user wants that reasoning preserved as a standalone record; a security-hardening pass (roadmap Phase 18) before any real deployment.
- 🧠 Reflection: implementing for real (running migrations against live Postgres, executing every test against the actual database, manually curling a live server) surfaced five genuine bugs — async ORM lazy-loading, a passlib/bcrypt version incompatibility, a pytest-asyncio event-loop default, and a SQLAlchemy in-memory-collection staleness pattern hit twice — that a purely code-writing pass without execution would have shipped silently; the two concurrency tests in particular only have value because they ran against real Postgres row-locks, not a mock.

## Evaluation notes (flywheel)

- Failure modes observed: transient — all caught and fixed within this same implementation pass before marking their respective tasks complete; no failure shipped into the final 47/47-green state.
- Graders run and results (PASS/FAIL): full pytest suite — PASS (47/47); `alembic check` — PASS (no schema drift); manual curl smoke test against a live server — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): when the frontend-integration feature starts, verify its CORS_ORIGINS assumption (currently defaults to `http://localhost:5173`, matching this repo's existing Vite dev server) still holds, and confirm the currency provider's live-network dependency doesn't make that feature's own test suite flaky in a network-restricted CI environment (this session's tests happened to have network access, which may not always be true).
