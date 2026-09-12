import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user, require_admin
from app.db.database import get_db
from app.db.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    AddProductImageRequest,
    AdjustInventoryRequest,
    CreateProductRequest,
    ProductDetail,
    ProductImageResponse,
    ProductListItem,
    UpdateProductRequest,
)
from app.services import inventory_service, product_service

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
    sort: str = "newest",
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    currency: str | None = None,
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
        page=page,
        limit=limit,
        currency=effective_currency,
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
    data: CreateProductRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ProductDetail:
    product = await product_service.create_product(db, data)
    return await product_service.get_product_by_slug(db, product.slug)


@router.patch("/{product_id}", response_model=ProductDetail)
async def update_product_route(
    product_id: str,
    data: UpdateProductRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ProductDetail:
    product = await product_service.update_product(db, uuid.UUID(product_id), data)
    return await product_service.get_product_by_slug(db, product.slug)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_product_route(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    await product_service.archive_product(db, uuid.UUID(product_id))


@router.post("/{product_id}/images", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
async def add_product_image_route(
    product_id: str,
    data: AddProductImageRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ProductImageResponse:
    image = await product_service.add_product_image(db, uuid.UUID(product_id), data.url, data.display_order)
    return ProductImageResponse(id=str(image.id), url=image.url, display_order=image.display_order)


@router.patch("/{product_id}/inventory")
async def adjust_inventory_route(
    product_id: str,
    data: AdjustInventoryRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict:
    return await inventory_service.adjust_stock(
        db,
        uuid.UUID(product_id),
        stock_quantity=data.stock_quantity,
        low_stock_threshold=data.low_stock_threshold,
        adjust_by=data.adjust_by,
    )
