# Phase 1 Data Model: Pet Fish Shop Backend API

Derived from `spec.md`'s Key Entities and Functional Requirements, and the
constitution's mandated entity list (§40 in the original combined document).
All monetary fields are `NUMERIC(12,4)` (see research.md §5); all tables have
`id` (UUID primary key), and `created_at`/`updated_at` timestamps unless noted.

## User & UserProfile

- **User**: `id`, `email` (unique, indexed), `password_hash`, `role` (enum: `customer`, `admin`), `is_active`, `preferred_currency` (enum: `USD`/`GBP`/`PKR`, default `USD`).
- **UserProfile**: `id`, `user_id` (FK → User, unique), `full_name`, `phone` (nullable).
- Relationships: `User` 1—1 `UserProfile`; `User` 1—N `Address`, `Order`, `Appointment`, `Review`, `Notification`; `User` 1—1 `Cart`; `User` 1—1 `Wishlist`.
- Constraints: `email` unique + validated at the schema layer (FR-002); `password_hash` never serialized in any response schema (FR-003).

## Address

- Fields: `id`, `user_id` (FK), `full_name`, `phone`, `address_line`, `city`, `state_province`, `postal_code`, `country`, `delivery_instructions` (nullable), `is_default` (bool).
- Constraint: at most one `is_default=true` row per `user_id` (enforced in the service layer on write; a partial unique index is the DB-level backstop).
- Note (FR-029): `Order` does **not** hold a foreign key to `Address` for its shipping address — it stores an embedded snapshot (see Order below) so later edits/deletes never alter history.

## Category

- Fields: `id`, `name`, `slug` (unique), `parent_id` (FK → Category, nullable, self-referential for hierarchy), `is_archived`.
- Relationships: `Category` 1—N `Category` (children); `Category` 1—N `Product`.
- Index: `parent_id` (fast child lookup), `slug` (unique lookup).

## Product, ProductImage, FishDetails, Inventory

- **Product**: `id`, `name`, `slug` (unique, indexed), `description`, `short_description`, `category_id` (FK), `base_price` (NUMERIC), `base_currency` (fixed `USD` for all products, per FR-017's single-authoritative-price rule), `sku` (unique), `status` (enum: `active`/`draft`/`out_of_stock`/`archived`), `is_featured` (bool), `product_type` (enum: `fish`/`equipment`/`supply`, drives whether FishDetails applies).
- **ProductImage**: `id`, `product_id` (FK), `url`, `display_order`.
- **FishDetails** (1—1 with Product, present only when `product_type = fish`): `product_id` (FK, PK), `species`, `common_name`, `scientific_name`, `freshwater_or_marine` (enum), `size`, `age`, `gender`, `temperament`, `difficulty` (enum), `min_tank_size_liters`, `recommended_temp_c_range`, `recommended_ph_range`, `diet`, `compatibility_notes`, `care_instructions`. Never required for non-fish products (FR-010) — enforced by the row's existence being optional, not by nullable columns on Product itself.
- **Inventory** (1—1 with Product): `product_id` (FK, PK), `stock_quantity` (int, `>= 0` check constraint), `low_stock_threshold` (int).
- Indexes: `category_id`, `status`, `is_featured`, a full-text/trigram index on `name`+`description` for search (FR-012), and a composite index supporting price-range + category filtering (FR-013).
- Derived (not stored): `average_rating`, `review_count` — computed from Review at read time or maintained as a denormalized counter updated transactionally on review write (implementation choice at `/sp.tasks` time); either satisfies FR-045.

## Cart & CartItem

- **Cart**: `id`, `user_id` (FK, unique — one cart per customer).
- **CartItem**: `id`, `cart_id` (FK), `product_id` (FK), `quantity` (int, `> 0` check), unique on (`cart_id`, `product_id`).
- Note: no stored subtotal/total — always computed server-side at read time (FR-025); nothing here is authoritative pricing, only selection + quantity.

## Wishlist & WishlistItem

- **Wishlist**: `id`, `user_id` (FK, unique).
- **WishlistItem**: `id`, `wishlist_id` (FK), `product_id` (FK), unique on (`wishlist_id`, `product_id`) — enforces FR-026's duplicate prevention at the DB level.

## Order & OrderItem

- **Order**: `id`, `user_id` (FK), `status` (enum: `pending`/`confirmed`/`processing`/`ready_for_delivery`/`out_for_delivery`/`completed`/`cancelled`), `currency` (the currency the customer checked out in), `subtotal`, `discount_amount`, `total` (all NUMERIC, server-computed at checkout per FR-031), `coupon_code` (nullable, the one applied coupon per FR-047), `shipping_address_snapshot` (JSON — a copy of the Address fields at order time, per FR-029), `placed_at`.
- **OrderItem**: `id`, `order_id` (FK), `product_id` (FK, `ON DELETE RESTRICT` — never hard-deleted while referenced, satisfying the archived-product edge case), `product_name_snapshot`, `unit_price_snapshot`, `quantity`.
- Index: `user_id` + `status` (customer order history / admin filtering, FR-035/FR-049).
- **Transactional operation**: checkout (cart→order) is one DB transaction: validate → lock affected `Inventory` rows → decrement stock → insert `Order`+`OrderItem`s → clear purchased `CartItem`s → commit; any failure rolls back all of it (FR-032, FR-037, constitution §41).

## Service, Appointment, AppointmentSlot

- **Service**: `id`, `name`, `description`, `base_price` (NUMERIC), `duration_minutes`, `service_type` (enum, e.g. `home_visit`/`in_store`/`consultation`), `is_active`, `image_url`.
- **AppointmentSlot**: `id`, `service_id` (FK, nullable if a slot is shared across services — implementation choice; default: per-service slots), `date`, `start_time`, `capacity` (int, admin-configured per Clarifications), `booked_count` (int, `0 <= booked_count <= capacity` check), `is_blocked` (bool, admin-set blackout).
- **Appointment**: `id`, `user_id` (FK), `service_id` (FK), `slot_id` (FK), `status` (enum: `pending`/`confirmed`/`in_progress`/`completed`/`cancelled`/`no_show`), `address_snapshot` (JSON, nullable — present for home-service bookings), `notes` (nullable).
- Unique/consistency rule: an `Appointment` may only reference a `slot_id` whose `service_id` matches and whose `is_blocked = false`.
- **Transactional operation**: booking is one transaction: lock the `AppointmentSlot` row (`SELECT ... FOR UPDATE`) → re-check `booked_count < capacity` and `is_blocked = false` and `Service.is_active` → increment `booked_count` → insert `Appointment` → commit (FR-040, FR-041, research.md §6). Cancelling an appointment decrements `booked_count` in the same transactional style.

## Review

- Fields: `id`, `user_id` (FK), `product_id` (FK), `order_item_id` (FK → OrderItem — ties eligibility to a specific completed purchase, FR-044), `rating` (int, `1..5` check), `review_text`, `is_moderated_hidden` (bool, admin moderation flag).
- Unique constraint: (`user_id`, `order_item_id`) — prevents a second review for the same purchase (FR-044's duplicate rule) while still allowing a customer to review the same product again if they buy it a second time in a different order.

## Promotion / Coupon

- Fields: `id`, `code` (unique, indexed), `discount_type` (enum: `percentage`/`fixed`), `discount_value` (NUMERIC), `start_date`, `end_date`, `min_order_amount` (NUMERIC, nullable), `max_discount_amount` (NUMERIC, nullable, applies to percentage discounts), `usage_limit` (int, nullable = unlimited), `times_used` (int), `is_active`.
- Validation (service layer, FR-046): active window, `min_order_amount` met, `times_used < usage_limit`, and — per Clarifications — an `Order` may reference at most one `coupon_code`, enforced by `Order.coupon_code` being a single nullable field rather than a join table.

## CurrencyRate

- Fields: `id`, `base_currency` (fixed `USD`), `target_currency` (`GBP`/`PKR`), `rate` (NUMERIC), `fetched_at`, `is_fallback` (bool — true when served from the configured fallback table rather than the live provider, per research.md §4).
- Not a price store: this table only ever caches a rate; `Product.base_price` remains the single authoritative price (FR-017, Constitution Check row on §11).

## Notification

- Fields: `id`, `recipient_user_id` (FK, nullable — null means "all admins"), `event_type` (enum: `order_status_changed`/`appointment_confirmed`/`appointment_cancelled`/`appointment_reminder`/`low_stock_alert`), `payload` (JSON, e.g. order id + new status), `created_at`, `delivered_at` (nullable — delivery channel is an abstraction per constitution §24; this row is the event record regardless of channel).

## Entity Relationship Summary

```text
User ──1:1── UserProfile
User ──1:N── Address
User ──1:1── Cart ──1:N── CartItem ──N:1── Product
User ──1:1── Wishlist ──1:N── WishlistItem ──N:1── Product
User ──1:N── Order ──1:N── OrderItem ──N:1── Product
User ──1:N── Appointment ──N:1── Service
User ──1:N── Review ──N:1── Product
User ──1:N── Notification

Category ──1:N── Category (self, parent/children)
Category ──1:N── Product ──1:N── ProductImage
Product ──1:1── FishDetails (optional)
Product ──1:1── Inventory
Product ──1:N── Review

Service ──1:N── AppointmentSlot ──1:N── Appointment
Appointment ──N:1── AppointmentSlot

Order ──0:1── Promotion (via coupon_code, not a hard FK — validated at checkout time)
CurrencyRate (standalone cache, referenced by conversion logic, not a foreign key relationship)
```
