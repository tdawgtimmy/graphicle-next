"""Engine lifecycle.

One engine per process with its own pool, matching the deployment shape: a
long-lived container talking to Supabase's *direct* connection. The Supavisor
pooler solves many-short-lived-clients, which is the serverless problem this
deployment avoids.
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine

from graphicle_api.settings import get_settings

_engine: AsyncEngine | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_pre_ping=True,
            future=True,
        )
    return _engine


async def dispose_engine() -> None:
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None


async def get_connection() -> AsyncIterator[AsyncConnection]:
    """FastAPI dependency yielding a transactional connection."""
    engine = get_engine()
    async with engine.begin() as connection:
        yield connection
