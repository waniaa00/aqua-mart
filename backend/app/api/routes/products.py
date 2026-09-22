import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user, require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    CreateProductImageRequest,
    CreateProductRequest,
    InventoryResponse,
    ProductDetail,
    ProductImageResponse,
    ProductListItem,
    UpdateInventoryRequest,
    UpdateProductRequest,
)
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=PaginatedResponse[ProductListItem])
async def list_products_route(
    search: str | None = None,
    category: str | None = None,
    product_type: str | None = None,
    species: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    available: bool | None = None,
    freshwater_or_marine: str | None = None,
    difficulty: str | None = None,
    featured: bool | None = None,
    sort: str | None = None,
    currency: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> PaginatedResponse[ProductListItem]:
    effective_currency = currency or (user.preferred_currency.value if user else None)
    return await product_service.list_products(
        db,
        search=search,
        category=category,
        product_type=product_type,
        species=species,
        min_price=min_price,
        max_price=max_price,
        available=available,
        freshwater_or_marine=freshwater_or_marine,
        difficulty=difficulty,
        featured=featured,
        sort=sort,
        currency=effective_currency,
        page=page,
        limit=limit,
    )


@router.get("/{slug}", response_model=ProductDetail)
async def get_product_route(
    slug: str,
    currency: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> ProductDetail:
    effective_currency = currency or (user.preferred_currency.value if user else None)
    return await product_service.get_product_by_slug(db, slug, effective_currency)


@router.post("", response_model=ProductDetail, status_code=status.HTTP_201_CREATED)
async def create_product_route(
    data: CreateProductRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> ProductDetail:
    return await product_service.create_product(db, data)


@router.patch("/{product_id}", response_model=ProductDetail)
async def update_product_route(
    product_id: str,
    data: UpdateProductRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ProductDetail:
    return await product_service.update_product(db, uuid.UUID(product_id), data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_product_route(
    product_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
) -> None:
    await product_service.archive_product(db, uuid.UUID(product_id))


@router.post("/{product_id}/images", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
async def add_product_image_route(
    product_id: str,
    data: CreateProductImageRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ProductImageResponse:
    return await product_service.add_product_image(db, uuid.UUID(product_id), data)


@router.patch("/{product_id}/inventory", response_model=InventoryResponse)
async def update_inventory_route(
    product_id: str,
    data: UpdateInventoryRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> InventoryResponse:
    return await product_service.update_inventory(db, uuid.UUID(product_id), data)
