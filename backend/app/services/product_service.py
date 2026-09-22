import uuid
from decimal import Decimal

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, ValidationAppError
from app.db.models.category import Category
from app.db.models.product import FishDetails, Inventory, Product, ProductImage, ProductStatus, ProductType
from app.db.models.review import Review
from app.schemas.common import Money, PaginatedResponse
from app.schemas.product import (
    CreateCategoryRequest,
    CreateProductImageRequest,
    CreateProductRequest,
    FishDetailsResponse,
    InventoryResponse,
    ProductDetail,
    ProductImageResponse,
    ProductListItem,
    UpdateCategoryRequest,
    UpdateInventoryRequest,
    UpdateProductRequest,
)
from app.services import currency_service
from app.utils.pagination import clean_page_params, total_pages as compute_total_pages

VALID_SORTS = {"price_asc", "price_desc", "newest", "oldest", "popularity", "rating", "featured"}


async def build_money(db: AsyncSession, base_price: Decimal, currency: str | None) -> Money:
    currency = currency or "USD"
    if currency == "USD":
        return Money.same_currency(base_price, "USD")
    rate, _ = await currency_service.get_rate(db, currency)
    return Money.converted(base_price, "USD", currency, rate)


async def _rating_map(db: AsyncSession, product_ids: list[uuid.UUID]) -> dict[uuid.UUID, tuple[float, int]]:
    if not product_ids:
        return {}
    result = await db.execute(
        select(Review.product_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.product_id.in_(product_ids), Review.is_moderated_hidden.is_(False))
        .group_by(Review.product_id)
    )
    return {row[0]: (float(row[1]), row[2]) for row in result.all()}


async def _to_list_item(db: AsyncSession, product: Product, currency: str | None, rating_map: dict) -> ProductListItem:
    avg_rating, review_count = rating_map.get(product.id, (None, 0))
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
        price=await build_money(db, product.base_price, currency),
        average_rating=avg_rating,
        review_count=review_count,
    )


async def _to_detail(db: AsyncSession, product: Product, currency: str | None) -> ProductDetail:
    rating_map = await _rating_map(db, [product.id])
    list_item = await _to_list_item(db, product, currency, rating_map)
    return ProductDetail(
        **list_item.model_dump(),
        description=product.description,
        images=[ProductImageResponse.model_validate(img) for img in sorted(product.images, key=lambda i: i.display_order)],
        fish_details=FishDetailsResponse.model_validate(product.fish_details) if product.fish_details else None,
        stock_quantity=product.inventory.stock_quantity if product.inventory else 0,
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
    sort: str | None = None,
    currency: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> PaginatedResponse[ProductListItem]:
    if sort is not None and sort not in VALID_SORTS:
        raise ValidationAppError(f"Invalid sort: {sort}")
    if currency is not None:
        # Validate eagerly rather than only as a side effect of building each
        # item's Money — an empty result page must not silently mask an
        # invalid ?currency= (FR-020).
        currency_service.validate_currency(currency)

    query = select(Product).where(Product.status != ProductStatus.archived).options(
        selectinload(Product.images), selectinload(Product.fish_details), selectinload(Product.inventory)
    )
    needs_fish_join = any([species, freshwater_or_marine, difficulty])
    if needs_fish_join:
        query = query.join(FishDetails, FishDetails.product_id == Product.id)

    conditions = []
    if search:
        like = f"%{search}%"
        conditions.append(or_(Product.name.ilike(like), Product.description.ilike(like)))
    if category:
        cat_result = await db.execute(select(Category).where(Category.slug == category))
        cat = cat_result.scalar_one_or_none()
        conditions.append(Product.category_id == (cat.id if cat else uuid.uuid4()))
    if product_type:
        conditions.append(Product.product_type == product_type)
    if species:
        conditions.append(FishDetails.species.ilike(f"%{species}%"))
    if min_price is not None:
        conditions.append(Product.base_price >= min_price)
    if max_price is not None:
        conditions.append(Product.base_price <= max_price)
    if freshwater_or_marine:
        conditions.append(FishDetails.freshwater_or_marine == freshwater_or_marine)
    if difficulty:
        conditions.append(FishDetails.difficulty == difficulty)
    if featured is not None:
        conditions.append(Product.is_featured == featured)
    if available is not None:
        query = query.join(Inventory, Inventory.product_id == Product.id, isouter=True)
        if available:
            conditions.append(and_(Inventory.stock_quantity > 0, Product.status == ProductStatus.active))
        else:
            conditions.append(or_(Inventory.stock_quantity == 0, Inventory.stock_quantity.is_(None)))
    if not available:  # default: only ever show active or out_of_stock, never draft, unless explicitly filtered
        conditions.append(Product.status.in_([ProductStatus.active, ProductStatus.out_of_stock]))

    if conditions:
        query = query.where(and_(*conditions))

    count_query = select(func.count()).select_from(query.with_only_columns(Product.id).subquery())
    total_items = (await db.execute(count_query)).scalar_one()

    if sort == "price_asc":
        query = query.order_by(Product.base_price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.base_price.desc())
    elif sort == "oldest":
        query = query.order_by(Product.created_at.asc())
    elif sort == "featured":
        query = query.order_by(Product.is_featured.desc(), Product.created_at.desc())
    elif sort in ("popularity", "rating"):
        query = query.order_by(Product.created_at.desc())  # refined client-side via rating_map for now
    else:  # newest, default
        query = query.order_by(Product.created_at.desc())

    params = clean_page_params(page, limit)
    query = query.offset(params.offset).limit(params.limit)
    result = await db.execute(query)
    products = list(result.scalars().unique().all())

    rating_map = await _rating_map(db, [p.id for p in products])
    items = [await _to_list_item(db, p, currency, rating_map) for p in products]

    if sort in ("popularity", "rating"):
        items.sort(key=lambda i: (i.review_count if sort == "popularity" else (i.average_rating or 0)), reverse=True)

    return PaginatedResponse(
        items=items, page=params.page, limit=params.limit, total_items=total_items,
        total_pages=compute_total_pages(total_items, params.limit),
    )


async def _get_by_id(db: AsyncSession, product_id: uuid.UUID) -> Product:
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.images), selectinload(Product.fish_details), selectinload(Product.inventory))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise NotFoundError("Product not found.")
    return product


async def get_product_by_slug(db: AsyncSession, slug: str, currency: str | None) -> ProductDetail:
    result = await db.execute(
        select(Product)
        .where(Product.slug == slug)
        .options(selectinload(Product.images), selectinload(Product.fish_details), selectinload(Product.inventory))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise NotFoundError("Product not found.")
    return await _to_detail(db, product, currency)


async def create_product(db: AsyncSession, data: CreateProductRequest) -> ProductDetail:
    if data.fish_details is not None and data.product_type != "fish":
        raise ValidationAppError("fish_details can only be set on a product with product_type 'fish'.")

    product = Product(
        name=data.name,
        slug=data.slug,
        sku=data.sku,
        description=data.description,
        short_description=data.short_description,
        base_price=Decimal(data.base_price),
        base_currency="USD",
        category_id=uuid.UUID(data.category_id) if data.category_id else None,
        product_type=ProductType(data.product_type),
        is_featured=data.is_featured,
        status=ProductStatus.draft,
    )
    db.add(product)
    await db.flush()

    db.add(Inventory(product_id=product.id, stock_quantity=data.initial_stock_quantity, low_stock_threshold=data.low_stock_threshold))
    if data.fish_details is not None:
        db.add(FishDetails(product_id=product.id, **data.fish_details.model_dump()))

    await db.commit()
    return await get_product_by_slug(db, product.slug, None)


async def update_product(db: AsyncSession, product_id: uuid.UUID, data: UpdateProductRequest) -> ProductDetail:
    product = await _get_by_id(db, product_id)
    updates = data.model_dump(exclude_unset=True, exclude={"fish_details"})
    if "base_price" in updates and updates["base_price"] is not None:
        updates["base_price"] = Decimal(updates["base_price"])
    if "category_id" in updates and updates["category_id"] is not None:
        updates["category_id"] = uuid.UUID(updates["category_id"])
    if "status" in updates and updates["status"] is not None:
        updates["status"] = ProductStatus(updates["status"])
    for key, value in updates.items():
        setattr(product, key, value)

    if data.fish_details is not None:
        if product.product_type != ProductType.fish:
            raise ValidationAppError("fish_details can only be set on a product with product_type 'fish'.")
        if product.fish_details is None:
            db.add(FishDetails(product_id=product.id, **data.fish_details.model_dump()))
        else:
            for key, value in data.fish_details.model_dump(exclude_unset=True).items():
                setattr(product.fish_details, key, value)

    await db.commit()
    return await get_product_by_slug(db, product.slug, None)


async def archive_product(db: AsyncSession, product_id: uuid.UUID) -> None:
    product = await _get_by_id(db, product_id)
    product.status = ProductStatus.archived
    await db.commit()


async def add_product_image(db: AsyncSession, product_id: uuid.UUID, data: CreateProductImageRequest) -> ProductImageResponse:
    await _get_by_id(db, product_id)
    image = ProductImage(product_id=product_id, url=data.url, display_order=data.display_order)
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return ProductImageResponse.model_validate(image)


async def update_inventory(db: AsyncSession, product_id: uuid.UUID, data: UpdateInventoryRequest) -> InventoryResponse:
    product = await _get_by_id(db, product_id)
    inventory = product.inventory
    if inventory is None:
        raise NotFoundError("Inventory record not found.")

    new_quantity = inventory.stock_quantity
    if data.adjust_by is not None:
        new_quantity += data.adjust_by
    if data.stock_quantity is not None:
        new_quantity = data.stock_quantity
    if new_quantity < 0:
        raise ValidationAppError("Stock quantity cannot go below zero.")

    was_above_threshold = inventory.stock_quantity > inventory.low_stock_threshold
    inventory.stock_quantity = new_quantity
    if data.low_stock_threshold is not None:
        inventory.low_stock_threshold = data.low_stock_threshold

    if new_quantity == 0:
        product.status = ProductStatus.out_of_stock
    elif product.status == ProductStatus.out_of_stock and new_quantity > 0:
        product.status = ProductStatus.active

    await db.commit()

    if was_above_threshold and new_quantity <= inventory.low_stock_threshold:
        from app.services import notification_service

        await notification_service.notify_low_stock(db, product_id, new_quantity)

    return InventoryResponse(
        stock_quantity=inventory.stock_quantity, low_stock_threshold=inventory.low_stock_threshold, status=product.status.value
    )


# --- Categories -------------------------------------------------------------


async def list_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).where(Category.is_archived.is_(False)).order_by(Category.name))
    return list(result.scalars().all())


async def create_category(db: AsyncSession, data: CreateCategoryRequest) -> Category:
    from app.utils.slugify import slugify

    category = Category(
        name=data.name, slug=slugify(data.name), parent_id=uuid.UUID(data.parent_id) if data.parent_id else None
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def update_category(db: AsyncSession, category_id: uuid.UUID, data: UpdateCategoryRequest) -> Category:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise NotFoundError("Category not found.")
    updates = data.model_dump(exclude_unset=True)
    if "parent_id" in updates and updates["parent_id"] is not None:
        updates["parent_id"] = uuid.UUID(updates["parent_id"])
    for key, value in updates.items():
        setattr(category, key, value)
    await db.commit()
    await db.refresh(category)
    return category
