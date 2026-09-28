---
id: 0001
title: Specify Interactive Dashboard Feature
stage: spec
date: 2026-09-24
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.specify
labels: ["dashboard", "customer-dashboard", "admin-dashboard", "analytics", "notifications", "wishlist", "reviews", "admin-crud", "spec"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-interactive-dashboard/spec.md
 - specs/003-interactive-dashboard/checklists/requirements.md
tests:
 - none
---

## Prompt

# Specification — Interactive Dashboard

## 1. Purpose

Build a modern, responsive, highly interactive dashboard for the Pet Fish Shop platform.

The dashboard must provide users with a centralized interface to monitor activity, manage resources, view statistics, and perform common actions without repeatedly navigating through separate pages.

The dashboard should be:

* Interactive
* Responsive
* Data-driven
* Modular
* Accessible
* Fast
* Visually engaging
* Consistent with the overall Pet Fish Shop design system

The dashboard must consume data through the FastAPI backend and must not directly access the Neon database.

---

# 2. Dashboard Types

The platform will support two primary dashboard experiences.

## Customer Dashboard

The customer dashboard allows users to manage:

* Profile
* Orders
* Appointments
* Wishlist
* Cart
* Reviews
* Currency preference
* Notifications
* Saved addresses

## Admin Dashboard

The admin dashboard allows authorized administrators to manage:

* Products
* Categories
* Inventory
* Orders
* Customers
* Services
* Appointments
* Reviews
* Promotions
* Notifications
* Business analytics

---

# 3. Dashboard Layout

The dashboard should use a responsive application-shell layout.

```text
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
│ Logo | Search | Currency | Notifications | Profile           │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│ Sidebar       │              Main Dashboard                  │
│               │                                              │
│ Overview      │  Page Header                                 │
│ Products      │  Statistics                                  │
│ Orders        │  Charts                                      │
│ Appointments  │  Tables                                      │
│ Customers     │  Activity                                   │
│ Inventory     │  Quick Actions                               │
│ Services      │                                              │
│ Reviews       │                                              │
│ Promotions    │                                              │
│ Settings      │                                              │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

On smaller screens:

* Sidebar becomes collapsible.
* Navigation becomes drawer-based.
* Cards stack vertically.
* Tables become horizontally scrollable or responsive list views.
* Charts resize automatically.
* Controls remain touch-friendly.

---

# 4. Global Dashboard Interactivity

The dashboard must support interactive behavior throughout the interface.

## Sidebar

Users can:

* Expand/collapse sidebar
* Open navigation drawer on mobile
* Switch dashboard sections
* View active navigation state
* Collapse sidebar without losing current page
* Expand submenu items where applicable

The sidebar state should persist during the session.

---

# 5. Dashboard Header

The header must provide:

* Global search
* Currency selector
* Notification button
* User profile menu
* Theme control where supported
* Mobile menu trigger

## Global Search

Users can search across relevant dashboard resources.

Admin search may include:

* Products
* Orders
* Customers
* Appointments
* Services

Customer search may include:

* Products
* Orders
* Services

Search interactions should provide:

* Search suggestions
* Loading state
* Empty state
* Result grouping
* Keyboard navigation
* Result selection

---

# 6. Currency Selector

The dashboard must include a currency selector.

Supported currencies:

* USD
* GBP
* PKR

Users can:

* Open currency dropdown
* Select currency
* View currently selected currency
* Change currency without reloading the entire dashboard

Financial dashboard values should update according to the selected currency where conversion is applicable.

Examples:

* Sales
* Order totals
* Product prices
* Service prices

Currency conversion must use backend-provided exchange rates.

---

# 7. Notification Center

The dashboard must provide an interactive notification center.

Notifications may include:

* New order
* Order status update
* Appointment confirmation
* Appointment reminder
* Appointment cancellation
* Low inventory
* New review
* Promotional activity

Users can:

* Open notification panel
* View unread count
* Mark individual notification as read
* Mark all notifications as read
* Open related resource
* Dismiss notifications where supported

The notification panel should update without requiring a full page reload.

---

# 8. Customer Dashboard

## Overview

The customer dashboard should provide a quick overview of account activity.

Display:

* Total orders
* Active orders
* Completed orders
* Upcoming appointments
* Wishlist count
* Review count
* Current currency
* Recent activity

---

# 9. Customer Statistics Cards

Cards should display important account metrics.

Example:

```text
┌──────────────────┐
│ Total Orders     │
│ 24               │
│ View Orders →    │
└──────────────────┘
```

Cards must support:

* Hover interaction
* Click interaction
* Loading state
* Error state
* Navigation
* Responsive resizing

Clicking a card should navigate to the relevant dashboard section.

---

# 10. Customer Order Activity

Display recent orders.

Each order should show:

* Order ID
* Date
* Number of items
* Total
* Status
* Payment status where available
* Action

Actions:

* View order
* Track order
* Cancel where allowed
* Reorder where supported

---

# 11. Interactive Order Status

Order status should be visually represented.

Example:

```text
Pending
   ↓
Confirmed
   ↓
Processing
   ↓
Ready
   ↓
Out for Delivery
   ↓
Completed
```

Users can open an order to view its timeline.

The timeline should update based on backend status.

---

# 12. Customer Appointment Widget

Display:

* Upcoming appointment
* Service
* Date
* Time
* Location
* Appointment status

Actions:

* View details
* Reschedule
* Cancel
* Contact shop where supported

If there are no upcoming appointments:

Display an interactive CTA to browse available services.

---

# 13. Appointment Calendar

The dashboard should include an interactive calendar.

Users can:

* Switch month
* Switch week where supported
* Select a date
* View available appointments
* View existing appointments
* Select an appointment
* Open appointment details

Unavailable dates should be visually distinguishable.

---

# 14. Wishlist Widget

Display selected wishlist items.

Each item may include:

* Product image
* Product name
* Price
* Stock status
* Rating

Actions:

* Open product
* Add to cart
* Remove from wishlist

If an item becomes unavailable, display an appropriate state.

---

# 15. Customer Activity Feed

Display recent account activity.

Examples:

* Order placed
* Order completed
* Appointment booked
* Appointment completed
* Review submitted
* Product added to wishlist

The activity feed should update when new activity becomes available.

---

# 16. Admin Dashboard Overview

The admin dashboard is the main business-management interface.

It should provide an overview of:

* Revenue
* Orders
* Customers
* Products
* Inventory
* Appointments
* Services
* Reviews

---

# 17. Admin KPI Cards

Display interactive KPI cards for:

* Total sales
* Orders
* Customers
* Products
* Low-stock products
* Appointments
* Pending orders
* Pending appointments

Each card should support:

* Hover state
* Click navigation
* Loading state
* Error state
* Comparison data where available

---

# 18. Revenue Analytics

Provide an interactive revenue chart.

Users can switch between:

* Today
* 7 days
* 30 days
* 90 days
* 12 months
* Custom range

The chart should support:

* Hover tooltips
* Data-point highlighting
* Dynamic labels
* Responsive resizing
* Empty state
* Loading state

---

# 19. Sales Chart Controls

Admins should be able to change the displayed metric.

Possible metrics:

* Revenue
* Orders
* Average order value
* Products sold

The chart should update dynamically without a full dashboard reload.

---

# 20. Date Range Picker

Admin analytics must provide an interactive date-range picker.

Users can:

* Select start date
* Select end date
* Choose predefined ranges
* Clear range
* Apply range

Predefined ranges:

* Today
* Yesterday
* Last 7 days
* Last 30 days
* This month
* Last month
* This year

Invalid ranges must be rejected.

---

# 21. Sales Comparison

Where historical data exists, allow comparison with:

* Previous period
* Previous month
* Previous year

Display:

* Current value
* Previous value
* Absolute difference
* Percentage difference

The dashboard must present the underlying values clearly rather than relying solely on visual indicators.

---

# 22. Order Analytics

Provide interactive order analytics.

Metrics:

* Total orders
* Pending
* Confirmed
* Processing
* Completed
* Cancelled

Admins can:

* Click a status
* Filter order table
* Open related orders

Example:

```text
Completed: 120
      ↓
Click
      ↓
Orders filtered to Completed
```

---

# 23. Interactive Order Table

The admin order table should support:

* Search
* Filtering
* Sorting
* Pagination
* Column controls
* Status filtering
* Date filtering
* Customer filtering

Each row can provide:

* View
* Update status
* Cancel where permitted
* Open customer
* Open order details

---

# 24. Bulk Order Actions

Allow administrators to select multiple orders.

Supported actions may include:

* Update status
* Export
* Archive where applicable

Before destructive actions:

* Display confirmation
* Explain the action
* Require explicit confirmation

---

# 25. Inventory Dashboard

Display:

* Total products
* In-stock products
* Low-stock products
* Out-of-stock products

Provide an interactive inventory table.

Filters:

* In stock
* Low stock
* Out of stock
* Category
* Product type

Actions:

* Update stock
* View product
* View inventory history

---

# 26. Low Stock Alerts

Display an interactive low-stock widget.

Each item should show:

* Product
* Current stock
* Threshold
* Status

Clicking an item should open inventory management.

Admins should be able to update stock directly from the dashboard where appropriate.

---

# 27. Product Analytics

Display:

* Best-selling products
* Most viewed products where tracking exists
* Highest-rated products
* Low-stock products
* Recently added products

Allow admins to select a metric and time period.

---

# 28. Appointment Dashboard

Display:

* Today's appointments
* Upcoming appointments
* Pending appointments
* Completed appointments
* Cancelled appointments

Provide an interactive appointment calendar.

Admins can:

* Select date
* View appointments
* Open appointment details
* Confirm appointment
* Reschedule appointment
* Cancel appointment
* Mark completed
* Mark no-show

---

# 29. Appointment Timeline

Display appointments in chronological order.

Example:

```text
09:00  Aquarium Cleaning
10:30  Aquascaping
12:00  Water Testing
14:00  Aquarium Setup
```

Selecting an appointment should open its details panel.

---

# 30. Service Analytics

Display:

* Most booked services
* Number of appointments
* Revenue by service
* Completion rate
* Cancellation rate

Allow filtering by:

* Date
* Service
* Status

---

# 31. Customer Management

Admin dashboard must provide customer management.

Support:

* Customer search
* Customer filtering
* Customer sorting
* Customer details
* Order history
* Appointment history
* Reviews
* Account status

Customer detail view should provide a consolidated activity overview.

---

# 32. Review Management

Admins should be able to:

* View reviews
* Search reviews
* Filter by rating
* Filter by product
* Moderate reviews
* Approve reviews
* Hide/remove reviews according to platform rules

Interactive review rows should open review details.

---

# 33. Promotion Management

Admins can manage:

* Coupons
* Promotions
* Discount type
* Discount value
* Start date
* End date
* Usage limits
* Active/inactive state

Dashboard interactions should include:

* Toggle activation
* Edit
* View usage
* Filter active promotions
* Filter expired promotions

---

# 34. Interactive Quick Actions

Provide quick-action buttons.

Admin examples:

* Add Product
* Add Category
* Update Inventory
* Create Promotion
* View Orders
* Manage Appointments
* Add Service

Customer examples:

* Browse Products
* View Orders
* Book Service
* View Wishlist
* Manage Profile

Quick actions should open the appropriate workflow directly.

---

# 35. Modal Interactions

Use modals for lightweight operations.

Examples:

* Update inventory
* Change order status
* Cancel appointment
* Create coupon
* Confirm destructive actions

Modals must support:

* Keyboard navigation
* Close action
* Escape key
* Loading state
* Validation errors
* Success state
* Failure state

Large workflows should use dedicated pages instead of oversized modals.

---

# 36. Drawer Interactions

Use side drawers for contextual information.

Examples:

* Order details
* Appointment details
* Customer details
* Product preview
* Notification details

Drawers should allow users to inspect information without losing the dashboard context.

---

# 37. Interactive Charts

Charts should support:

* Hover
* Tooltips
* Filtering
* Date range selection
* Metric selection
* Responsive resizing
* Empty states
* Loading states

Charts should never be the only source of important business information.

Important numerical values must also be displayed as text.

---

# 38. Dashboard Filters

Global filters may include:

* Date
* Currency
* Product category
* Product type
* Order status
* Appointment status
* Service
* Customer
* Inventory status

Filters should update only relevant dashboard data.

---

# 39. Filter State

Dashboard filters should:

* Be clearly visible
* Show active filter count
* Support clearing individual filters
* Support clearing all filters
* Preserve state during navigation where appropriate

---

# 40. Real-Time / Dynamic Updates

Where technically appropriate, dashboard information should update without a full-page reload.

Potential dynamically updated data:

* Order status
* Appointment status
* Notifications
* Inventory alerts
* Dashboard KPIs

Use polling or real-time mechanisms only where justified.

Avoid unnecessary continuous network requests.

---

# 41. Loading States

Every dynamic dashboard component must support loading states.

Examples:

* Skeleton cards
* Skeleton tables
* Chart loading indicators
* Button loading states
* Inline loading indicators

Loading states should preserve layout stability.

---

# 42. Empty States

Every data-driven section must have a useful empty state.

Examples:

```text
No orders yet.

Start shopping to see your orders here.
[Browse Products]
```

```text
No upcoming appointments.

Book an aquarium service to get started.
[Browse Services]
```

Empty states should provide a relevant next action where appropriate.

---

# 43. Error States

Dashboard components must handle API failures gracefully.

Display:

* Clear error message
* Retry action
* Relevant context

Example:

```text
Unable to load sales data.

[Try Again]
```

Do not expose internal backend errors or stack traces.

---

# 44. Optimistic Interactions

Optimistic UI may be used for low-risk operations.

Suitable examples:

* Mark notification as read
* Remove wishlist item
* Toggle simple preference

Operations involving:

* Money
* Orders
* Inventory
* Appointment booking

must not rely solely on optimistic updates.

The backend response must remain authoritative.

---

# 45. Confirmation Interactions

Require confirmation for destructive or significant operations.

Examples:

* Delete/archive product
* Cancel order
* Cancel appointment
* Remove promotion
* Bulk actions

Confirmation dialogs should clearly state:

* What will happen
* What resource is affected
* Whether the action can be reversed

---

# 46. Responsive Interactivity

Desktop:

* Persistent sidebar
* Multi-column dashboard
* Full data tables
* Large charts

Tablet:

* Collapsible sidebar
* Reduced columns
* Responsive charts
* Stacked cards

Mobile:

* Drawer navigation
* Stacked KPI cards
* Compact charts
* Horizontal table scrolling or card-based data
* Touch-friendly controls
* Bottom actions where appropriate

---

# 47. Accessibility

The dashboard must support:

* Keyboard navigation
* Focus states
* Semantic HTML
* Accessible labels
* ARIA attributes where necessary
* Sufficient contrast
* Screen-reader-friendly controls
* Reduced motion preferences
* Accessible dialogs
* Accessible dropdowns
* Accessible tables

Interactive components must not depend solely on hover.

---

# 48. Dashboard API Requirements

The frontend must communicate with FastAPI through versioned endpoints.

Potential endpoints:

```text
GET /api/v1/dashboard/customer
GET /api/v1/dashboard/customer/orders
GET /api/v1/dashboard/customer/appointments
GET /api/v1/dashboard/customer/activity

GET /api/v1/admin/dashboard
GET /api/v1/admin/dashboard/sales
GET /api/v1/admin/dashboard/orders
GET /api/v1/admin/dashboard/inventory
GET /api/v1/admin/dashboard/appointments
GET /api/v1/admin/dashboard/services
GET /api/v1/admin/dashboard/customers
```

Additional endpoints may be created where separation improves maintainability.

---

# 49. Dashboard Data Rules

Dashboard APIs must:

* Return only authorized data
* Validate query parameters
* Support pagination where necessary
* Support date ranges
* Support filters
* Support sorting where appropriate
* Return consistent response structures
* Handle empty datasets
* Handle errors consistently

Admin statistics must only be accessible to authorized administrators.

---

# 50. Performance Requirements

The dashboard should:

* Avoid unnecessary API requests
* Load critical information first
* Lazy-load secondary sections
* Cache suitable data
* Paginate large datasets
* Avoid rendering unnecessarily large datasets
* Optimize chart rendering
* Optimize images
* Avoid unnecessary 3D rendering
* Preserve responsive interactions

---

# 51. Dashboard State Management

Dashboard state should be separated into:

* Authentication state
* User preferences
* Navigation state
* Filter state
* Server data
* UI state
* Modal/drawer state
* Notification state

Server data should not be treated as permanent local state when it requires synchronization with the backend.

---

# 52. Security Requirements

The dashboard must enforce:

* Authentication
* Role-based authorization
* Resource ownership
* Server-side validation
* Protected admin routes

The frontend must not rely on hidden UI elements as the security mechanism.

Every protected operation must be validated by FastAPI.

---

# 53. Acceptance Criteria

## Customer Dashboard

* Customer can access the dashboard after authentication.
* Customer can view account statistics.
* Customer can view recent orders.
* Customer can inspect order details.
* Customer can view upcoming appointments.
* Customer can manage appointments where permitted.
* Customer can view wishlist items.
* Customer can access profile information.
* Customer can change preferred currency.
* Customer can view notifications.
* Dashboard works responsively.

## Admin Dashboard

* Authorized admin can access the dashboard.
* Ordinary customers cannot access admin dashboard APIs.
* Admin can view business KPIs.
* Admin can filter dashboard data.
* Admin can change date ranges.
* Admin can interact with charts.
* Admin can inspect orders.
* Admin can manage inventory.
* Admin can inspect appointments.
* Admin can manage services.
* Admin can inspect customers.
* Admin can moderate reviews.
* Admin can manage promotions.
* Dashboard supports loading, empty, and error states.

---

# 54. Definition of Done

The dashboard is complete when:

* Customer dashboard is functional.
* Admin dashboard is functional.
* FastAPI dashboard APIs are implemented.
* Neon data is correctly represented.
* Authentication is enforced.
* Authorization is enforced.
* Currency selection works.
* Interactive charts work.
* Filters work.
* Date ranges work.
* Tables support required interactions.
* Modals and drawers work.
* Notifications work.
* Loading states exist.
* Empty states exist.
* Error states exist.
* Responsive behavior works.
* Accessibility requirements are addressed.
* Critical dashboard interactions are tested.
* No dashboard operation bypasses backend authorization.
* Dashboard implementation complies with the project constitution and plan.

(Delivered via the `/sp.specify` slash command, feature description as above; no separate free-text message accompanied it.)

## Response snapshot

Ran `git fetch --all --prune` and `create-new-feature.sh --short-name interactive-dashboard`, which computed branch number 002 — but that collided with the existing (unpushed, locally worktree-registered) `002-frontend-integration` branch because `git branch -a` prefixes a worktree-checked-out branch with `+`, which the script's branch-name-cleaning regex doesn't strip, so it silently excluded that branch from the highest-number scan. Pruned the stale worktree registration (its directory no longer existed) and manually renumbered the new branch/specs dir to `003-interactive-dashboard` to preserve the project's monotonic numbering convention.

Wrote a full spec.md restructuring the user's 54-section UI/UX brief into this project's SDD format: 15 prioritized user stories (P1–P3) covering both a Customer Dashboard (overview, order/appointment detail, wishlist, notifications) and an Admin Dashboard (overview, order management with bulk actions, inventory, revenue/order analytics with date-range comparison, appointment management, customer management, review moderation, and full CRUD for promotions/products/categories/services), 37 functional requirements grouped by area, edge cases, key entities (reusing the existing data model rather than redefining it), and 8 measurable, technology-agnostic success criteria.

Identified three decisions that materially change scope and asked the user via AskUserQuestion rather than assuming: (1) whether "admin can manage products/categories/services/promotions" means full create/edit forms or just the status/value changes the backend already exposes — user chose full CRUD forms, which (per a live check of the actual backend route files) requires no new backend work since create/update/archive endpoints already exist and are tested for all four entities, so two new user stories (14, 15) and five new FRs were added for this; (2) whether the requested date-range revenue analytics requires new backend aggregation endpoints (today's admin summary is a single fixed snapshot) — user confirmed yes, build the backend endpoint(s), which is now itself part of this feature's scope (FR-021–FR-023); (3) whether "updates without a full reload" requires WebSocket/SSE push or polling suffices — user confirmed polling (FR-028).

Created the spec-quality checklist (all items pass; no remaining `[NEEDS CLARIFICATION]` markers) and this PHR.

## Outcome

- ✅ Impact: `specs/003-interactive-dashboard/spec.md` is ready for `/sp.plan`. Scope is now large and explicit: two dashboard experiences, first-ever frontend surfaces for the wishlist and reviews features (backend already supports both, unused), full admin CRUD for products/categories/services/promotions (frontend-only — backend already supports it), one new backend capability (date-range analytics aggregation), and a notification center (backend already supports it, unused).
- 🧪 Tests: none (spec stage — no code changes).
- 📁 Files: `specs/003-interactive-dashboard/spec.md` (new), `specs/003-interactive-dashboard/checklists/requirements.md` (new), this PHR.
- 🔁 Next prompts: `/sp.plan` to produce the technical plan (and likely `/sp.tasks` after) — plan should explicitly decide whether this ships as one phased implementation or splits into sub-features (e.g., wishlist+reviews frontend, admin CRUD, analytics backend, dashboard shell) given the size; also worth an early ADR on the analytics endpoint's aggregation approach once planned.
- 🧠 Reflection: The create-new-feature.sh script has a real bug (worktree `+` marker not stripped before the branch-number regex), which silently causes numbering collisions whenever a branch is currently checked out in a linked worktree elsewhere on the machine — worth a fix so future `/sp.specify` runs don't need manual renumbering.

## Evaluation notes (flywheel)

- Failure modes observed: create-new-feature.sh's `get_highest_from_branches` strips only `*` and leading spaces from `git branch -a` output, not the `+` prefix `git` uses for a branch checked out in another worktree — causing a silent branch-number collision (002 reused) rather than an error, which would have shipped two features both named `002-*` if not caught by manually re-checking `git branch -a` after the script ran.
- Graders run and results (PASS/FAIL): spec quality checklist — PASS (all items); no [NEEDS CLARIFICATION] markers remain — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): Patch `create-new-feature.sh`'s branch-cleaning sed to also strip a leading `+` (worktree marker) alongside `*`, e.g. `sed 's/^[*+ ]*//; ...'`, and add `git worktree prune` before the branch scan so stale worktree registrations from prior sessions don't cause this class of bug again.
