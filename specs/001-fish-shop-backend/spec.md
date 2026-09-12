# Feature Specification: Pet Fish Shop Backend API

**Feature Branch**: `001-fish-shop-backend`
**Created**: 2026-09-12
**Status**: Draft
**Input**: User description: "Backend Specification — Pet Fish Shop" — a production-ready backend covering user accounts, a pet-fish/aquarium product catalog, categories, inventory, cart, wishlist, orders, appointment-based aquarium services, addresses, multi-currency pricing (USD/GBP/PKR), reviews, promotions, notifications, admin management, search/filter/sort/pagination, and dashboard statistics, exposed as REST APIs for a frontend to consume.

## Clarifications

### Session 2026-09-12

- Q: Does checkout need real payment processing, or is order creation/tracking the scope for now? → A: Order tracking only — checkout creates a Pending order and deducts inventory; no real charge happens. Payment provider integration is a separate future feature.
- Q: Can an appointment time slot hold more than one appointment at once? → A: Configurable capacity per slot — each slot has an admin-configured capacity (number of concurrent appointments it can hold); a slot is available while booked appointments are below that capacity.
- Q: Can multiple promotions/coupons apply to a single order? → A: One coupon per order — at most one coupon code may be applied to an order at checkout.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account and sign in (Priority: P1)

A visitor creates a customer account with name, email, and password, then signs in to access personalized features (cart, orders, appointments, addresses, wishlist, currency preference).

**Why this priority**: Nearly every other capability in this spec (cart, orders, appointments, reviews) is gated on having an authenticated customer identity. Without this, nothing else can be demonstrated end-to-end.

**Independent Test**: Register a new account with a unique email, confirm the account exists, then log in with the same credentials and receive access to protected endpoints — independently verifiable without any other feature being built.

**Acceptance Scenarios**:

1. **Given** no account exists for `jane@example.com`, **When** a visitor registers with a valid name, that email, and a valid password, **Then** an account and customer profile are created and a duplicate registration with the same email is rejected.
2. **Given** a registered account, **When** the owner logs in with the correct email and password, **Then** they receive access to their protected resources (profile, cart, orders, appointments, addresses, wishlist).
3. **Given** a registered account, **When** login is attempted with an incorrect password, **Then** access is denied with no indication of which field was wrong.
4. **Given** a logged-in customer, **When** they view or update their profile or change their password, **Then** the changes are persisted and a wrong current-password attempt is rejected.

---

### User Story 2 - Browse, search, filter, and sort the product catalog (Priority: P1)

A shopper (with or without an account) browses aquarium products — including live fish, which carry extra species/care information — and narrows results by category, price, availability, species, and other facets, sorted and paginated.

**Why this priority**: Product discovery is the entry point to the entire commerce flow; without it there is nothing to add to a cart or purchase.

**Independent Test**: Query the catalog with a search term, a category filter, a price range, and a sort order, and confirm the returned page of results matches all applied criteria — testable without cart/order features existing.

**Acceptance Scenarios**:

1. **Given** a catalog containing fish and equipment products, **When** a shopper searches for "betta", **Then** only matching products (by name, species, category, description, or SKU) are returned, paginated.
2. **Given** a catalog with products in multiple categories and price points, **When** a shopper filters by category and a price range and requests availability-only results, **Then** only products satisfying all filters together are returned.
3. **Given** a live-fish product, **When** a shopper views its details, **Then** species, care, and compatibility information appear alongside the standard product fields; a non-fish product shows no empty fish-specific fields.
4. **Given** more results than fit on one page, **When** a shopper requests page 2 at a given page size, **Then** the response returns exactly that page along with the total item and page counts.

---

### User Story 3 - Manage cart and place an order (Priority: P1)

A logged-in customer adds products to a cart, adjusts quantities, and checks out; the system validates stock and calculates authoritative totals before creating an order and updating inventory.

**Why this priority**: This is the core transaction that makes the platform a commerce system rather than a catalog browser.

**Independent Test**: Add a product to the cart, check out, and verify an order is created with server-calculated totals and reduced stock — independently testable once catalog and accounts exist.

**Acceptance Scenarios**:

1. **Given** an in-stock product, **When** a customer adds it to their cart and views the cart, **Then** the cart shows the item, a server-calculated subtotal, and a total in the customer's selected currency.
2. **Given** a cart item whose requested quantity exceeds available stock, **When** the customer tries to increase quantity or check out, **Then** the request is rejected with a clear insufficient-stock error and no order is created.
3. **Given** a valid, in-stock cart, **When** the customer checks out, **Then** an order and its line items are created with a Pending status, stock is decremented accordingly, and the purchased items are cleared from the cart.
4. **Given** a submitted cart total from a client, **When** checkout is processed, **Then** the server recalculates price, discount, and total from current catalog and promotion data rather than trusting any client-submitted amount.
5. **Given** a customer's own past orders, **When** they view order history or a specific order's detail, **Then** they see items, quantities, prices, status, date, and total for their own orders only; another customer's orders are not visible to them.

---

### User Story 4 - Select a currency and see converted prices (Priority: P2)

A shopper selects a preferred currency (USD, GBP, or PKR); all prices they see — catalog, cart, orders — are converted from each product's base price using current exchange rates.

**Why this priority**: Multi-currency is a named product requirement but is additive on top of a working catalog/cart; the platform is usable in the base currency without it.

**Independent Test**: Request the same product's price in two different supported currencies and confirm both a correctly converted amount and the currency code are returned, independent of cart/order features.

**Acceptance Scenarios**:

1. **Given** a product with a base price in USD, **When** a shopper requests it in PKR, **Then** the response shows the base price, base currency, converted display price, display currency, and the exchange rate used.
2. **Given** an authenticated customer sets their preferred currency, **When** they subsequently view products, cart, or orders without specifying a currency, **Then** amounts are shown in their stored preference.
3. **Given** the exchange-rate source is temporarily unavailable, **When** a price conversion is requested, **Then** the system falls back to a cached or fallback rate rather than failing the whole request, and does not silently present a stale rate as current without indicating it.
4. **Given** a currency code outside USD/GBP/PKR is requested, **When** prices are fetched, **Then** the request is rejected with an invalid-currency error.

---

### User Story 5 - Book an aquarium service appointment (Priority: P2)

A customer picks a service (e.g., aquarium setup, cleaning, aquascaping), an available date and time slot, and submits an appointment; the system prevents booking a slot beyond its capacity.

**Why this priority**: Appointment booking is a second, independent revenue stream alongside product sales — valuable but separable from the catalog/cart flow.

**Independent Test**: Book an available slot for a service and confirm the appointment is created and the slot's remaining capacity decreases; attempting to overbook a full slot is independently verifiable.

**Acceptance Scenarios**:

1. **Given** an active service with an available slot below its configured capacity, **When** a customer submits a booking with required details, **Then** an appointment is created with Pending status and the slot's remaining capacity decreases by one.
2. **Given** a slot already booked to its full configured capacity, **When** another customer attempts to book that same slot, **Then** the booking is rejected as unavailable.
3. **Given** an inactive service or a blocked date, **When** a booking is attempted against it, **Then** the booking is rejected.
4. **Given** a customer's own appointment, **When** they view their appointments or cancel one under the cancellation rules, **Then** the appointment list/detail and its updated status reflect the change; a customer cannot view or cancel another customer's appointment.

---

### User Story 6 - Manage wishlist and delivery addresses (Priority: P2)

A logged-in customer saves products to a wishlist for later and maintains one or more delivery addresses, including a default address used for home-service bookings and delivery.

**Why this priority**: Convenience features that improve retention and streamline checkout/booking, but the platform functions without them.

**Independent Test**: Add a product to the wishlist and confirm it appears and duplicates are rejected; create two addresses and confirm one can be marked default — independently testable.

**Acceptance Scenarios**:

1. **Given** a product not yet on a customer's wishlist, **When** they add it, **Then** it appears in their wishlist; adding it again does not create a duplicate entry.
2. **Given** a customer with no addresses, **When** they add one and mark it default, **Then** it is used automatically where a delivery/service address is needed; adding a second address does not remove the first unless explicitly deleted.

---

### User Story 7 - Rate and review purchased products (Priority: P3)

A customer who has purchased a product leaves a star rating and written review; other shoppers see the product's average rating and review count.

**Why this priority**: Builds trust and aids discovery but is not required for the core buy/book flows to function.

**Independent Test**: As a customer with a completed order containing a product, submit a review and confirm the product's average rating updates; a second review attempt for the same purchase is rejected.

**Acceptance Scenarios**:

1. **Given** a customer with a completed order containing a product, **When** they submit a rating (1–5) and review text, **Then** the review is stored and the product's average rating and count reflect it.
2. **Given** a customer who has not purchased a product, **When** they attempt to review it, **Then** the review is rejected.
3. **Given** a customer has already reviewed a specific purchase of a product, **When** they attempt to submit another review for that same purchase, **Then** the duplicate is rejected.

---

### User Story 8 - Apply a promotional coupon at checkout (Priority: P3)

A customer enters a coupon code during checkout; the system validates it (active, within date range, minimum order met, usage limit not exceeded) and applies at most one coupon's discount to the order total.

**Why this priority**: A marketing lever that increases conversion but is not required for baseline checkout to work.

**Independent Test**: Apply a valid coupon to a qualifying cart and confirm the discount reduces the total correctly; an expired, inactive, or over-limit coupon is independently verifiable as rejected.

**Acceptance Scenarios**:

1. **Given** an active coupon within its date range and a cart meeting its minimum order amount, **When** the customer applies it at checkout, **Then** the discount (percentage or fixed, capped at any configured maximum) is applied once to the order total.
2. **Given** an expired, inactive, or usage-limit-exhausted coupon, **When** a customer attempts to apply it, **Then** it is rejected with a clear reason and the order total is unaffected.
3. **Given** a coupon already applied to a cart, **When** the customer attempts to apply a second coupon, **Then** the second is rejected — only one coupon may apply per order.

---

### User Story 9 - Administer catalog, inventory, and categories (Priority: P2)

An admin creates and maintains products (including fish-specific details), organizes them into hierarchical categories, and manages stock levels and low-stock thresholds.

**Why this priority**: Without admin-side catalog and inventory management, there is no way to populate or keep accurate the data that Stories 2 and 3 depend on in a real deployment — but the shopper-facing stories can be demonstrated against seed data first.

**Independent Test**: As an admin, create a category, create a product assigned to it (with fish details where relevant), adjust its stock, and confirm the change is reflected to shoppers — independently testable of the checkout flow.

**Acceptance Scenarios**:

1. **Given** an admin session, **When** they create, update, archive, or feature a product, or adjust its price or stock, **Then** the change is reflected in subsequent catalog reads; a non-admin attempting the same action is rejected.
2. **Given** an admin creates or updates a hierarchical category and assigns products to it, **When** shoppers browse by that category, **Then** the assigned products appear under it.
3. **Given** a product's stock falls at or below its configured low-stock threshold, **When** an admin views inventory, **Then** that product is flagged as low stock; a product at zero stock is shown as out of stock and cannot be added to a cart.

---

### User Story 10 - Administer orders and appointments (Priority: P3)

An admin views, searches, and filters all customer orders and appointments, updates their status, and manages appointment slots and service availability.

**Why this priority**: Operational back-office capability needed to run the business day-to-day, but not required to demonstrate the customer-facing value of the platform.

**Independent Test**: As an admin, list all orders, filter by status, and update one order's status; independently, list and confirm an appointment.

**Acceptance Scenarios**:

1. **Given** orders from multiple customers, **When** an admin searches/filters and updates an order's status, **Then** the change is visible to the owning customer; a non-admin cannot access another customer's order.
2. **Given** pending appointments, **When** an admin confirms, reschedules, cancels, or marks one completed, **Then** its status updates accordingly and remains visible to the owning customer.

---

### User Story 11 - View admin dashboard statistics (Priority: P3)

An admin views summary statistics — sales, order counts by status, customer and product counts, low-stock products, appointment counts by status, best-selling products, and recent activity.

**Why this priority**: Useful operational insight, but purely additive reporting on top of data already produced by other stories.

**Independent Test**: With existing orders and appointments in the system, request the dashboard summary and confirm the figures match the underlying records; a non-admin request is rejected.

**Acceptance Scenarios**:

1. **Given** existing orders, appointments, products, and customers, **When** an admin requests dashboard statistics, **Then** totals and breakdowns match the underlying data; a non-admin request is rejected.

---

### User Story 12 - Receive notifications for orders and appointments (Priority: P3)

A customer receives a notification when an order is confirmed or its status changes, and when an appointment is confirmed, cancelled, or approaching; an admin receives a low-stock alert.

**Why this priority**: Improves communication and trust but the core transactions succeed without it; can be added once the events it reacts to already exist.

**Independent Test**: Trigger an order status change and confirm a corresponding notification record is created for that customer — independently testable of how it is ultimately delivered.

**Acceptance Scenarios**:

1. **Given** an order's status changes, **When** the change is saved, **Then** a notification event for that customer is recorded.
2. **Given** a product's stock crosses at or below its low-stock threshold, **When** that happens, **Then** a low-stock notification event for admins is recorded.

---

### Edge Cases

- Two customers submit checkout for the last unit of the same product at nearly the same time — exactly one order succeeds; the other is rejected for insufficient stock, with no oversell.
- Two customers attempt to book the last available capacity on the same appointment slot concurrently — exactly one booking succeeds.
- A customer requests a currency that is technically well-formed (three letters) but not one of the supported codes — rejected as invalid, not silently defaulted.
- The external exchange-rate source is unreachable and no cached rate exists yet — the system reports the failure rather than fabricating a rate.
- An admin archives a product that exists in past (already-placed) orders — historical order line items retain the product's details as of purchase time and are not altered or hidden.
- An address used on a past order is later edited or deleted — the historical order retains the address details as they were at the time of purchase.
- A coupon's minimum order amount is no longer met after an item is removed from the cart post-application — the coupon is re-validated and removed if it no longer qualifies.
- A customer attempts to review a product from an order that was cancelled rather than completed — rejected, since no qualifying completed purchase exists.
- An appointment is booked for a date that is later blocked by an admin — the existing appointment is not silently cancelled; blocking prevents new bookings only.
- A guest (no account) attempts to add an item to a cart or book an appointment — rejected; an account is required for any action that creates persistent, personal records (cart, orders, appointments, wishlist, reviews, addresses).

## Requirements *(mandatory)*

### Functional Requirements

**Accounts & Authentication**

- **FR-001**: System MUST allow a visitor to register an account with name, email, and password, creating an associated customer profile.
- **FR-002**: System MUST validate email format and password strength at registration and reject duplicate registrations against an existing email.
- **FR-003**: System MUST store passwords only in securely hashed form and MUST NOT store or return plain-text passwords.
- **FR-004**: System MUST allow a registered user to log in with email and password and receive access to their protected resources; failed login MUST NOT reveal whether the email or the password was incorrect.
- **FR-005**: System MUST allow an authenticated customer to view and update their profile and change their password after verifying their current password.
- **FR-006**: System MUST support at least two roles, Customer and Admin, and MUST restrict admin-only capabilities to admin-role users.
- **FR-007**: System MUST ensure a customer can only view or modify their own personal resources (profile, cart, wishlist, addresses, orders, appointments), except where an admin's elevated access is explicitly specified.

**Product Catalog**

- **FR-008**: System MUST support product records with at minimum: name, slug, description, short description, category, base price, base currency, stock quantity, SKU, images, status, featured flag, created/updated timestamps.
- **FR-009**: System MUST support product status values Active, Draft, Out of Stock, and Archived, and MUST prevent purchase of a product that is not Active or that has zero stock.
- **FR-010**: System MUST support optional fish-specific fields (species, common/scientific name, fish type, freshwater/marine, size, age, gender, temperament, difficulty, minimum tank size, recommended temperature and pH, diet, compatibility, care instructions) that are never required for non-fish products.
- **FR-011**: System MUST support hierarchical product categories, allow admins to create/update/archive them, and allow products to be assigned to a category.
- **FR-012**: System MUST support searching products by name, species, category, description, and SKU, returning paginated results.
- **FR-013**: System MUST support composable filtering by category, product type, species, price range, availability, freshwater/marine, difficulty, and featured status, applied together (AND semantics).
- **FR-014**: System MUST support sorting product results by price (either direction), newest, oldest, popularity, rating, and featured status.
- **FR-015**: All list endpoints (products, orders, appointments, reviews, etc.) MUST support pagination and return the current page, page size, total items, and total pages alongside the results.

**Multi-Currency Pricing**

- **FR-016**: System MUST support USD, GBP, and PKR as user-selectable currencies, with an architecture that allows adding further currencies later without redesigning the pricing model.
- **FR-017**: Every product MUST have exactly one authoritative base price and base currency; the system MUST NOT permanently persist a separately maintained price per supported currency.
- **FR-018**: System MUST convert a product's base price to a requested or preferred currency at read time using a current exchange rate, and MUST return the base price, base currency, display price, display currency, and exchange rate used together.
- **FR-019**: System MUST retrieve exchange rates from an external source, cache them to avoid excessive external requests, and fall back to a cached or configured fallback rate when the source is unavailable, rather than failing the request outright.
- **FR-020**: System MUST reject requests specifying a currency code that is not one of the supported currencies.
- **FR-021**: System MUST persist an authenticated customer's selected currency preference and apply it by default when no currency is explicitly requested; guest preference handling is client-side only.
- **FR-022**: All monetary calculations (conversion, totals, discounts) MUST use decimal-safe arithmetic; the system MUST NOT use binary floating-point for money.

**Cart & Wishlist**

- **FR-023**: System MUST allow an authenticated customer to add a product to their cart, update its quantity, remove it, view the cart, and clear the cart.
- **FR-024**: System MUST validate, at every cart mutation and at checkout, that the requested product is purchasable and that the requested quantity does not exceed available stock.
- **FR-025**: System MUST calculate cart subtotal, any applicable discount, and total on the server; it MUST NOT accept or trust a client-submitted total.
- **FR-026**: System MUST allow an authenticated customer to add/remove wishlist items, view their wishlist, and check whether a given product is already saved, without allowing duplicate entries for the same product.

**Addresses**

- **FR-027**: System MUST allow an authenticated customer to create, update, delete, and list delivery addresses, and to designate one as default.
- **FR-028**: Each address MUST capture full name, phone, address line, city, state/province, postal code, country, and optional delivery instructions.
- **FR-029**: System MUST retain a snapshot of the address used on an order at the time the order was placed, independent of later edits or deletion of that address record.

**Orders & Inventory**

- **FR-030**: System MUST allow an authenticated customer to create an order from their current cart, validating cart contents, product availability, and inventory before proceeding.
- **FR-031**: System MUST calculate all order financial values (item prices, discount, total) on the server at checkout time; the frontend's submitted values MUST NOT be trusted for price, discount, tax, total, or inventory availability.
- **FR-032**: On successful checkout, system MUST create an order and its line items, decrement inventory accordingly, and clear the purchased items from the cart, as a single all-or-nothing operation.
- **FR-033**: System MUST NOT process a real payment charge as part of order creation for this scope; an order is created in a Pending status representing an order record, with payment integration explicitly out of scope for this feature (see Assumptions).
- **FR-034**: System MUST support order statuses Pending, Confirmed, Processing, Ready for Delivery, Out for Delivery, Completed, and Cancelled; only an admin may change an order's status; a customer may view but not set status.
- **FR-035**: System MUST allow a customer to view their own order history and individual order detail (items, quantities, prices, status, date, total), and MUST prevent access to another customer's orders; an admin may access all orders.
- **FR-036**: System MUST track current stock per product and support admin stock increases, decreases, and direct sets, plus a configurable low-stock threshold.
- **FR-037**: System MUST prevent any operation (cart, checkout) from reducing a product's stock below zero, and MUST make inventory-deduction operations safe under concurrent requests so two simultaneous checkouts cannot both succeed for the last unit.

**Aquarium Services & Appointments**

- **FR-038**: System MUST support service records with name, description, base price, duration, active status, image, and service type, manageable by admins.
- **FR-039**: System MUST allow a customer to book an appointment by selecting a service, date, and available time slot, and providing required customer details, an address for home-service bookings, and optional notes.
- **FR-040**: System MUST validate, before confirming a booking, that the service is active, the date is not blocked, and the selected slot has remaining capacity.
- **FR-041**: System MUST support a configurable capacity per appointment slot (number of concurrent appointments the slot can hold) and MUST prevent a booking from being accepted once a slot's capacity is reached, safely under concurrent booking attempts.
- **FR-042**: System MUST support appointment statuses Pending, Confirmed, In Progress, Completed, Cancelled, and No-show; an admin may set any status, a customer may view their own appointments and cancel according to cancellation rules.
- **FR-043**: System MUST prevent a customer from viewing or modifying another customer's appointment; an admin may view, confirm, reschedule, cancel, or complete any appointment and manage available time slots and blocked dates.

**Reviews & Promotions**

- **FR-044**: System MUST allow an authenticated customer to submit a 1–5 star rating and review text for a product only if they have a completed order containing that product, and MUST prevent a second review for the same purchase.
- **FR-045**: System MUST expose each product's average rating and review count, and MUST allow an admin to moderate (e.g., remove) reviews.
- **FR-046**: System MUST support promotions/coupons with percentage or fixed-amount discount, code, active date range, minimum order amount, maximum discount cap, usage limits, and active/inactive status, all validated server-side before being applied.
- **FR-047**: System MUST allow at most one coupon to be applied per order; applying a second coupon while one is already applied MUST be rejected.

**Admin Operations & Reporting**

- **FR-048**: System MUST allow admins to create, update, archive, feature, and price/inventory-manage products and categories, and MUST reject these actions from non-admin users.
- **FR-049**: System MUST allow admins to search, filter, view, and update the status of any order, and to view customer information relevant to fulfilling it.
- **FR-050**: System MUST allow admins to view and manage appointments (filter by date/status, confirm, cancel, reschedule, complete) and to configure service availability and time slots.
- **FR-051**: System MUST provide admin-only dashboard statistics including total sales, order counts by status, total customers and products, low-stock products, appointment counts by status, best-selling products, and recent orders/appointments.

**Notifications**

- **FR-052**: System MUST record a notification event when an order's status changes and when an appointment is confirmed, cancelled, or approaching, addressed to the affected customer.
- **FR-053**: System MUST record a low-stock notification event addressed to admins when a product's stock crosses at or below its configured threshold.

**Validation, Errors, and Cross-Cutting Rules**

- **FR-054**: System MUST validate all inbound data at the point of entry (email, password, currency codes, product/order/appointment identifiers, quantities, prices, dates, appointment times, coupon codes, and query parameters) and MUST NOT assume any client-side validation already occurred.
- **FR-055**: System MUST return a consistent, structured error format for every failure case (authentication failure, authorization failure, validation failure, not found, duplicate resource, insufficient stock, appointment conflict, invalid currency, external dependency failure), and MUST NOT expose internal implementation details (e.g., stack traces) to API consumers.
- **FR-056**: System MUST NOT present a simulated or fabricated result (e.g., fake payment success, fake stock, a stale exchange rate presented as live) as if it were real or current.
- **FR-057**: System MUST enforce that a product cannot be purchased while inactive, archived, or out of stock, regardless of what a client requests.
- **FR-058**: System MUST enforce that an appointment cannot be created against an inactive service, a blocked date, or a slot with no remaining capacity, regardless of what a client requests.

### Key Entities

- **User / Customer Profile**: A registered person; holds credentials (hashed), role (Customer/Admin), and profile details; owns addresses, cart, wishlist, orders, appointments, reviews, and a currency preference.
- **Address**: A named delivery/service location owned by a customer; one may be marked default; orders retain an immutable snapshot of the address used.
- **Category**: A hierarchical grouping for products; a category may have a parent category and contains products.
- **Product**: A sellable item (fish or aquarium good); has a base price/currency, stock, status, images, and optional fish-specific details; belongs to a category; accumulates reviews.
- **Cart / Cart Item**: A customer's in-progress selection of products and quantities, recalculated to a total on every read/mutation and cleared of purchased items after checkout.
- **Wishlist / Wishlist Item**: A customer's saved-for-later products, unique per customer/product pair.
- **Order / Order Item**: An immutable record of a completed checkout — items, quantities, prices, discount, total, currency, status, and a snapshot of the delivery address; owned by one customer.
- **Service**: A bookable aquarium service offered by the business; has price, duration, active status, and type.
- **Appointment / Appointment Slot**: A scheduled booking of a service by a customer for a date/time slot; a slot has a configured capacity and tracks remaining availability; an appointment has a status and belongs to one customer.
- **Review**: A rating and text tied to one customer, one product, and the specific completed order/purchase that qualified it.
- **Promotion / Coupon**: A discount rule (percentage or fixed) with a code, validity window, minimum order, maximum discount, and usage limits; applied to at most one order at a time.
- **Currency Rate**: A cached exchange rate between the base currency and a supported currency, with a fallback used when the external source is unavailable.
- **Notification**: A recorded event (order status change, appointment event, low-stock alert) addressed to a customer or to admins.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor can register and log in, and a shopper can find a specific in-stock product via search or filters, in a single short session with no manual data lookup required.
- **SC-002**: 100% of order totals and appointment slot availability reflect only server-side calculations — no scenario exists in which a client-submitted price, discount, or availability value is accepted as-is.
- **SC-003**: Under concurrent checkout or booking attempts for the last unit of stock or the last slot capacity, exactly one request succeeds and all others receive a clear, correct rejection — zero oversell or overbooking incidents.
- **SC-004**: A shopper can view the same product's price correctly converted in all three supported currencies (USD, GBP, PKR), each shown with its currency code, with no more than one stale-rate fallback occurrence per exchange-rate source outage.
- **SC-005**: A customer can complete the full journey — browse, add to cart, check out, view order in history — and separately, book an appointment and view it in their appointment list — without needing direct database or admin intervention.
- **SC-006**: An admin can retrieve dashboard statistics that numerically reconcile with the underlying orders/appointments/products/customers at the time of the request.
- **SC-007**: Every documented error case (auth, authorization, validation, not-found, duplicate, insufficient stock, appointment conflict, invalid currency, external failure) produces the consistent structured error format, with zero instances of an internal error leaking implementation detail to a client.
- **SC-008**: A customer can never view, modify, or cancel another customer's order, appointment, address, wishlist, or review — verified across all such resource types.

## Assumptions

- Payment processing is explicitly out of scope for this feature (per Clarifications); orders are created and tracked in a Pending status without a real charge, and payment-provider integration is deferred to a future feature, consistent with the constitution's Scalability principle listing payment gateways as future work.
- All actions that create or read personal, persistent records (cart, wishlist, orders, appointments, addresses, reviews, currency preference persistence) require an authenticated account; there is no guest checkout or guest booking in this scope. Guests may browse, search, and view converted prices without an account.
- A "forgot password" (unauthenticated password reset) flow is not specified in the source requirements and is treated as out of scope for this feature; only authenticated "change password" (with current-password verification) is required now.
- Review eligibility requires a **completed** order (not merely any order) containing the product being reviewed; a cancelled order does not qualify.
- Appointment slot capacity defaults to a value the admin configures per slot (per Clarifications); no specific default number is mandated by this spec.
- Exactly one coupon may be applied per order (per Clarifications); automatic, code-less promotions are not part of this scope unless a future feature adds them.
- "Popularity" as a sort option is derived from observable order/purchase activity; the exact ranking formula is an implementation detail for the planning phase.
