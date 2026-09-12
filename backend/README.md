# Pet Fish Shop — Backend API

FastAPI + SQLAlchemy (async) + Alembic + Neon PostgreSQL backend for the Pet
Fish Shop platform. See `../specs/001-fish-shop-backend/` for the spec, plan,
data model, and API contracts this implements.

## Setup

```bash
uv sync
cp .env.example .env   # then fill in real values (or use docker-compose for local dev)
docker compose up -d   # starts local dev + test Postgres containers
uv run alembic upgrade head
```

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

Tests run against the `postgres_test` service in `docker-compose.yml`
(`DATABASE_URL` override via `TEST_DATABASE_URL`, see `tests/conftest.py`),
per this feature's research.md §3 (real Postgres, not SQLite).

## Migrations

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

See `../specs/001-fish-shop-backend/quickstart.md` for a full walkthrough.
