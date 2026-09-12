import math
import uuid
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, ValidationAppError
from app.db.models.category import Category
from app.db.models.product import FishDetails, Inventory, Product, ProductImage, ProductStatus, ProductType
from app.db.models.review import Review
from app.schemas.common import Money, PaginatedResponse
from app.schemas.product import (
    CategoryResponse,
    CreateCategoryRequest,
    CreateProductRequest,
    FishDetailsResponse,
    ProductDetail,
    ProductImageResponse,
    ProductListItem,
    UpdateCategoryRequest,
    UpdateProductRequest,
)

SORT_OPTIONS = {
    "price_asc": Product.base_price.asc(),
    "price_desc": Product.base_price.desc(),
    "newest": Product.created_at.desc(),
    "oldest": Product.created_at.asc(),
    "featured": Product.is_featured.desc(),
}


async def _rating_stats(db: AsyncSession, product_id: uuid.UUID) -> tuple[float | None, int]:
    result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.product_id == product_id, Review.is_moderated_hidden.is_(False)
        )
    )
    avg_rating, count = result.one()
    return (float(avg_rating) if avg_rating is not None else None, count or 0)


async def _price_for(db: AsyncSession, product: Product, currency: str | None) -> Money:
    from app.services import currency_service

    target = currency_service.validate_currency(currency) if currency else product.base_currency
    return await currency_service.convert(db, product.base_price, product.base_currency, target)


async def _to_list_item(
    db: AsyncSession, product: Product, avg_rating: float | None, review_count: int, currency: str | None
) -> ProductListItem:
    return ProductListItem(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        short_description=product.short_description,
        category_id=str(product.category_id) if product.category_id else None,
        sku=product.sku,
        status=product.status.value,
        is_featured=product.is_featured,
        product_type=product.product_type.value,
        price=await _price_for(db, product, currency),
        average_rating=avg_rating,
        review_count=review_count,
    )


async def list_products(
    db: AsyncSession,
    *,
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
    page: int = 1,
    limit: int = 20,
    include_non_active: bool = False,
    currency: str | None = None,
) -> PaginatedResponse[ProductListItem]:
    query = select(Product).options(selectinload(Product.fish_details), selectinload(Product.inventory))

    if not include_non_active:
        query = query.where(Product.status == ProductStatus.active)

    if search:
        like = f"%{search.lower()}%"
        query = query.outerjoin(FishDetails, FishDetails.product_id == Product.id).where(
            or_(
                func.lower(Product.name).like(like),
                func.lower(Product.description).like(like),
                func.lower(Product.sku).like(like),
                func.lower(func.coalesce(FishDetails.species, "")).like(like),
            )
        )
    if category:
        query = query.join(Category, Category.id == Product.category_id).where(Category.slug == category)
    if product_type:
        try:
            query = query.where(Product.product_type == ProductType(product_type))
        except ValueError as exc:
            raise ValidationAppError(f"Invalid product_type: {product_type}") from exc
    if min_price is not None:
        query = query.where(Product.base_price >= min_price)
    if max_price is not None:
        query = query.where(Product.base_price <= max_price)
    if featured is not None:
        query = query.where(Product.is_featured == featured)

    needs_fish_join = species or freshwater_or_marine or difficulty
    if needs_fish_join:
        query = query.join(FishDetails, FishDetails.product_id == Product.id, isouter=False)
        if species:
            query = query.where(func.lower(FishDetails.species) == species.lower())
        if freshwater_or_marine:
            query = query.where(FishDetails.freshwater_or_marine == freshwater_or_marine)
        if difficulty:
            query = query.where(FishDetails.difficulty == difficulty)

    if available is not None:
        query = query.join(Inventory, Inventory.product_id == Product.id)
        if available:
            query = query.where(Inventory.stock_quantity > 0)
        else:
            query = query.where(Inventory.stock_quantity <= 0)

    order_clause = SORT_OPTIONS.get(sort)
    if order_clause is None and sort not in ("popularity", "rating"):
        raise ValidationAppError(f"Invalid sort option: {sort}")

    page = max(page, 1)
    limit = max(min(limit, 100), 1)

    count_query = select(func.count()).select_from(query.subquery())
    total_items = (await db.execute(count_query)).scalar_one()

    if sort in ("popularity", "rating"):
        # Both require aggregating reviews; handled by fetching then sorting in Python
        # since dataset sizes for a small-business catalog make this practical.
        rows = (await db.execute(query)).scalars().all()
        stats = [await _rating_stats(db, p.id) for p in rows]
        combined = list(zip(rows, stats))
        combined.sort(key=lambda pair: (pair[1][0] or 0) if sort == "rating" else pair[1][1], reverse=True)
        start = (page - 1) * limit
        page_rows = combined[start : start + limit]
        items = [await _to_list_item(db, p, avg, count, currency) for p, (avg, count) in page_rows]
    else:
        query = query.order_by(order_clause).offset((page - 1) * limit).limit(limit)
        rows = (await db.execute(query)).scalars().all()
        items = []
        for product in rows:
            avg_rating, count = await _rating_stats(db, product.id)
            items.append(await _to_list_item(db, product, avg_rating, count, currency))

    total_pages = math.ceil(total_items / limit) if total_items else 0
    return PaginatedResponse(items=items, page=page, limit=limit, total_items=total_items, total_pages=total_pages)


async def get_product_by_slug(db: AsyncSession, slug: str, currency: str | None = None) -> ProductDetail:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.fish_details),
            selectinload(Product.inventory),
            selectinload(Product.images),
        )
        .where(Product.slug == slug)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise NotFoundError("The requested product was not found.")

    avg_rating, review_count = await _rating_stats(db, product.id)

    fish_details = None
    if product.fish_details is not None:
        fish_details = FishDetailsResponse.model_validate(product.fish_details)

    return ProductDetail(
        id=str(product.id),
        name=product.name,
        slug=product.slug,
        short_description=product.short_description,
        description=product.description,
        category_id=str(product.category_id) if product.category_id else None,
        sku=product.sku,
        status=product.status.value,
        is_featured=product.is_featured,
        product_type=product.product_type.value,
        price=await _price_for(db, product, currency),
        average_rating=avg_rating,
        review_count=review_count,
        images=[ProductImageResponse(id=str(i.id), url=i.url, display_order=i.display_order) for i in product.images],
        fish_details=fish_details,
        stock_quantity=product.inventory.stock_quantity if product.inventory else 0,
    )


async def get_product_or_404(db: AsyncSession, product_id: uuid.UUID) -> Product:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.fish_details), selectinload(Product.inventory))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise NotFoundError("The requested product was not found.")
    return product


async def create_product(db: AsyncSession, data: CreateProductRequest) -> Product:
    existing = await db.execute(select(Product).where(Product.sku == data.sku))
    if existing.scalar_one_or_none() is not None:
        from app.core.exceptions import ConflictError

        raise ConflictError("A product with this SKU already exists.")

    try:
        product_type = ProductType(data.product_type)
    except ValueError as exc:
        raise ValidationAppError(f"Invalid product_type: {data.product_type}") from exc

    if product_type != ProductType.fish and data.fish_details is not None:
        raise ValidationAppError("fish_details may only be set for products with product_type 'fish'.")

    product = Product(
        name=data.name,
        slug=data.slug,
        description=data.description,
        short_description=data.short_description,
        category_id=uuid.UUID(data.category_id) if data.category_id else None,
        base_price=Decimal(data.base_price),
        base_currency="USD",
        sku=data.sku,
        product_type=product_type,
        is_featured=data.is_featured,
        status=ProductStatus.draft,
    )
    product.inventory = Inventory(
        stock_quantity=data.initial_stock_quantity, low_stock_threshold=data.low_stock_threshold
    )
    if data.fish_details is not None:
        product.fish_details = FishDetails(**data.fish_details.model_dump())

    db.add(product)
    await db.commit()
    return product


async def update_product(db: AsyncSession, product_id: uuid.UUID, data: UpdateProductRequest) -> Product:
    product = await get_product_or_404(db, product_id)

    if data.name is not None:
        product.name = data.name
    if data.description is not None:
        product.description = data.description
    if data.short_description is not None:
        product.short_description = data.short_description
    if data.category_id is not None:
        product.category_id = uuid.UUID(data.category_id)
    if data.base_price is not None:
        product.base_price = Decimal(data.base_price)
    if data.status is not None:
        try:
            product.status = ProductStatus(data.status)
        except ValueError as exc:
            raise ValidationAppError(f"Invalid status: {data.status}") from exc
    if data.is_featured is not None:
        product.is_featured = data.is_featured
    if data.fish_details is not None:
        if product.product_type != ProductType.fish:
            raise ValidationAppError("fish_details may only be set for products with product_type 'fish'.")
        if product.fish_details is None:
            product.fish_details = FishDetails(**data.fish_details.model_dump())
        else:
            for key, value in data.fish_details.model_dump().items():
                setattr(product.fish_details, key, value)

    await db.commit()
    return product


async def archive_product(db: AsyncSession, product_id: uuid.UUID) -> Product:
    product = await get_product_or_404(db, product_id)
    product.status = ProductStatus.archived
    await db.commit()
    return product


async def add_product_image(db: AsyncSession, product_id: uuid.UUID, url: str, display_order: int) -> ProductImage:
    product = await get_product_or_404(db, product_id)
    image = ProductImage(product_id=product.id, url=url, display_order=display_order)
    db.add(image)
    await db.commit()
    return image


async def list_categories(db: AsyncSession) -> list[CategoryResponse]:
    result = await db.execute(select(Category).where(Category.is_archived.is_(False)))
    categories = result.scalars().all()
    return [
        CategoryResponse(
            id=str(c.id), name=c.name, slug=c.slug, parent_id=str(c.parent_id) if c.parent_id else None, is_archived=c.is_archived
        )
        for c in categories
    ]


async def create_category(db: AsyncSession, data: CreateCategoryRequest) -> Category:
    existing = await db.execute(select(Category).where(Category.slug == data.slug))
    if existing.scalar_one_or_none() is not None:
        from app.core.exceptions import ConflictError

        raise ConflictError("A category with this slug already exists.")

    category = Category(
        name=data.name, slug=data.slug, parent_id=uuid.UUID(data.parent_id) if data.parent_id else None
    )
    db.add(category)
    await db.commit()
    return category


async def update_category(db: AsyncSession, category_id: uuid.UUID, data: UpdateCategoryRequest) -> Category:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise NotFoundError("The requested category was not found.")

    if data.name is not None:
        category.name = data.name
    if data.parent_id is not None:
        category.parent_id = uuid.UUID(data.parent_id)
    if data.is_archived is not None:
        category.is_archived = data.is_archived

    await db.commit()
    return category
