import math
from collections.abc import Sequence
from typing import TypeVar

from sqlalchemy import Select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.common import PaginatedResponse

T = TypeVar("T")


async def paginate(
    db: AsyncSession,
    query: Select,
    *,
    page: int = 1,
    limit: int = 20,
    schema_cls,
) -> PaginatedResponse:
    page = max(page, 1)
    limit = max(min(limit, 100), 1)

    total_items_result = await db.execute(select_count(query))
    total_items = total_items_result.scalar_one()

    paged_query = query.offset((page - 1) * limit).limit(limit)
    rows_result = await db.execute(paged_query)
    rows: Sequence = rows_result.scalars().all()

    total_pages = max(math.ceil(total_items / limit), 1) if total_items else 0

    return PaginatedResponse(
        items=[schema_cls.model_validate(row) for row in rows],
        page=page,
        limit=limit,
        total_items=total_items,
        total_pages=total_pages,
    )


def select_count(query: Select):
    return query.with_only_columns(func.count()).order_by(None)
