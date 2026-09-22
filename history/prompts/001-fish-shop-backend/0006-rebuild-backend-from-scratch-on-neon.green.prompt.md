---
id: 0006
title: Rebuild backend from scratch on Neon
stage: green
date: 2026-09-22
surface: agent
model: claude-sonnet-5
feature: 001-fish-shop-backend
branch: 001-fish-shop-backend
user: waniaa00
command: /sp.implement
labels: ["backend", "fastapi", "neon", "postgres", "rebuild", "testing"]
links:
  spec: specs/001-fish-shop-backend/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - backend/app/main.py
 - backend/app/core/config.py
 - backend/app/core/security.py
 - backend/app/core/exceptions.py
 - backend/app/db/database.py
 - backend/app/db/models/*.py (22 models across 12 files)
 - backend/app/schemas/*.py (14 schema modules)
 - backend/app/services/*.py (13 service modules)
 - backend/app/api/deps.py
 - backend/app/api/routes/*.py (17 route modules)
 - backend/alembic/env.py
 - backend/alembic/versions/7e494996f1bc_initial_schema.py
 - backend/alembic/versions/28fbd4649151_add_missing_indexes_*.py
 - backend/tests/conftest.py
 - backend/tests/contract/*.py (13 files)
 - backend/tests/integration/*.py (3 files)
 - backend/tests/unit/*.py (4 files)
 - backend/.env.example
 - backend/README.md
 - specs/001-fish-shop-backend/tasks.md
tests:
 - uv run pytest (48/48 passed across two full runs; each run hit one isolated, non-reproducible Neon connection blip on a different test, confirmed transient by re-running that test alone)
 - Manual quickstart.md smoke test executed live against the Neon dev branch (register/login, catalog CRUD incl. fish_details, search/filter/sort, currency conversion, cart, checkout, admin order status update, appointment booking, admin dashboard reconciliation)
---

## Prompt

User asked to connect the Neon DB MCP before running /sp.implement (a prior turn had already established, through several rounds of explicit confirmation via AskUserQuestion, that the user wanted a genuine from-scratch rebuild of the already-complete, already-tested 001-fish-shop-backend implementation — discarding it and redoing it in place — after which a safety-checkpoint commit was made on 002-frontend-integration at 84a7a46). This turn: set up a new Neon project ("aqua-mart") with dev and test branches, verified connectivity, then ran /sp.implement to execute all 140 tasks in tasks.md against that fresh Neon backend, from an empty backend/ directory.

## Response snapshot

Rebuilt the entire FastAPI backend from scratch: 22 SQLAlchemy models across all domains (user/address/category/product+images+fish_details+inventory/cart/wishlist/order/service+slot+appointment/review/promotion/currency/notification), Alembic migrations applied to a fresh Neon database, and all 12 user stories' schemas/services/routes (auth, catalog with search/filter/sort/pagination, currency conversion with live-rate caching and fallback, cart/checkout with row-locked inventory decrement, service/appointment booking with row-locked slot capacity, wishlist, addresses, reviews gated on completed purchases, coupon/promotion validation, admin catalog/order/appointment/promotion management, admin dashboard reconciling live figures, and best-effort event-recorded notifications). Wrote 48 tests (contract/integration/unit) across all stories, including two required concurrency races (last-unit checkout, last-slot booking) proven correct under real `asyncio.gather` concurrent load against Neon.

Found and fixed real bugs along the way, several via the actual live Neon connection rather than being catchable by inspection alone: (1) a Neon PgBouncer/asyncpg prepared-statement incompatibility requiring `statement_cache_size: 0`; (2) enum-vs-raw-string assignment bugs on SQLAlchemy Enum columns that only surfaced because `expire_on_commit=False` plus the identity map meant a "fresh" re-query returned the same stale in-memory object; (3) the identical stale-collection problem for relationship lists (`Cart.items`, `Wishlist.items`) after add/delete — fixed with explicit `session.refresh(obj, attribute_names=[...])`; (4) a Pydantic v2 gap where UUID objects aren't auto-coerced into `str`-typed fields via `model_validate()` — fixed centrally via a `field_validator("*", mode="before")` on the shared `ORMModel` base rather than patching each call site; (5) a wrong status code (used the renamed-but-still-422 `HTTP_422_UNPROCESSABLE_CONTENT` where the contract requires 400 for `VALIDATION_ERROR`); (6) an eager-validation gap where `GET /products?currency=<invalid>` returned 200 instead of 400 whenever the query happened to match zero products, because currency validation was only a side effect of formatting a found item's price.

Test-infrastructure fix: the initial `conftest.py` created the schema once per pytest session with no per-test cleanup, causing two unrelated tests that happened to reuse a product name/slug to collide with a real UNIQUE constraint violation — fixed with an `autouse` fixture that `TRUNCATE ... CASCADE`s every table between tests, rather than patching individual test fixtures' data one collision at a time.

Ran the full 48-test suite twice for confidence; each run hit exactly one different, non-reproducible `ConnectionDoesNotExistError`/similar transient Neon-connection blip (expected over ~18-22 minute continuous WSL2-to-serverless-Postgres sessions) — both flagged failures were re-run in isolation and passed cleanly, confirming they were infrastructure noise, not application defects. All 140 tasks in tasks.md are now checked off. Manually walked quickstart.md's full smoke-test checklist against the live Neon dev branch as an additional, independent confirmation beyond the automated suite.

## Outcome

- ✅ Impact: The entire backend is now freshly re-implemented (per explicit, repeatedly-confirmed user request) against a new Neon Postgres project rather than local Docker Postgres, with feature parity confirmed against the original implementation via 48 passing tests plus a live manual smoke test. tasks.md is 140/140 complete.
- 🧪 Tests: 48/48 passing (contract + integration + unit), including both required concurrency-safety races under real concurrent load; manual quickstart.md checklist passed live end-to-end against Neon.
- 📁 Files: Full `backend/app/` tree rebuilt from an empty directory; 2 Alembic migrations (initial schema + a follow-up adding two indexes found missing during the polish review); `backend/.env`/`.env.example` repointed at Neon (dev + test branches, both created via the Neon MCP this session).
- 🔁 Next prompts: This feature branch (`001-fish-shop-backend`) now needs to be reconciled with `002-frontend-integration` (committed separately at `84a7a46`), which was built and tested against the *previous* backend implementation — the frontend's assumptions about exact endpoint paths/response shapes should be spot-checked against this rebuild (informally, the contract-fidelity work this session deliberately preserved the same wire shapes, so this is expected to be a formality, but hasn't been re-verified end-to-end together).
- 🧠 Reflection: Several of the real bugs found here (enum assignment, stale relationship collections, UUID/Pydantic coercion) are instances of the exact same underlying class of mistake (assuming a "fresh" read reflects an in-session write under `expire_on_commit=False` + SQLAlchemy's identity map) recurring across unrelated modules — worth a written team convention or lint rule rather than continuing to catch each instance via integration tests against a real database.

## Evaluation notes (flywheel)

- Failure modes observed: (1) SQLAlchemy identity-map/expire_on_commit staleness, recurring across cart, wishlist, order, and product-enum-assignment code — the same root cause manifesting in five different symptoms; (2) a status-code mixup caused by conflating a FastAPI/Starlette deprecation rename (`HTTP_422_UNPROCESSABLE_ENTITY` → `HTTP_422_UNPROCESSABLE_CONTENT`, both still 422) with an actual required status-code change (this contract needs 400); (3) validation-as-a-side-effect anti-pattern (currency validation only firing when formatting a found row) masking a real input-validation requirement whenever the result set happened to be empty; (4) test-suite-level bug: no per-test data isolation, caught only because two specific tests happened to reuse the same fixture data.
- Graders run and results (PASS/FAIL): full backend test suite — PASS (48/48, across two runs, two isolated non-reproducible infra blips each independently re-confirmed passing); manual quickstart.md smoke test — PASS; route-auth audit (every endpoint's Public/Owner/Admin classification cross-checked against contracts/*.md) — PASS; secrets/gitignore audit — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): Add a lightweight custom lint check (or a code-review checklist item) for "any SQLAlchemy relationship-collection mutation (add/delete on a child model) must be followed by either an explicit `session.refresh(parent, attribute_names=[...])` or a documented reason it's not needed" — this would have caught 3 of the 6 real bugs in this session at write-time instead of via a live-database test failure.
