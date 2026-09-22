# Pet Fish Shop — Backend API

FastAPI + SQLAlchemy (async) + Alembic + Neon PostgreSQL backend for the Pet
Fish Shop platform. See `../specs/001-fish-shop-backend/` for the spec, plan,
data model, and API contracts this implements.

## Setup

```bash
uv sync
cp .env.example .env   # fill in your Neon DATABASE_URL and a JWT SECRET_KEY
uv run alembic upgrade head
```

`DATABASE_URL` points at a Neon Postgres branch (`postgresql+asyncpg://...?ssl=require`).

## Run

```bash
uv run uvicorn app.main:app --reload --port 8000
```

- Health check: `GET http://localhost:8000/api/v1/health`
- Interactive docs: `http://localhost:8000/docs`

## Test

```bash
uv run pytest
```

Tests run against a dedicated Neon branch (hardcoded in `tests/conftest.py`'s
`TEST_DATABASE_URL` — never the dev/production database), per this feature's
research.md §3 (real Postgres, not SQLite). Each test session drops and
recreates the full schema.

## Migrations

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

See `../specs/001-fish-shop-backend/quickstart.md` for a full walkthrough.
