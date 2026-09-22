import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = (
    "postgresql+asyncpg://fishshop:npg_zmJi38eDVPEU@"
    "ep-old-voice-aw8jxrmx-pooler.c-12.us-east-1.aws.neon.tech/fishshop?ssl=require"
)

test_engine = create_async_engine(
    TEST_DATABASE_URL, pool_pre_ping=True, connect_args={"statement_cache_size": 0}
)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def _truncate_tables():
    # The schema is created once per test session (above), not per test —
    # without this, two tests that happen to reuse the same product slug/sku
    # (or any other unique value) collide. TRUNCATE ... CASCADE after each
    # test keeps every test starting from a genuinely empty database.
    yield
    async with test_engine.begin() as conn:
        table_names = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
        if table_names:
            from sqlalchemy import text

            await conn.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))


@pytest_asyncio.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def override_get_db(db_session):
    async def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def override_get_db_per_request():
    # Unlike `override_get_db`, this hands each request its own fresh session
    # (via TestSessionLocal) rather than sharing one AsyncSession — required
    # for tests that issue genuinely concurrent requests (AsyncSession is not
    # safe for concurrent use from multiple coroutines at once).
    async def _get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.clear()
