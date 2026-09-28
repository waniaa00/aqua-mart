# Feature Specification: Interactive Dashboard

**Feature Branch**: `003-interactive-dashboard`
**Created**: 2026-09-24
**Status**: Draft
**Input**: User description: "Interactive Dashboard" — a modern, responsive, highly interactive dashboard for the Pet Fish Shop platform, providing two experiences (Customer Dashboard, Admin Dashboard) as a centralized interface to monitor activity, manage resources, view statistics, and perform common actions, consuming data exclusively through the FastAPI backend.

## Clarifications

### Session 2026-09-24

- Q: Does "admin can manage products/categories/services/promotions" mean this feature ships full create/edit forms for those entities, or does it mean the admin can view, filter, and perform the status/value changes the backend already exposes (order status, appointment status, stock quantity, promotion active toggle, review hide), leaving net-new creation/editing forms for a separate admin-CRUD feature? → A: Full create/edit forms are in scope. The backend already exposes create/update/archive endpoints for all four entities (products including fish-specific details, categories with parent hierarchy, services, promotions) — this feature builds the frontend forms against those existing, already-tested endpoints; no new backend work is needed for CRUD itself (only for analytics, per the next clarification).
- Q: The requested revenue analytics (switchable date ranges, custom range, period-over-period comparison) needs data the backend doesn't currently compute — today's admin summary endpoint returns one fixed, non-date-filtered snapshot. Should this feature include building the new backend endpoint(s) that compute revenue/orders by date range, or should it ship against only the currently-available fixed snapshot, with date-range analytics deferred? → A: Include the backend work — add date-range-aware analytics endpoint(s) as part of this feature, since the dashboard's own acceptance criteria depend on it.
- Q: Notifications, order status, and KPI figures should update "without a full page reload" per the input. Does that require push delivery (WebSocket/SSE), or is periodic re-fetch (polling) while the dashboard is open sufficient? → A: Polling is sufficient. No push/WebSocket infrastructure is required for this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer dashboard overview (Priority: P1)

A logged-in customer opens their dashboard and immediately sees a summary of their account: order counts, an upcoming appointment (if any), a wishlist count, their current currency, and quick links into each area — instead of having to visit separate pages to piece this together.

**Why this priority**: This is the primary reason a "dashboard" exists rather than a plain account page — a single-glance overview. Every other customer-facing story in this feature is a drill-down from here.

**Independent Test**: Log in as a customer with existing orders, an appointment, and wishlist items; open the dashboard and confirm all figures match what those individual pages show, with a working link from each stat to its full page.

**Acceptance Scenarios**:

1. **Given** a logged-in customer with orders, an appointment, and wishlist items, **When** they open their dashboard, **Then** they see total/active/completed order counts, upcoming-appointment summary, wishlist count, and current currency, each sourced from the backend.
2. **Given** a customer with no orders, appointments, or wishlist items yet, **When** they open the dashboard, **Then** each empty section shows a clear empty state with a relevant next action (e.g., "Browse Products") rather than a blank area.
3. **Given** a statistics card showing a count, **When** the customer clicks or activates it via keyboard, **Then** they navigate to that resource's full page (e.g., clicking "Orders" opens order history).
4. **Given** the dashboard is loading its data, **When** the page first renders, **Then** loading placeholders appear in place of the stats/cards rather than an empty or broken layout.
5. **Given** a request for dashboard data fails, **When** the failure occurs, **Then** the affected section shows a clear error message and a retry action, without breaking the rest of the dashboard.

---

### User Story 2 - Admin dashboard overview (Priority: P1)

An authorized admin opens their dashboard and sees business-wide KPIs (sales, orders, customers, products, low stock, appointments) as interactive cards that link into the relevant management area.

**Why this priority**: This is the admin's daily entry point for operating the business and is already partially built (`/admin`); this story extends it into the shared interactive-dashboard pattern (clickable cards, consistent loading/error/empty states) that the rest of the admin experience builds on.

**Independent Test**: Log in as an admin with existing orders, appointments, and products; open the dashboard and confirm KPI figures reconcile with the underlying data, and that clicking a KPI card navigates to the matching management view.

**Acceptance Scenarios**:

1. **Given** an authorized admin, **When** they open the dashboard, **Then** they see total sales, order count, customer count, product count, low-stock count, and appointment count, each reconciling with the underlying records.
2. **Given** a non-admin account, **When** it attempts to reach the admin dashboard (directly by URL, not just by hiding the nav link), **Then** access is blocked and the underlying API also rejects the request — the UI is never the only defense.
3. **Given** a KPI card, **When** the admin clicks it, **Then** they're taken to the corresponding management view (e.g., "Pending Orders" opens the order table pre-filtered to pending).
4. **Given** the dashboard is loading or a request fails, **When** that happens, **Then** the same loading/error/retry pattern as User Story 1 applies.

---

### User Story 3 - Admin order management (Priority: P1)

An admin works from an interactive, filterable order table — searching, filtering by status/date/customer, sorting, and updating an order's status inline — instead of only seeing a short "recent orders" list.

**Why this priority**: Order fulfillment is the core day-to-day admin task this platform exists to support; a static recent-orders list isn't enough to actually run the business, and the backend's order-management endpoints already exist unused.

**Independent Test**: As an admin, search for an order by customer, filter to "Pending", change one order's status to a valid next status, and confirm the change is reflected both in the table and in that customer's own order history.

**Acceptance Scenarios**:

1. **Given** the admin order table, **When** the admin searches, filters (status, date range, customer), or sorts, **Then** the table reflects all applied criteria together, paginated, matching the backend's response.
2. **Given** an order row, **When** the admin updates its status to a backend-valid next status, **Then** the change saves and is immediately reflected in the table and in the owning customer's order history; an invalid transition shows the backend's specific rejection reason.
3. **Given** an order row, **When** the admin opens it, **Then** a detail view shows items, quantities, prices, totals, status, and customer/address information without leaving the table's context (e.g., a drawer).
4. **Given** an order status breakdown (e.g., "Completed: 120"), **When** the admin clicks a status, **Then** the table filters to that status.

---

### User Story 4 - Customer order & appointment detail (Priority: P2)

A customer can open any of their own orders or appointments to see a clear visual status/timeline, and can act on an appointment (reschedule, cancel) where the backend allows it.

**Why this priority**: Builds directly on the order/appointment history already shipped, turning a flat list into something a customer can actually inspect and act on.

**Independent Test**: As a customer with a past order and an upcoming appointment, open each; confirm the order shows a status timeline and the appointment shows its date/time/location/status with a working cancel action when the backend permits it.

**Acceptance Scenarios**:

1. **Given** an order, **When** the customer opens it, **Then** they see a visual status progression (e.g., Pending → Confirmed → Processing → Completed) reflecting the order's actual backend status.
2. **Given** an upcoming appointment, **When** the customer views it, **Then** they see service, date, time, location, and status, with a cancel action where the backend's cancellation rules allow it; an appointment that can't be cancelled explains why.
3. **Given** no upcoming appointments, **When** the customer views this section, **Then** an empty state offers a direct link to browse bookable services.

---

### User Story 5 - Wishlist on the dashboard (Priority: P2)

A customer sees their saved products on the dashboard and can open a product, add it to cart, or remove it from the wishlist directly from there.

**Why this priority**: The backend already supports a wishlist (`/wishlist`) that has no frontend surface at all yet; the dashboard is the natural place to introduce it, and it's a self-contained, independently valuable slice.

**Independent Test**: Save two products to the wishlist from their product pages, open the dashboard, confirm both appear, remove one, and confirm it's gone on reload.

**Acceptance Scenarios**:

1. **Given** saved wishlist items, **When** the customer views the dashboard's wishlist section, **Then** each item shows its image, name, price, and stock status, sourced from the backend.
2. **Given** a wishlist item, **When** the customer removes it or adds it to cart, **Then** the change is saved to the backend and reflected immediately.
3. **Given** a wishlist item whose product has since become unavailable, **When** it's displayed, **Then** it's shown with a clear unavailable state rather than a broken or misleading "Add to Cart" action.
4. **Given** an empty wishlist, **When** the customer views this section, **Then** an empty state links to the shop.

---

### User Story 6 - Notification center (Priority: P2)

Both customers and admins can open a notification panel showing relevant events (order/appointment status changes, low stock for admins), see an unread count, and mark notifications read.

**Why this priority**: The backend already records notification events (`/notifications`) for exactly this purpose with no frontend consumer yet; it's a self-contained feature that meaningfully closes the loop on order/appointment status changes.

**Independent Test**: Trigger an order status change (as admin), then confirm the owning customer's notification panel shows a new unread notification referencing it, and that marking it read updates the unread count.

**Acceptance Scenarios**:

1. **Given** unread notifications exist for the logged-in account, **When** they open the notification panel, **Then** they see the notifications and an accurate unread count, sourced from the backend.
2. **Given** a notification, **When** the user marks it read (individually or via "mark all read"), **Then** the change is saved and the unread count updates without a full page reload.
3. **Given** a notification tied to a specific order or appointment, **When** the user opens it, **Then** they're taken to that resource.
4. **Given** no notifications, **When** the panel is opened, **Then** it shows a clear empty state.
5. **Given** the dashboard remains open, **When** a new notification-worthy event occurs server-side, **Then** the unread count updates within a short, reasonable polling interval without the user needing to refresh.

---

### User Story 7 - Admin revenue & order analytics (Priority: P2)

An admin views an interactive revenue chart with switchable date ranges (including a custom range) and can compare the current period to the previous one; order counts by status are similarly interactive and filter the order table when clicked.

**Why this priority**: The single most-requested "business intelligence" capability in the input, and the reason this feature requires backend work (date-range-aware aggregation) beyond the existing fixed dashboard summary.

**Independent Test**: As an admin, switch the analytics range between two predefined periods and a custom range, confirm the chart and its underlying numeric values update to match, and confirm a period-over-period comparison shows current value, previous value, and the difference.

**Acceptance Scenarios**:

1. **Given** the analytics view, **When** the admin selects a predefined range (today, 7/30/90 days, 12 months) or a valid custom range, **Then** the chart and its data reconcile with the backend's response for that exact range.
2. **Given** an invalid custom range (e.g., end before start), **When** the admin attempts to apply it, **Then** it's rejected with a clear message and the previous valid range remains in effect.
3. **Given** a selected range with a defined "previous period," **When** the admin requests a comparison, **Then** current value, previous value, and both the absolute and percentage difference are shown as text (not only as a visual indicator).
4. **Given** the order-status breakdown, **When** the admin clicks a status, **Then** the admin order table (User Story 3) filters to it.
5. **Given** no orders exist in the selected range, **When** the chart renders, **Then** it shows a clear empty state rather than a blank or broken chart.

---

### User Story 8 - Admin inventory management (Priority: P2)

An admin views stock levels across all products in an interactive, filterable table (in stock / low stock / out of stock / by category), sees a low-stock alert list, and can update a product's stock quantity directly.

**Why this priority**: Inventory accuracy directly affects whether the storefront oversells; the backend's inventory-update endpoint already exists with no admin UI.

**Independent Test**: As an admin, filter the inventory table to "Low Stock," update one product's stock quantity, and confirm it moves out of the low-stock list once above threshold.

**Acceptance Scenarios**:

1. **Given** the inventory view, **When** the admin filters by stock status or category, **Then** the table reflects the filter, matching the backend's data.
2. **Given** the low-stock widget, **When** the admin updates a listed product's stock directly from it, **Then** the change saves via the backend and the widget updates to reflect the new state.
3. **Given** a stock update that would be invalid (e.g., negative quantity), **When** submitted, **Then** the backend's rejection is shown and no change is applied.

---

### User Story 9 - Global search (Priority: P2)

From the dashboard header, a user searches across the resources relevant to their role (customer: products/orders/services; admin: products/orders/customers/appointments/services) and jumps directly to a result.

**Why this priority**: A cross-cutting convenience that meaningfully reduces navigation friction once several dashboard sections exist to search across; not required for any single section to function on its own.

**Independent Test**: As a customer, search for a known product name and confirm it appears as a suggested result that navigates to that product; as an admin, search for a known order ID or customer name and confirm the equivalent.

**Acceptance Scenarios**:

1. **Given** the search field, **When** the user types a query, **Then** matching results are grouped by resource type, with a loading indicator while the search is in flight.
2. **Given** no results match, **When** the search completes, **Then** a clear empty state is shown.
3. **Given** a list of results, **When** the user navigates them via keyboard and selects one, **Then** they're taken to that resource.

---

### User Story 10 - Admin appointment management (Priority: P3)

An admin views today's/upcoming/pending/completed/cancelled appointments, browses them via a calendar or chronological timeline, and confirms, reschedules, cancels, completes, or marks an appointment as a no-show.

**Why this priority**: Operationally important but appointments already have a working booking path; this is the admin-side management layer on top of appointments that already exist.

**Independent Test**: As an admin, open today's appointment list, confirm a pending appointment, and reschedule another to a different available slot; confirm both changes are visible to the owning customer.

**Acceptance Scenarios**:

1. **Given** the appointment view, **When** the admin selects a date, **Then** they see that date's appointments in chronological order.
2. **Given** an appointment, **When** the admin confirms, reschedules, cancels, completes, or marks it no-show, **Then** the change saves via the backend and is reflected in the owning customer's appointment view.
3. **Given** a reschedule action, **When** the admin picks a new slot, **Then** only slots the backend currently reports as available are selectable.

---

### User Story 11 - Admin customer management (Priority: P3)

An admin searches, filters, and opens individual customers to see a consolidated view of their orders, appointments, and reviews.

**Why this priority**: Supports customer service and account troubleshooting; the backend's customer-summary/detail endpoints already exist with no admin UI.

**Independent Test**: As an admin, search for a known customer by name/email, open their detail view, and confirm their order and appointment history matches what that customer sees on their own account.

**Acceptance Scenarios**:

1. **Given** the customer list, **When** the admin searches, filters, or sorts, **Then** results reflect all applied criteria, paginated.
2. **Given** a customer's detail view, **When** the admin opens it, **Then** it shows their profile, order history, appointment history, and reviews, sourced from the backend.

---

### User Story 12 - Admin review moderation (Priority: P3)

An admin lists, searches, and filters reviews (by rating, by product) and can hide/remove a review per platform rules.

**Why this priority**: A trust-and-safety capability layered on top of reviews (a separate, not-yet-built feature this dashboard depends on); appropriately last since it's meaningless before reviews exist.

**Independent Test**: As an admin, filter reviews to a specific product and rating, moderate one, and confirm it no longer appears publicly on that product's page.

**Acceptance Scenarios**:

1. **Given** the review list, **When** the admin filters by rating or product, **Then** results reflect the filter.
2. **Given** a review, **When** the admin moderates (hides) it, **Then** the backend's moderation rule is applied and the review no longer appears on the public product page; the action requires confirmation first.

---

### User Story 13 - Admin promotion management (Priority: P3)

An admin views existing coupons/promotions, filters by active/expired, creates a new promotion, edits an existing one, toggles its active state, and views its usage.

**Why this priority**: Gives the business both visibility and control over promotions — creating a new seasonal coupon or killing a misconfigured one — without depending on direct database access.

**Independent Test**: As an admin, create a new percentage-discount promotion with a code and date range, confirm it can be applied to a qualifying cart, then edit its discount value and confirm the new value applies.

**Acceptance Scenarios**:

1. **Given** the promotion list, **When** the admin filters by active/expired, **Then** results reflect the filter.
2. **Given** the promotion form, **When** the admin creates a promotion with a code, discount type/value, date range, and optional minimum order/max discount/usage limit, **Then** it's created via the backend and immediately usable at checkout within its rules; a duplicate code or invalid date range is rejected with the backend's specific reason.
3. **Given** an existing promotion, **When** the admin edits its discount value, dates, limits, or active state, **Then** the change saves via the backend and takes effect immediately.
4. **Given** a promotion, **When** the admin views it, **Then** its usage count and remaining limit (if any) are shown.

---

### User Story 14 - Admin product & category management (Priority: P2)

An admin creates and edits products (including fish-specific details where applicable) and organizes them into hierarchical categories, directly from the dashboard.

**Why this priority**: The product catalog is the foundation everything else (shop browsing, cart, inventory, Build My Aquarium) depends on; today it can only be populated via direct API calls, with no admin UI at all. This naturally sits alongside inventory management (User Story 8).

**Independent Test**: As an admin, create a new category, create a product assigned to it (with fish details if it's a fish), confirm it appears in the live shop, then edit its price and confirm the change is reflected there too.

**Acceptance Scenarios**:

1. **Given** the category management view, **When** the admin creates, edits, or archives a category (including assigning a parent for hierarchy), **Then** the change saves via the backend and is reflected in the shop's category list.
2. **Given** the product form, **When** the admin creates a product (name, slug, SKU, description, category, base price, product type, initial stock) and, if the product type is "fish," its species/care details, **Then** it's created via the backend and immediately visible in the live catalog; a missing required field or duplicate slug/SKU is rejected with the backend's specific reason.
3. **Given** an existing product, **When** the admin edits its details, price, status, or featured flag, **Then** the change saves and is reflected in the shop; fish-specific fields only appear in the form for fish-type products.
4. **Given** a product, **When** the admin archives it, **Then** it no longer appears in the live shop but historical orders referencing it are unaffected.

---

### User Story 15 - Admin service management (Priority: P3)

An admin creates and edits bookable services (name, description, price, duration, type) and manages their appointment slots (creating available date/time slots with capacity).

**Why this priority**: Completes the admin-CRUD set alongside products/categories/promotions; appointment booking (already shipped) depends on slots existing, which today can only be created via direct API calls.

**Independent Test**: As an admin, create a new service, add an available slot for a future date, and confirm a customer can then book that exact slot.

**Acceptance Scenarios**:

1. **Given** the service form, **When** the admin creates or edits a service (name, description, price, duration, type, active state), **Then** the change saves via the backend and is reflected on the public Services page.
2. **Given** a service, **When** the admin adds a slot (date, start time, capacity) or edits/blocks an existing slot, **Then** the change saves and is immediately reflected as availability (or unavailability) to customers booking that service.

---

### User Story 16 - Customer activity feed (Priority: P2)

A customer sees a chronological feed of their own recent account
activity on the dashboard — orders placed/completed, appointments
booked/completed, reviews submitted, and wishlist additions — instead
of checking each section separately.

**Why this priority**: A natural companion to User Story 1's
at-a-glance overview; useful but not on the critical path any other
story depends on, so it ships after the MVP.

**Independent Test**: As a customer with at least one order, one
appointment, and one wishlist addition from the last 30 days, open the
activity feed and confirm all three appear, newest-first, each linking
to its source resource.

**Acceptance Scenarios**:

1. **Given** a customer with recent orders, appointments, reviews, and
   wishlist activity, **When** they view the activity feed, **Then**
   entries from all sources appear together, sorted newest-first, each
   with a readable timestamp.
2. **Given** an activity entry, **When** the customer opens it,
   **Then** they're taken to the related order, appointment, product,
   or review.
3. **Given** no recent activity, **When** they view this section,
   **Then** a clear empty state is shown.
4. **Given** the feed is loading or a request fails, **When** that
   happens, **Then** the same loading/error/retry pattern as User
   Story 1 applies.

---

### Edge Cases

- The backend is unreachable when the dashboard loads or an action is submitted — the affected section shows a clear error and retry action; the rest of the dashboard keeps working.
- A stored session expires mid-session — the next protected action prompts re-login rather than failing silently or retrying forever.
- Two admins update the same order's status at nearly the same time — the second update either succeeds against the new state or is rejected with a clear "this order has changed" message; it never silently overwrites.
- A customer's wishlist item's product is archived by an admin while the dashboard is open — the item shows an unavailable state on next refresh rather than a broken link.
- An admin applies a custom analytics date range spanning a period with zero orders — the chart shows a clear empty state, not an error.
- A user resizes the browser between desktop and mobile widths while a drawer or modal is open — the open panel adapts (e.g., drawer becomes full-screen) without losing its content or state.
- A filter is applied that matches zero results — the table/list shows a specific "no results for this filter" empty state (distinct from "no data exists at all"), with a way to clear the filter.
- A user with only the customer role attempts to reach any admin dashboard URL or API — blocked at both the route level and the API level, per existing role-based authorization.

## Requirements *(mandatory)*

### Functional Requirements

**Shell & Navigation**

- **FR-001**: The dashboard MUST present a persistent (desktop) or collapsible/drawer (tablet/mobile) navigation between its sections, with the active section visually indicated.
- **FR-002**: The navigation's collapsed/expanded state MUST persist for the remainder of the browser session.
- **FR-003**: The dashboard header MUST provide global search, the existing currency selector, a notification button, and the user's profile/account menu.
- **FR-004**: The dashboard MUST render as a single-column, touch-friendly layout on mobile widths, with tables becoming horizontally scrollable or card-based, and charts resizing to fit.

**Customer Dashboard**

- **FR-005**: The system MUST show an authenticated customer their own order counts (total/active/completed), upcoming appointment summary, wishlist count, review count, and current currency preference, all sourced from the backend.
- **FR-006**: The system MUST show a customer their recent orders (id, date, item count, total, status) with actions to view detail and, where the backend allows, cancel or reorder.
- **FR-007**: The system MUST visually represent an order's status as a progression reflecting its actual backend status.
- **FR-008**: The system MUST show a customer their upcoming appointment (service, date, time, location, status) with view/reschedule/cancel actions available exactly where the backend's rules permit them.
- **FR-009**: The system MUST let a customer view, add-to-cart from, and remove items from their wishlist directly on the dashboard.
- **FR-010**: The system MUST show a customer a feed of their own recent account activity (orders placed/completed, appointments booked/completed, reviews submitted, wishlist additions).

**Admin Dashboard**

- **FR-011**: The system MUST show an authorized admin KPI figures (total sales, orders, customers, products, low-stock count, appointments, pending orders, pending appointments) that reconcile with underlying records.
- **FR-012**: Each admin KPI card MUST navigate to its corresponding management view when activated.
- **FR-013**: The system MUST provide an interactive admin order table supporting search, status/date/customer filtering, sorting, and pagination, with per-row status update and a detail view.
- **FR-014**: The system MUST let an admin select multiple orders and apply a supported bulk action (at minimum, status update), with an explicit confirmation step before any bulk or otherwise destructive action.
- **FR-015**: The system MUST provide an interactive inventory view (stock status/category filters) with a low-stock alert list and the ability to update a product's stock quantity from it.
- **FR-016**: The system MUST provide an interactive appointment view (date-based, chronological) letting an admin confirm, reschedule, cancel, complete, or mark an appointment as no-show.
- **FR-017**: The system MUST provide admin customer management: search/filter/sort a customer list and open a consolidated detail view (profile, orders, appointments, reviews) per customer.
- **FR-018**: The system MUST provide admin review moderation: list/filter reviews (by rating, by product) and hide a review, with confirmation before the action is applied.
- **FR-019**: The system MUST provide admin promotion management: list/filter promotions (active/expired), create a new promotion (code, discount type/value, date range, optional minimum order/max discount/usage limit), edit an existing one, toggle its active state, and view its usage against any configured limit.
- **FR-020**: The system MUST provide admin category management: create, edit, and archive categories, including assigning a parent category for hierarchy.
- **FR-020a**: The system MUST provide admin product management: create a product (name, slug, SKU, description, category, base price, product type, initial stock/threshold), conditionally show and accept fish-specific fields only when the product type is "fish," edit an existing product's details/price/status/featured flag, and archive a product.
- **FR-020b**: The system MUST provide admin service management: create and edit services (name, description, price, duration, type, active state), and create, edit, or block appointment slots for a service (date, start time, capacity).
- **FR-020c**: Every create/edit form in FR-019–FR-020b MUST surface the backend's specific validation rejection (e.g., duplicate slug/SKU/code, missing required field, invalid date range) inline, rather than a generic failure.

**Analytics**

- **FR-021**: The system MUST provide a backend-computed revenue/order analytics endpoint parameterized by date range (today, 7/30/90 days, 12 months, and an arbitrary custom start/end), returning figures for the requested range only.
- **FR-022**: The system MUST reject an invalid custom date range (e.g., end before start, or a range exceeding a sensible bound) with a clear error, both client-side (immediate feedback) and server-side (authoritative).
- **FR-023**: Where a "previous period" is well-defined for the selected range, the system MUST support comparing current vs. previous period, returning both absolute and percentage difference from the backend rather than computed client-side.
- **FR-024**: The revenue chart MUST support switching the displayed metric (at minimum: revenue, order count) without a full page reload, and MUST also present the underlying numeric values as text, not only visually.
- **FR-025**: The admin order-status breakdown MUST be clickable, filtering the admin order table (FR-013) to the selected status.

**Notifications**

- **FR-026**: The system MUST let a user (customer or admin) open a notification panel listing their own notifications with an accurate unread count, sourced from the backend.
- **FR-027**: The system MUST let a user mark one or all notifications read, and MUST let them open a notification's related resource (order/appointment) directly.
- **FR-028**: While the dashboard remains open, the system MUST periodically re-check for new notifications and updated KPI/status figures (polling), without requiring a manual page reload; polling MUST NOT be so frequent as to place unreasonable load on the backend.

**Search**

- **FR-029**: The system MUST provide a global search scoped to the resources relevant to the current user's role, with grouped results, a loading state, an empty state, and keyboard navigation to a result.

**Cross-Cutting: States & Interaction Patterns**

- **FR-030**: Every dashboard section that loads data from the backend MUST have a distinguishable loading state, error state (with retry), and empty state (with a relevant next action where applicable), in addition to its normal populated state.
- **FR-031**: Destructive or otherwise significant actions (cancel order/appointment, hide review, bulk actions, deactivate promotion) MUST require explicit confirmation that states what will happen, what resource is affected, and whether it can be undone.
- **FR-032**: Operations involving money, orders, inventory, or appointment booking MUST NOT rely solely on optimistic UI updates — the backend's response remains authoritative and the UI reconciles to it. Lower-risk operations (mark notification read, remove wishlist item) may update optimistically.
- **FR-033**: Lightweight, single-purpose actions (status change, stock update, cancel) MUST use a modal or inline control; multi-step or data-heavy workflows MUST use a dedicated view rather than an oversized modal.
- **FR-034**: Contextual detail (order, appointment, customer, notification) MUST be inspectable via a panel (e.g., a drawer) that keeps the surrounding dashboard list/table in view rather than fully replacing it.

**Security & Data**

- **FR-035**: Every admin-only dashboard view and the data it displays MUST be enforced by the backend, independent of whether the corresponding UI is shown or hidden — a non-admin session must be rejected by the API even if it somehow reaches the route.
- **FR-036**: A customer MUST only ever see their own orders, appointments, wishlist, reviews, and notifications; an admin's elevated access follows the same ownership/authorization rules already established for the rest of the platform.
- **FR-037**: All dashboard API requests (search, filters, date ranges, pagination, sort) MUST be validated server-side; the frontend's own validation is a convenience, not the authority.

### Key Entities

- **Dashboard Preferences** *(client-side only, not persisted server-side)*: per-user UI state such as collapsed/expanded navigation, last-viewed analytics range, and active table filters — scoped to the current browser session.
- **Notification** *(already defined in the platform's data model)*: an event record addressed to a customer or to admins; this feature adds read/unread state exposed to the UI and the "mark read" action.
- **Analytics Range**: a date range (predefined or custom) and, where applicable, its comparison period — a query parameter shape, not a stored entity.
- Reuses, without redefining: **Order/Order Item**, **Appointment/Appointment Slot**, **Product/Inventory**, **Wishlist/Wishlist Item**, **Review**, **Promotion**, **Customer/User Profile** — all as already defined by the platform's existing data model.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can see their full account overview (orders, appointment, wishlist, currency) within a single dashboard view, without navigating to more than one page, in under 3 seconds on a typical broadband connection.
- **SC-002**: An admin can locate and update the status of a specific order (by searching/filtering) in under 30 seconds, without leaving the order management view.
- **SC-003**: 100% of figures shown on either dashboard (KPIs, analytics, counts) reconcile exactly with the underlying backend records at the time of the request — zero instances of a client-computed or stale-but-presented-as-live figure.
- **SC-004**: Every backend rejection reachable through dashboard actions (invalid status transition, invalid date range, insufficient stock, unauthorized access) is shown to the user as a specific, readable message — zero generic or blank failures for these cases.
- **SC-005**: Switching the analytics date range or the currency selector updates the visible data without a full page reload, in under 2 seconds.
- **SC-006**: A non-admin account is blocked from every admin-only view and its underlying data 100% of the time, verified at both the route and API level.
- **SC-007**: The dashboard remains fully usable (all core actions reachable, no horizontal page scroll, no unreadable/overlapping content) at common mobile, tablet, and desktop widths.
- **SC-008**: A screen-reader or keyboard-only user can reach and operate every primary dashboard action (navigate sections, open a table row, submit a status change, dismiss a modal/drawer) without a mouse.

## Assumptions

- This feature extends the already-shipped customer account page (`/account`) and admin stats page (`/admin`) into the fuller interactive-dashboard pattern described here, rather than replacing them outright; existing URLs may be reused or consolidated at planning time.
- "Real-time" dashboard updates are implemented via periodic polling while the dashboard is open, not WebSocket/SSE push (per Clarifications) — acceptable because none of this feature's data is latency-critical at sub-second granularity.
- Full create/edit management forms for products, categories, services, and promotions are in scope (per Clarifications) and require only frontend work — the backend's create/update/archive endpoints for all four already exist and are already tested; this feature does not modify the backend for CRUD, only adds the new date-range analytics endpoint(s).
- Reviews (User Story 12's subject) and Wishlist UI (User Story 5) are themselves not yet built anywhere in the product; this feature is their first frontend surface, alongside the dashboard experience around them.
- Date-range revenue/order analytics (User Story 7) requires new backend aggregation endpoint(s); this feature's scope includes that backend work (per Clarifications), not just the frontend chart.
- "Export" (mentioned as a possible bulk order action) is treated as a nice-to-have, not a required capability, since no specific export format or destination was given; it may be omitted at planning time without affecting Definition of Done.
- Polling intervals, exact chart library/rendering approach, and specific component structure are implementation decisions for `/sp.plan`, not specified here.
