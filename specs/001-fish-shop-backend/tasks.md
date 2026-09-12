---

description: "Task list for Pet Fish Shop Backend API"
---

# Tasks: Pet Fish Shop Backend API

**Input**: Design documents from `/specs/001-fish-shop-backend/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Explicitly requested — the constitution's Testing Principle (§22: "Critical functionality MUST have automated tests") and research.md §3 (pytest against real Postgres) both call for them, and the user's own task input itemizes test tasks per phase. Contract tests (one per `contracts/*.md` file) and targeted unit/integration tests are included per user story.

**Organization**: Tasks are grouped by user story (from spec.md, P1→P3) to enable independent implementation and testing of each. All paths are under `backend/`, per plan.md's Project Structure — the existing root-level frontend is untouched; frontend integration is a future feature (plan.md, roadmap Phase 16) and its tasks (`Create frontend project structure`, `Connect frontend ... APIs`, etc., from the user's Phase 1/16 input) are intentionally not included here.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to spec.md's user stories (US1..US12)
- Every task names an exact file path under `backend/`

## Path Conventions

All paths are relative to `backend/`, e.g. `app/main.py` = `backend/app/main.py`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the backend project so later phases have somewhere to add code.

- [X] T001 Create `backend/` directory with `pyproject.toml` (FastAPI, Pydantic v2, pydantic-settings, SQLAlchemy 2.0 async, asyncpg, Alembic, HTTPX, PyJWT, passlib[bcrypt], pytest, pytest-asyncio) and run `uv sync` to create `.venv`
- [X] T002 Create backend package skeleton: `app/__init__.py`, `app/core/__init__.py`, `app/db/__init__.py`, `app/db/models/__init__.py`, `app/schemas/__init__.py`, `app/api/__init__.py`, `app/api/routes/__init__.py`, `app/services/__init__.py`, `app/utils/__init__.py`, `tests/__init__.py`, `tests/contract/__init__.py`, `tests/integration/__init__.py`, `tests/unit/__init__.py`
- [X] T003 [P] Create `backend/.env.example` documenting `DATABASE_URL`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`, `EXCHANGE_RATE_API_BASE`, `EXCHANGE_RATE_CACHE_TTL_HOURS` per quickstart.md
- [X] T004 [P] Create `backend/app/core/config.py` — pydantic-settings `Settings` class reading `.env`
- [X] T005 Update root `.gitignore` to cover `backend/.venv/`, `backend/.env`, `backend/__pycache__/`, `.pytest_cache/`
- [X] T006 Create `backend/README.md` with setup/run/test commands (mirrors quickstart.md)
- [X] T007 Create `backend/app/main.py` — FastAPI app factory mounting an `/api/v1` router, CORS middleware from `Settings.CORS_ORIGINS`, and startup/shutdown hooks for the DB engine
- [X] T008 Create `backend/app/api/routes/health.py` with `GET /api/v1/health` → `{"status": "ok"}`, mounted in `app/main.py`
- [X] T009 Configure `backend/pyproject.toml` `[tool.pytest.ini_options]` and create `backend/tests/conftest.py` with an async test-client fixture (httpx `ASGITransport`) and a test-database session fixture per research.md §3
- [X] T010 Verify: `uv run uvicorn app.main:app --reload` starts and `GET /api/v1/health` returns `200 {"status": "ok"}`

**Checkpoint**: Backend boots; no DB or business logic yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database engine, all ORM models, migrations, auth infrastructure, and shared utilities that every user story depends on.

**⚠️ CRITICAL**: No user story phase can begin until this phase is complete.

- [X] T011 Create `backend/app/db/database.py` — async SQLAlchemy engine + session factory reading `DATABASE_URL` from `Settings`
- [X] T012 [P] Create `backend/app/db/models/user.py` — `User` (id, email, password_hash, role, is_active, preferred_currency) and `UserProfile` (user_id, full_name, phone) per data-model.md
- [X] T013 [P] Create `backend/app/db/models/address.py` — `Address` model, including the `is_default`-uniqueness note from data-model.md
- [X] T014 [P] Create `backend/app/db/models/category.py` — self-referential `Category` model (parent_id, slug unique)
- [X] T015 [P] Create `backend/app/db/models/product.py` — `Product`, `ProductImage`, `FishDetails` (1–1, optional), `Inventory` (1–1, stock_quantity check `>= 0`) per data-model.md
- [X] T016 [P] Create `backend/app/db/models/cart.py` — `Cart`, `CartItem` (unique on cart_id+product_id, quantity check `> 0`)
- [X] T017 [P] Create `backend/app/db/models/wishlist.py` — `Wishlist`, `WishlistItem` (unique on wishlist_id+product_id)
- [X] T018 [P] Create `backend/app/db/models/order.py` — `Order` (status enum, shipping_address_snapshot JSON, coupon_code) and `OrderItem` (product snapshot fields, `ON DELETE RESTRICT` to product)
- [X] T019 [P] Create `backend/app/db/models/service.py` — `Service`, `AppointmentSlot` (capacity/booked_count check), `Appointment` (status enum, address_snapshot JSON)
- [X] T020 [P] Create `backend/app/db/models/review.py` — `Review` (rating check 1–5, unique on user_id+order_item_id)
- [X] T021 [P] Create `backend/app/db/models/promotion.py` — `Promotion`/`Coupon` (unique code, discount_type enum)
- [X] T022 [P] Create `backend/app/db/models/currency.py` — `CurrencyRate` (base/target currency, rate, is_fallback)
- [X] T023 [P] Create `backend/app/db/models/notification.py` — `Notification` (recipient_user_id nullable, event_type enum, payload JSON)
- [X] T024 Wire all model modules into `backend/app/db/models/__init__.py` and verify no circular imports
- [X] T025 Configure `backend/alembic/env.py` to read `DATABASE_URL` from `Settings` and target the models' metadata
- [X] T026 Generate the initial Alembic migration (`uv run alembic revision --autogenerate -m "initial schema"`) covering all 22 tables/keys/constraints/indexes from data-model.md
- [X] T027 Run `uv run alembic upgrade head` against a Neon (or local Postgres) database and verify all tables, foreign keys, unique constraints, and check constraints exist
- [X] T028 [P] Create `backend/app/core/security.py` — `hash_password`/`verify_password` (bcrypt via passlib) and `create_access_token`/`decode_access_token` (PyJWT, embeds `sub` + `role` claims) per research.md §2
- [X] T029 [P] Create `backend/app/core/exceptions.py` — a base `AppError` exception hierarchy (one subclass per contracts/README.md error code) and a FastAPI exception handler registered in `app/main.py` that serializes any `AppError` (and any unhandled exception, generically, as `INTERNAL_ERROR`) into the shared `{"error": {"code", "message"}}` shape, never leaking a stack trace
- [X] T030 [P] Create `backend/app/api/deps.py` — `get_db` session dependency, `get_current_user` (decodes bearer token, loads `User`), `require_admin` (raises `403 FORBIDDEN` if `role != admin`)
- [X] T031 [P] Create `backend/app/schemas/common.py` — shared `ErrorResponse`, `PaginatedResponse[T]` (items/page/limit/total_items/total_pages), and `Money` schema (base_price/base_currency/display_price/display_currency/exchange_rate, all as strings) per contracts/README.md
- [X] T032 [P] Create `backend/app/utils/pagination.py` — a reusable `paginate(query, page, limit)` helper returning the `PaginatedResponse` shape
- [X] T033 [P] Create `backend/app/utils/money.py` — `Decimal`-based helpers (never `float`) for rounding/formatting money per research.md §5
- [X] T034 Verify: a throwaway script or `tests/unit/test_foundation.py` can open a DB session, insert a `User`, hash/verify its password, and issue/decode a JWT for it

**Checkpoint**: Database schema exists; auth primitives, error handling, and shared response shapes are ready. User story work can begin.

---

## Phase 3: User Story 1 - Create an account and sign in (Priority: P1) 🎯 MVP

**Goal**: Registration, login, profile view/update, password change — per spec.md US1 and contracts/auth.md + contracts/users-addresses.md (profile portion only; addresses are US6).

**Independent Test**: Register a new account, log in, call a protected endpoint (`GET /api/v1/users/me`) with the returned token, and confirm access; a wrong password is rejected without revealing which field was wrong.

### Tests for User Story 1

- [X] T035 [P] [US1] Contract test for `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/change-password` in `backend/tests/contract/test_auth.py` — covers duplicate email (409), wrong credentials (401, identical message for bad email vs. bad password), wrong current-password (400)
- [X] T036 [P] [US1] Integration test for the full register→login→view/update profile→change-password flow in `backend/tests/integration/test_registration_login_flow.py`

### Implementation for User Story 1

- [X] T037 [P] [US1] Create `backend/app/schemas/user.py` — `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserProfileResponse`, `UpdateProfileRequest`, `ChangePasswordRequest`
- [X] T038 [US1] Create `backend/app/services/auth_service.py` — `register_user` (validates email/password, hashes password, rejects duplicates), `authenticate_user` (verifies credentials, issues JWT), `change_password` (verifies current, hashes new)
- [X] T039 [US1] Create `backend/app/api/routes/auth.py` — `POST /auth/register`, `POST /auth/login`, `POST /auth/change-password`, thin — delegates to `auth_service`
- [X] T040 [US1] Extend `backend/app/services/auth_service.py` (or a small `user_service.py`) with `get_profile`/`update_profile`
- [X] T041 [US1] Create `backend/app/api/routes/users.py` — `GET /users/me`, `PATCH /users/me` (owner-only via `get_current_user`)
- [X] T042 [US1] Mount `auth` and `users` routers under `/api/v1` in `backend/app/main.py`
- [X] T043 [US1] Add email format + password-strength validation to `RegisterRequest` (FR-002) in `backend/app/schemas/user.py`

**Checkpoint**: Registration, login, and profile management work end-to-end and are independently testable/demoable.

---

## Phase 4: User Story 2 - Browse, search, filter, and sort the product catalog (Priority: P1)

**Goal**: Public catalog browsing with search, composable filters, sorting, pagination, and fish-specific detail — per spec.md US2 and contracts/catalog.md.

**Independent Test**: Query `/api/v1/products` with `search`, `category`, `min_price`/`max_price`, and `sort`, and confirm the returned page matches all criteria together; fetch a fish product's detail and confirm species/care fields are present, and a non-fish product's detail omits them.

### Tests for User Story 2

- [X] T044 [P] [US2] Contract test for `GET /products`, `GET /products/{slug}`, `GET /categories` in `backend/tests/contract/test_catalog.py` — search match, combined filters (AND semantics), each sort order, pagination envelope shape
- [X] T045 [P] [US2] Unit test for the search/filter/sort query-building logic in `backend/tests/unit/test_catalog_query.py`

### Implementation for User Story 2

- [X] T046 [P] [US2] Create `backend/app/schemas/product.py` — `ProductListItem`, `ProductDetail` (incl. optional `fish_details`, `average_rating`, `review_count`), `CategoryResponse`
- [X] T047 [US2] Create `backend/app/services/product_service.py` — `list_products` (search + composable filters + sort + pagination per FR-012..FR-015), `get_product_by_slug`
- [X] T048 [US2] Create `backend/app/services/product_service.py` category helpers — `list_categories` (tree)
- [X] T049 [US2] Create `backend/app/api/routes/products.py` — `GET /products` (public, all query params from contracts/catalog.md), `GET /products/{slug}`
- [X] T050 [US2] Create `backend/app/api/routes/categories.py` — `GET /categories` (public)
- [X] T051 [US2] Mount `products` and `categories` routers under `/api/v1` in `backend/app/main.py`
- [X] T052 [US2] Add DB indexes to `backend/app/db/models/product.py` / a follow-up Alembic migration: `category_id`, `status`, `is_featured`, name/description search index, composite price+category index (data-model.md)
- [X] T053 [US2] Implement `average_rating`/`review_count` computation (read-time aggregate or denormalized counter, implementer's choice per data-model.md) in `product_service.py`

**Checkpoint**: Public catalog browsing is fully independently testable (no auth, cart, or orders required).

---

## Phase 5: User Story 3 - Manage cart and place an order (Priority: P1)

**Goal**: Authenticated cart CRUD with server-computed totals, and checkout into a transaction-safe, inventory-deducting order — per spec.md US3 and contracts/cart-wishlist.md (cart portion) + contracts/orders.md.

**Independent Test**: Add an in-stock product to the cart, check out, and verify an `Order` exists with server-calculated totals and decremented stock; requesting more than available stock is rejected with no order created.

### Tests for User Story 3

- [X] T054 [P] [US3] Contract test for `GET/POST/PATCH/DELETE /cart`, `/cart/items/*` in `backend/tests/contract/test_cart_wishlist.py` (cart portion)
- [X] T055 [P] [US3] Contract test for `POST /orders`, `GET /orders`, `GET /orders/{id}` in `backend/tests/contract/test_orders.py`
- [X] T056 [P] [US3] Integration test for add-to-cart→checkout→view-order-history in `backend/tests/integration/test_shopping_flow.py`
- [X] T057 [US3] Integration test for concurrent checkout of the last unit of stock in `backend/tests/integration/test_shopping_flow.py` — exactly one succeeds (FR-037, SC-003)

### Implementation for User Story 3

- [X] T058 [P] [US3] Create `backend/app/schemas/cart.py` — `CartItemRequest`, `CartResponse` (items, subtotal, discount_amount, total, currency)
- [X] T059 [P] [US3] Create `backend/app/schemas/order.py` — `CreateOrderRequest` (`address_id`), `OrderResponse`, `OrderItemResponse`
- [X] T060 [US3] Create `backend/app/services/cart_service.py` — `get_cart`, `add_item`/`update_item`/`remove_item`/`clear_cart`, each re-validating product status + stock (FR-024), and `compute_totals` (server-side, FR-025)
- [X] T061 [US3] Create `backend/app/services/inventory_service.py` — `check_and_reserve_stock` using `SELECT ... FOR UPDATE` row locking (research.md §6) reused by both cart validation and checkout
- [X] T062 [US3] Create `backend/app/services/order_service.py` — `checkout` as one DB transaction: validate cart → lock+decrement inventory via `inventory_service` → compute authoritative totals → create `Order`+`OrderItem`s (with product name/price snapshot) → clear purchased `CartItem`s → commit or roll back entirely on any failure (FR-030..FR-032, FR-037)
- [X] T063 [US3] Extend `order_service.py` with `list_orders_for_user`, `get_order_for_user` (404 if not owned, FR-035)
- [X] T064 [US3] Create `backend/app/api/routes/cart.py` — `GET/DELETE /cart`, `POST/PATCH/DELETE /cart/items/{product_id}` (owner-only)
- [X] T065 [US3] Create `backend/app/api/routes/orders.py` — `POST /orders`, `GET /orders`, `GET /orders/{id}` (owner-only)
- [X] T066 [US3] Mount `cart` and `orders` routers under `/api/v1` in `backend/app/main.py`
- [X] T067 [US3] Add `Order` status enum (`pending,confirmed,processing,ready_for_delivery,out_for_delivery,completed,cancelled`) to `backend/app/db/models/order.py` if not already present from T018

**Checkpoint**: Full browse→cart→checkout→order-history journey (US1+US2+US3) works end-to-end — the MVP core commerce loop.

---

## Phase 6: User Story 4 - Select a currency and see converted prices (Priority: P2)

**Goal**: USD/GBP/PKR conversion applied to catalog/cart/order reads, with caching and fallback — per spec.md US4 and contracts/currency.md.

**Independent Test**: Request the same product in two currencies and confirm both a correct converted amount and currency code; an unsupported code is rejected; provider outage falls back rather than failing the whole request.

### Tests for User Story 4

- [X] T068 [P] [US4] Contract test for `GET /currency/rates` in `backend/tests/contract/test_currency.py`, including `?currency=` on `/products` and `/cart`
- [X] T069 [P] [US4] Unit test for conversion math and fallback behavior in `backend/tests/unit/test_currency_conversion.py` (mocks the exchange-rate HTTP call)

### Implementation for User Story 4

- [X] T070 [P] [US4] Create `backend/app/schemas/currency.py` — `CurrencyRatesResponse`
- [X] T071 [US4] Create `backend/app/services/currency_service.py` — `get_rates` (fetch via HTTPX from `EXCHANGE_RATE_API_BASE`, cache in `CurrencyRate` table per `EXCHANGE_RATE_CACHE_TTL_HOURS`, fall back to a hardcoded rate table + `is_fallback=true` on failure per research.md §4), `convert` (Decimal-safe, FR-022), `validate_currency` (rejects anything outside USD/GBP/PKR, FR-020)
- [X] T072 [US4] Create `backend/app/api/routes/currency.py` — `GET /currency/rates`
- [X] T073 [US4] Wire `currency_service.convert`/`validate_currency` into `product_service.list_products`/`get_product_by_slug` (from US2) and `cart_service.compute_totals` (from US3) so every price-bearing response includes the `Money` shape (base/display price, currency, rate) per FR-018
- [X] T074 [US4] Add `preferred_currency` read/write to `PATCH /users/me` (US1's `users.py`) and default to it when no `?currency=` is given (FR-021)
- [X] T075 [US4] Mount `currency` router under `/api/v1` in `backend/app/main.py`

**Checkpoint**: Multi-currency works across catalog, cart, and (once US3 exists) orders.

---

## Phase 7: User Story 5 - Book an aquarium service appointment (Priority: P2)

**Goal**: Service listing, slot availability, and capacity-safe appointment booking/cancellation — per spec.md US5 and contracts/services-appointments.md.

**Independent Test**: Book an available slot and confirm remaining capacity decreases; attempting to book a full slot is rejected; booking against a blocked date or inactive service is rejected.

### Tests for User Story 5

- [X] T076 [P] [US5] Contract test for `GET /services`, `GET /services/{id}/slots`, `POST /appointments`, `GET /appointments*`, `POST /appointments/{id}/cancel` in `backend/tests/contract/test_services_appointments.py`
- [X] T077 [P] [US5] Integration test for book→view→cancel in `backend/tests/integration/test_appointment_flow.py`
- [X] T078 [US5] Integration test for concurrent booking of the last unit of slot capacity in `backend/tests/integration/test_appointment_flow.py` — exactly one succeeds (FR-041, SC-003)

### Implementation for User Story 5

- [X] T079 [P] [US5] Create `backend/app/schemas/service.py` — `ServiceResponse`, `SlotResponse` (with `remaining_capacity`), `CreateAppointmentRequest`, `AppointmentResponse`
- [X] T080 [US5] Create `backend/app/services/appointment_service.py` — `list_slots` (excludes blocked/full slots), `book_appointment` as one transaction: `SELECT ... FOR UPDATE` on the slot → re-check `is_active`/`is_blocked`/`booked_count < capacity` → increment `booked_count` → insert `Appointment` (FR-039..FR-041, research.md §6)
- [X] T081 [US5] Extend `appointment_service.py` with `cancel_appointment` (decrements `booked_count` transactionally, enforces owner-only), `list_appointments_for_user`, `get_appointment_for_user` (404 if not owned)
- [X] T082 [US5] Create `backend/app/api/routes/services.py` — `GET /services`, `GET /services/{id}`, `GET /services/{id}/slots` (public)
- [X] T083 [US5] Create `backend/app/api/routes/appointments.py` — `POST /appointments`, `GET /appointments`, `GET /appointments/{id}`, `POST /appointments/{id}/cancel` (owner-only)
- [X] T084 [US5] Mount `services` and `appointments` routers under `/api/v1` in `backend/app/main.py`

**Checkpoint**: Appointment booking is fully independently testable, separate from the shopping flow.

---

## Phase 8: User Story 6 - Manage wishlist and delivery addresses (Priority: P2)

**Goal**: Wishlist CRUD + duplicate prevention, and address CRUD + default flag — per spec.md US6 and contracts/users-addresses.md + contracts/cart-wishlist.md (wishlist portion).

**Independent Test**: Add a product to the wishlist twice and confirm only one entry exists; create two addresses, mark one default, and confirm exactly one `is_default=true` at a time.

### Tests for User Story 6

- [X] T085 [P] [US6] Contract test for `/wishlist*` in `backend/tests/contract/test_cart_wishlist.py` (wishlist portion) — duplicate add is a no-op/409, not a second row
- [X] T086 [P] [US6] Contract test for `/users/me/addresses*` in `backend/tests/contract/test_auth.py` or a new `test_addresses.py` — default-address exclusivity

### Implementation for User Story 6

- [X] T087 [P] [US6] Create `backend/app/schemas/address.py` — `AddressRequest`, `AddressResponse`
- [X] T088 [US6] Create `backend/app/services/address_service.py` — CRUD + `set_default` (atomically unsets the previous default, FR-027)
- [X] T089 [US6] Extend `backend/app/api/routes/users.py` — `GET/POST /users/me/addresses`, `PATCH/DELETE /users/me/addresses/{id}`, `POST /users/me/addresses/{id}/default`
- [X] T090 [P] [US6] Create `backend/app/schemas/wishlist.py` — `WishlistItemRequest`, `WishlistResponse`
- [X] T091 [US6] Create `backend/app/services/wishlist_service.py` — `add_item` (idempotent/duplicate-safe, FR-026), `remove_item`, `list_wishlist`, `check_saved`
- [X] T092 [US6] Create `backend/app/api/routes/wishlist.py` — `GET /wishlist`, `POST/DELETE /wishlist/items/{product_id}`, `GET /wishlist/items/{product_id}`
- [X] T093 [US6] Mount `wishlist` router under `/api/v1` in `backend/app/main.py`

**Checkpoint**: Wishlist and address management work independently of cart/checkout.

---

## Phase 9: User Story 9 - Administer catalog, inventory, and categories (Priority: P2)

**Goal**: Admin CRUD for products (incl. fish details), categories, and inventory adjustments — per spec.md US9 and contracts/catalog.md (admin portion).

**Independent Test**: As an admin, create a category, create a product under it (with fish details), adjust its stock below the low-stock threshold, and confirm it's flagged low-stock and reflected to shoppers (US2).

### Tests for User Story 9

- [X] T094 [P] [US9] Contract test for admin product/category/inventory endpoints in `backend/tests/contract/test_catalog.py` (admin portion) — non-admin gets 403
- [X] T095 [P] [US9] Integration test: create category → create product → adjust stock → verify it appears correctly via the public US2 endpoints in `backend/tests/integration/test_shopping_flow.py`

### Implementation for User Story 9

- [X] T096 [US9] Extend `backend/app/services/product_service.py` — `create_product`/`update_product`/`archive_product` (incl. optional `fish_details` upsert), `create_category`/`update_category`/`archive_category`, `add_product_image`
- [X] T097 [US9] Create `backend/app/services/inventory_service.py` (extend from T061) — `adjust_stock` (increase/decrease/set, rejects negative result, updates `status` to `out_of_stock` at zero) and low-stock flagging against `low_stock_threshold`
- [X] T098 [US9] Extend `backend/app/api/routes/products.py` — `POST/PATCH/DELETE /products/{id}`, `POST /products/{id}/images`, `PATCH /products/{id}/inventory` (all `require_admin`)
- [X] T099 [US9] Extend `backend/app/api/routes/categories.py` — `POST/PATCH /categories/{id}` (`require_admin`)
- [X] T100 [US9] Add product validation (required fields, fish-details-only-for-fish-type per FR-010) to `backend/app/schemas/product.py`

**Checkpoint**: Admins can populate/maintain the catalog and inventory that US2/US3 read from.

---

## Phase 10: User Story 7 - Rate and review purchased products (Priority: P3)

**Goal**: Purchase-gated reviews with average rating/count and admin moderation — per spec.md US7 and contracts/reviews.md.

**Independent Test**: As a customer with a completed order containing a product, submit a review and confirm the product's average rating updates; a non-purchaser or a second review for the same purchase is rejected.

### Tests for User Story 7

- [X] T101 [P] [US7] Contract test for `GET/POST /products/{id}/reviews`, `DELETE /admin/reviews/{id}` in `backend/tests/contract/test_reviews.py` — not-purchased (403), duplicate (409), rating out of 1–5 (400)

### Implementation for User Story 7

- [X] T102 [P] [US7] Create `backend/app/schemas/review.py` — `CreateReviewRequest` (order_item_id, rating, review_text), `ReviewResponse`
- [X] T103 [US7] Create `backend/app/services/review_service.py` — `create_review` (verifies `order_item_id` belongs to caller, references the product, and its `Order.status == completed`; unique on user+order_item, FR-044), `list_reviews_for_product`, `moderate_review` (admin)
- [X] T104 [US7] Create `backend/app/api/routes/reviews.py` — `GET/POST /products/{product_id}/reviews` (owner for POST), `DELETE /admin/reviews/{id}` (`require_admin`)
- [X] T105 [US7] Mount `reviews` router under `/api/v1` in `backend/app/main.py`; wire `average_rating`/`review_count` refresh into `review_service.create_review` (completing T053 from US2)

**Checkpoint**: Reviews work against real completed orders from US3.

---

## Phase 11: User Story 8 - Apply a promotional coupon at checkout (Priority: P3)

**Goal**: Single-coupon-per-order validation and application — per spec.md US8 and contracts/cart-wishlist.md (coupon endpoints) + contracts/promotions.md.

**Independent Test**: Apply a valid coupon to a qualifying cart and confirm the discount reduces the total correctly; an expired/inactive/over-limit coupon, or a second coupon, is rejected.

### Tests for User Story 8

- [X] T106 [P] [US8] Contract test for `POST/DELETE /cart/coupon` and admin `/admin/promotions*` in `backend/tests/contract/test_promotions.py` — expired, inactive, usage-limit-exhausted, min-order-not-met, already-applied cases
- [X] T107 [P] [US8] Unit test for discount calculation (percentage capped at max, fixed) in `backend/tests/unit/test_discount_calculation.py`

### Implementation for User Story 8

- [X] T108 [P] [US8] Create `backend/app/schemas/promotion.py` — `ApplyCouponRequest`, `PromotionResponse` (admin CRUD schema)
- [X] T109 [US8] Create `backend/app/services/promotion_service.py` — `validate_and_apply_coupon` (active window, `min_order_amount`, `usage_limit > times_used`, computes `discount_amount` capped by `max_discount_amount`, FR-046), `remove_coupon`, admin CRUD (`create`/`update`/`deactivate` promotion)
- [X] T110 [US8] Extend `backend/app/services/cart_service.py` — store/clear `coupon_code` on the cart context and re-validate it on every cart read (edge case: cart change invalidates a previously-qualifying coupon), enforce one-coupon-per-order (FR-047)
- [X] T111 [US8] Extend `backend/app/services/order_service.py` — carry the applied coupon's `discount_amount` into `Order.discount_amount`/`Order.coupon_code` and increment `Promotion.times_used` transactionally at checkout
- [X] T112 [US8] Extend `backend/app/api/routes/cart.py` — `POST/DELETE /cart/coupon`
- [X] T113 [US8] Create `backend/app/api/routes/admin_promotions.py` — `GET/POST /admin/promotions`, `PATCH/DELETE /admin/promotions/{id}` (`require_admin`); mount under `/api/v1` in `backend/app/main.py`

**Checkpoint**: Coupons integrate with the existing cart/checkout from US3 without breaking it.

---

## Phase 12: User Story 10 - Administer orders and appointments (Priority: P3)

**Goal**: Admin-wide order/appointment visibility, status updates, and appointment slot/service-availability management — per spec.md US10 and contracts/orders.md + contracts/services-appointments.md (admin portions).

**Independent Test**: As an admin, list all orders across customers, filter by status, update one order's status, and confirm the owning customer sees the change; independently, confirm/cancel/reschedule an appointment.

### Tests for User Story 10

- [X] T114 [P] [US10] Contract test for `/admin/orders*` in `backend/tests/contract/test_orders.py` (admin portion) — non-admin 403, invalid status transition 400
- [X] T115 [P] [US10] Contract test for `/admin/appointments*`, `/admin/services/{id}/slots`, `/admin/slots/{id}` in `backend/tests/contract/test_services_appointments.py` (admin portion)

### Implementation for User Story 10

- [X] T116 [US10] Extend `backend/app/services/order_service.py` — `list_orders_admin` (search/filter), `update_order_status` (validates forward-only transitions), `cancel_order_admin` (restocks inventory transactionally)
- [X] T117 [US10] Create `backend/app/api/routes/admin_orders.py` — `GET /admin/orders`, `GET /admin/orders/{id}`, `PATCH /admin/orders/{id}/status`, `POST /admin/orders/{id}/cancel` (`require_admin`)
- [X] T118 [US10] Extend `backend/app/services/appointment_service.py` — `list_appointments_admin`, `update_appointment_status`, `reschedule_appointment` (atomically releases old slot capacity, claims new), admin `create_slot`/`update_slot` (capacity/blocked)
- [X] T119 [US10] Extend `backend/app/api/routes/services.py` / new `admin_appointments.py` — `GET/PATCH /admin/appointments*`, `POST /admin/services/{id}/slots`, `PATCH /admin/slots/{id}` (`require_admin`)
- [X] T120 [US10] Extend `backend/app/services/service_service.py` (or `product_service`-style module) — admin `create_service`/`update_service`/`deactivate_service`; extend `backend/app/api/routes/services.py` with `POST/PATCH /services/{id}` (`require_admin`)
- [X] T121 [US10] Mount `admin_orders`/`admin_appointments` routers under `/api/v1` in `backend/app/main.py`

**Checkpoint**: Full admin back-office for orders and appointments.

---

## Phase 13: User Story 11 - View admin dashboard statistics (Priority: P3)

**Goal**: Reconciling summary statistics across sales, orders, customers, products, and appointments — per spec.md US11 and contracts/admin.md.

**Independent Test**: With existing seeded orders/appointments, request the dashboard summary and confirm every figure matches a direct query against the underlying tables.

### Tests for User Story 11

- [X] T122 [P] [US11] Contract test for `GET /admin/dashboard/summary` in `backend/tests/contract/test_admin.py` — non-admin 403; figures reconcile against fixture data (SC-006)

### Implementation for User Story 11

- [X] T123 [P] [US11] Create `backend/app/schemas/admin.py` — `DashboardSummaryResponse`
- [X] T124 [US11] Create `backend/app/services/admin_service.py` — `get_dashboard_summary` computing all figures from `Order`/`Appointment`/`Product`/`User`/`Inventory` on read (no stale cache, per contracts/admin.md), including `best_selling_products` ranking by summed `OrderItem.quantity` excluding cancelled orders
- [X] T125 [US11] Create `backend/app/api/routes/admin.py` — `GET /admin/dashboard/summary` (`require_admin`); mount under `/api/v1` in `backend/app/main.py`

**Checkpoint**: Admin reporting is additive on top of all prior phases' data.

---

## Phase 14: User Story 12 - Receive notifications for orders and appointments (Priority: P3)

**Goal**: Event-recording notifications for order/appointment/low-stock events, delivery-channel-agnostic — per spec.md US12 and contracts/notifications.md.

**Independent Test**: Trigger an order status change and confirm a `Notification` row is created for that customer; drop stock at/below threshold and confirm an admin-addressed low-stock `Notification` row is created.

### Tests for User Story 12

- [X] T126 [P] [US12] Contract test for `GET /notifications`, `POST /notifications/{id}/read`, `GET /admin/notifications` in `backend/tests/contract/test_notifications.py`
- [X] T127 [P] [US12] Integration test: change an order's status and assert a `Notification` row exists for that customer; drop stock below threshold and assert an admin-addressed low-stock `Notification` exists — in `backend/tests/integration/test_shopping_flow.py`

### Implementation for User Story 12

- [X] T128 [P] [US12] Create `backend/app/schemas/notification.py` — `NotificationResponse`
- [X] T129 [US12] Create `backend/app/services/notification_service.py` — `record_event` (best-effort insert, never raises into the caller's transaction per constitution §24/contracts/notifications.md), `list_for_user`, `list_for_admins`
- [X] T130 [US12] Wire `notification_service.record_event` calls into: `order_service.update_order_status` (order_status_changed), `appointment_service.book_appointment`/`cancel_appointment`/`update_appointment_status` (appointment_confirmed/cancelled), and `inventory_service.adjust_stock` (low_stock_alert when crossing the threshold)
- [X] T131 [US12] Create `backend/app/api/routes/notifications.py` — `GET /notifications`, `POST /notifications/{id}/read` (owner), `GET /admin/notifications` (`require_admin`); mount under `/api/v1` in `backend/app/main.py`

**Checkpoint**: All 12 user stories from spec.md are implemented and independently verifiable.

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Constitution/plan compliance verification and final hardening — matches the user's "Final Verification Tasks" and the backend-relevant parts of roadmap Phases 18/20 (full platform-wide hardening/QA remains a future feature per plan.md).

- [X] T132 [P] Review every route file under `backend/app/api/routes/` to confirm each protected endpoint uses `get_current_user`/`require_admin` and that owner-scoped queries actually filter by the authenticated user's id (FR-007, SC-008)
- [X] T133 [P] Review `backend/app/core/exceptions.py` and every service module to confirm no response can leak a stack trace or internal detail (FR-055, constitution §20)
- [X] T134 [P] Add missing database indexes identified during implementation (N+1 review) to a follow-up Alembic migration
- [X] T135 [P] Confirm `backend/.env` is git-ignored and no secret/credential is hardcoded anywhere under `backend/app/`
- [X] T136 Run the full test suite (`uv run pytest`) and confirm all contract, integration, and unit tests pass
- [X] T137 Manually execute quickstart.md's smoke test end-to-end against a local run
- [X] T138 Update `backend/README.md` and root `README.md` "What's inside" section to mention the new `backend/` service and link to `specs/001-fish-shop-backend/quickstart.md`
- [X] T139 Re-read `specs/001-fish-shop-backend/plan.md`'s Constitution Check table and confirm every row still holds true against the finished implementation
- [X] T140 Re-read `.specify/memory/constitution.md` v2.0.0 in full and confirm the implementation has no contradiction (spot-check §5 DB integrity, §19 security, §31 no fake functionality, §32 data integrity)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (every story needs models, auth, error handling, pagination/money utilities).
- **User Stories (Phase 3–14)**: All depend on Foundational. Priority order from spec.md: US1, US2, US3 (P1) → US4, US5, US6, US9 (P2) → US7, US8, US10, US11, US12 (P3).
  - US4 (currency) reads Product (US2) and Cart (US3) — implement after both, though its own service/schema files (T070-T071) can be built in parallel.
  - US7 (reviews) requires a completed `Order`/`OrderItem` (US3) to exist as an eligibility check.
  - US8 (coupons) extends `cart_service`/`order_service` from US3 — implement after US3.
  - US9 (admin catalog) can be built any time after Foundational; it's ordered here after US3 only because MVP demo value comes first from the customer-facing path, not because of a hard dependency.
  - US10/US11/US12 (admin orders/dashboard/notifications) read data produced by US3/US5/US9 — build after those exist, though schema/service scaffolding is independent.
- **Polish (Phase 15)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- All `[P]`-marked model tasks in Foundational (T012–T023) touch different files and can run in parallel once T011 exists.
- All `[P]`-marked schema tasks at the start of each user story phase can run in parallel with each other.
- Different user story phases can be staffed in parallel by different developers once Foundational is done, respecting the soft dependencies noted above (e.g., don't start US8 before US3's `order_service.py` exists).

---

## Parallel Example: Foundational Phase

```bash
# After T011 (db/database.py) exists, launch all model creation together:
Task: "Create User/UserProfile models in backend/app/db/models/user.py"
Task: "Create Address model in backend/app/db/models/address.py"
Task: "Create Category model in backend/app/db/models/category.py"
Task: "Create Product/ProductImage/FishDetails/Inventory models in backend/app/db/models/product.py"
Task: "Create Cart/CartItem models in backend/app/db/models/cart.py"
Task: "Create Wishlist/WishlistItem models in backend/app/db/models/wishlist.py"
Task: "Create Order/OrderItem models in backend/app/db/models/order.py"
Task: "Create Service/AppointmentSlot/Appointment models in backend/app/db/models/service.py"
Task: "Create Review model in backend/app/db/models/review.py"
Task: "Create Promotion/Coupon models in backend/app/db/models/promotion.py"
Task: "Create CurrencyRate model in backend/app/db/models/currency.py"
Task: "Create Notification model in backend/app/db/models/notification.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1–3 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3 (US1), Phase 4 (US2), Phase 5 (US3)
4. **STOP and VALIDATE**: run the register→browse→cart→checkout→order-history journey end-to-end (matches spec.md SC-001, SC-005)
5. This is the P0/MVP scope named in the user's own task input (foundation, DB, auth, catalog, search/filter/pagination, cart, checkout, orders — currency/inventory/services/appointments/admin were also named P0 there; US4/US5/US9 close the remaining P0 gap immediately after)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → US2 → US3 → **MVP demoable**
3. US4 (currency) + US9 (admin catalog) → shop is realistically operable end-to-end with real admin-entered data and correct multi-currency prices
4. US5 (appointments) + US6 (wishlist/addresses) → second revenue stream + UX polish
5. US7, US8, US10, US11, US12 → P3 rounding-out (reviews, coupons, admin order/appointment ops, dashboard, notifications)
6. Polish

### Parallel Team Strategy

With multiple developers, after Foundational: one developer takes US2→US9 (catalog/admin-catalog thread), another takes US3→US8 (cart/checkout/coupons thread), another takes US5→US10 (appointments/admin-appointments thread) — each thread is a natural dependency chain; US1, US4, US6, US11, US12 can be picked up by whoever finishes a thread first, per the soft dependencies above.

---

## Notes

- `[P]` tasks touch different files with no unmet dependency.
- `[Story]` labels map every implementation/test task back to spec.md's user stories for traceability.
- This feature is backend-only; connecting the existing frontend is a future feature (plan.md roadmap Phase 16) and is intentionally not tasked here.
- Commit after each task or logical group; stop at any Checkpoint to validate that story's independent test before continuing.
- Avoid: cross-story file edits inside a single task, vague descriptions, and skipping the row-lock pattern (research.md §6) on inventory/slot-capacity mutations — that pattern is what makes SC-003 (zero oversell/overbooking) true.
