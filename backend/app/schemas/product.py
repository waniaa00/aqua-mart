from pydantic import Field

from app.schemas.common import Money, ORMModel


class FishDetailsResponse(ORMModel):
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
    images: list[ProductImageResponse] = Field(default_factory=list)
    fish_details: FishDetailsResponse | None = None
    stock_quantity: int


class CategoryResponse(ORMModel):
    id: str
    name: str
    slug: str
    parent_id: str | None
    is_archived: bool


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


class CreateProductRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    description: str = ""
    short_description: str = ""
    category_id: str | None = None
    base_price: str
    sku: str = Field(min_length=1, max_length=100)
    product_type: str
    is_featured: bool = False
    fish_details: FishDetailsRequest | None = None
    initial_stock_quantity: int = 0
    low_stock_threshold: int = 5


class UpdateProductRequest(ORMModel):
    name: str | None = None
    description: str | None = None
    short_description: str | None = None
    category_id: str | None = None
    base_price: str | None = None
    status: str | None = None
    is_featured: bool | None = None
    fish_details: FishDetailsRequest | None = None


class CreateCategoryRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    parent_id: str | None = None


class UpdateCategoryRequest(ORMModel):
    name: str | None = None
    parent_id: str | None = None
    is_archived: bool | None = None


class AddProductImageRequest(ORMModel):
    url: str
    display_order: int = 0


class AdjustInventoryRequest(ORMModel):
    stock_quantity: int | None = None
    low_stock_threshold: int | None = None
    adjust_by: int | None = None
