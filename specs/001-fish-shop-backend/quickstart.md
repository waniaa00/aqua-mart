# Quickstart: Pet Fish Shop Backend API

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) for dependency/venv management
- A Neon PostgreSQL database (or any local Postgres 15+ for development)

## Setup

```bash
cd backend
uv sync                      # installs dependencies from pyproject.toml into .venv
cp .env.example .env         # then fill in real values
```

`.env` required variables (constitution §25, spec.md FR-054's environment
config requirement):

```bash
DATABASE_URL=postgresql+asyncpg://user:password@host/dbname
SECRET_KEY=replace-with-a-long-random-value
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:5173
EXCHANGE_RATE_API_BASE=https://open.er-api.com/v6
EXCHANGE_RATE_CACHE_TTL_HOURS=12
```

## Database migrations

```bash
uv run alembic upgrade head          # apply all migrations
uv run alembic revision --autogenerate -m "describe change"   # after model changes
```

Never manipulate the production Neon database directly (constitution §5) —
all schema changes go through an Alembic revision, reviewed like any other
code change.

## Run the API

```bash
uv run uvicorn app.main:app --reload --port 8000
```

- Health check: `GET http://localhost:8000/api/v1/health` → `{"status": "ok"}`
- Interactive docs: `http://localhost:8000/docs` (Swagger UI) and `/redoc`

## Run tests

```bash
uv run pytest                         # all tests
uv run pytest tests/unit              # fast, no DB
uv run pytest tests/contract          # per-endpoint shape/status checks
uv run pytest tests/integration       # full flows against the test DB
```

Tests run against a dedicated test database — set `DATABASE_URL` in a
`.env.test` (or CI secret) pointing at a disposable Postgres instance/Neon
branch, never at the development or production database (research.md §3).

## First manual smoke test (matches spec.md User Story 1–3)

```bash
# Register
curl -X POST localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane","email":"jane@example.com","password":"correct horse battery staple"}'

# Login
curl -X POST localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"correct horse battery staple"}'
# -> {"access_token": "...", "token_type": "bearer"}

# Browse catalog (public)
curl localhost:8000/api/v1/products?search=betta

# Add to cart (use the access_token from login)
curl -X POST localhost:8000/api/v1/cart/items \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"product_id":"<id-from-catalog>","quantity":1}'
```

## Notes

- This quickstart covers the backend only. The existing frontend
  (`npm run dev` at the repo root) is not yet wired to this API — that
  connection is a future feature (see plan.md's "Full Platform Roadmap",
  Phase 16).
- `/api/v1/currency/rates` requires outbound network access to the
  configured exchange-rate provider; without it, responses fall back to the
  configured fallback table per research.md §4.
