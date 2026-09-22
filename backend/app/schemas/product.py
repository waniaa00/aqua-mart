from pydantic import Field

from app.schemas.common import Money, ORMModel


class FishDetailsRequest(ORMModel):
    species: str | None = None
    common_name: str | None = None
    scientific_name: str | None = None
    freshwater_or_marine: str | None = None
    size: str | None = None
    age: str | None = None
    gender: str | None = None
    temperament: str | None = None
    difficulty: str | None = None
    min_tank_size_liters: int | None = None
    recommended_temp_c_range: str | None = None
    recommended_ph_range: str | None = None
    diet: str | None = None
    compatibility_notes: str | None = None
    care_instructions: str | None = None


class FishDetailsResponse(FishDetailsRequest):
    pass


class ProductImageResponse(ORMModel):
    id: str
    url: str
    display_order: int


class ProductListItem(ORMModel):
    id: str
    name: str
    slug: str
    short_description: str
    category_id: str | None
    sku: str
    status: str
    is_featured: bool
    product_type: str
    price: Money
    average_rating: float | None = None
    review_count: int = 0


class ProductDetail(ProductListItem):
    description: str
    images: list[ProductImageResponse] = []
    fish_details: FishDetailsResponse | None = None
    stock_quantity: int


class CreateProductRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str
    sku: str
    description: str = ""
    short_description: str = ""
    base_price: str
    category_id: str | None = None
    product_type: str
    is_featured: bool = False
    initial_stock_quantity: int = 0
    low_stock_threshold: int = 5
    fish_details: FishDetailsRequest | None = None


class UpdateProductRequest(ORMModel):
    name: str | None = None
    description: str | None = None
    short_description: str | None = None
    base_price: str | None = None
    category_id: str | None = None
    status: str | None = None
    is_featured: bool | None = None
    fish_details: FishDetailsRequest | None = None


class CreateProductImageRequest(ORMModel):
    url: str
    display_order: int = 0


class UpdateInventoryRequest(ORMModel):
    stock_quantity: int | None = None
    low_stock_threshold: int | None = None
    adjust_by: int | None = None


class InventoryResponse(ORMModel):
    stock_quantity: int
    low_stock_threshold: int
    status: str


class CategoryResponse(ORMModel):
    id: str
    name: str
    slug: str
    parent_id: str | None
    is_archived: bool


class CreateCategoryRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    parent_id: str | None = None


class UpdateCategoryRequest(ORMModel):
    name: str | None = None
    parent_id: str | None = None
    is_archived: bool | None = None
