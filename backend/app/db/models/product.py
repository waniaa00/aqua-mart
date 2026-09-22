import enum
import uuid

from sqlalchemy import Boolean, CheckConstraint, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ProductStatus(str, enum.Enum):
    active = "active"
    draft = "draft"
    out_of_stock = "out_of_stock"
    archived = "archived"


class ProductType(str, enum.Enum):
    fish = "fish"
    equipment = "equipment"
    supply = "supply"


class FreshwaterOrMarine(str, enum.Enum):
    freshwater = "freshwater"
    marine = "marine"


class Difficulty(str, enum.Enum):
    easy = "easy"
    moderate = "moderate"
    advanced = "advanced"


class Product(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("sku", name="uq_products_sku"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    short_description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True
    )
    base_price: Mapped[object] = mapped_column(Numeric(12, 4), nullable=False)
    base_currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus, name="product_status"), default=ProductStatus.draft, nullable=False, index=True
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    product_type: Mapped[ProductType] = mapped_column(Enum(ProductType, name="product_type"), nullable=False)

    images: Mapped[list["ProductImage"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    fish_details: Mapped["FishDetails | None"] = relationship(back_populates="product", uselist=False, cascade="all, delete-orphan")
    inventory: Mapped["Inventory | None"] = relationship(back_populates="product", uselist=False, cascade="all, delete-orphan")


class ProductImage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped[Product] = relationship(back_populates="images")


class FishDetails(TimestampMixin, Base):
    __tablename__ = "fish_details"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), primary_key=True)
    species: Mapped[str | None] = mapped_column(String(255), nullable=True)
    common_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scientific_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    freshwater_or_marine: Mapped[FreshwaterOrMarine | None] = mapped_column(
        Enum(FreshwaterOrMarine, name="freshwater_or_marine"), nullable=True, index=True
    )
    size: Mapped[str | None] = mapped_column(String(100), nullable=True)
    age: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    temperament: Mapped[str | None] = mapped_column(String(255), nullable=True)
    difficulty: Mapped[Difficulty | None] = mapped_column(Enum(Difficulty, name="difficulty"), nullable=True, index=True)
    min_tank_size_liters: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recommended_temp_c_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recommended_ph_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    diet: Mapped[str | None] = mapped_column(String(500), nullable=True)
    compatibility_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    care_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    product: Mapped[Product] = relationship(back_populates="fish_details")


class Inventory(TimestampMixin, Base):
    __tablename__ = "inventory"
    __table_args__ = (CheckConstraint("stock_quantity >= 0", name="ck_inventory_stock_nonnegative"),)

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), primary_key=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    product: Mapped[Product] = relationship(back_populates="inventory")
