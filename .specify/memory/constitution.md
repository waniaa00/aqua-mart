<!--
Sync Impact Report
==================
Version change: 1.0.0 → 2.0.0
Rationale for MAJOR bump: this is a complete, backward-incompatible
  redefinition of the project's scope and principles. The prior version
  (1.0.0) ratified a frontend-only prototype stance ("no backend until
  explicitly asked"); this version reverses that and MANDATES a
  production backend (Python/FastAPI/PostgreSQL/Neon/SQLAlchemy or
  SQLModel/Alembic/uv), a modular multi-domain architecture, and a much
  larger set of business rules (inventory, orders, appointments,
  multi-currency, auth/authz, fish welfare, etc.). Nearly every prior
  principle is either replaced or superseded in substance.
Modified principles: all five 1.0.0 principles superseded by the 36
  sections below (Frontend-First Backend-Ready → reversed into a
  mandatory backend; Simplicity/YAGNI → retained in spirit via §27 Phase
  Discipline and §34 Scalability; Test-Proportionate-to-Risk → broadened
  into §22 Testing Principle covering the full backend surface; Three.js
  Isolation → narrowed into one constraint inside §2.3 and §16; Single
  Source of Truth for Pricing → reaffirmed and expanded in §10–§11)
Added sections: §1 Project Vision, §2 Core Technology Principles,
  §3 Architecture Principles, §4 API-First Principle, §5 Database
  Principles, §6 Product Principles, §7 Fish Welfare Principle,
  §8 E-Commerce Principles, §9 Inventory Principles, §10 Currency
  Principle, §11 Currency Calculation Principle, §12 Appointment-Based
  Services, §13 Customer Experience Principle, §14 Responsive Design
  Principle, §15 UI/UX Principle, §16 3D Experience Principle,
  §17 Accessibility Principle, §18 Authentication and Authorization,
  §19 Security Principle, §20 Error Handling Principle, §21 Validation
  Principle, §22 Testing Principle, §23 Performance Principle,
  §24 External Services Principle, §25 Environment Configuration,
  §26 Development Workflow, §27 Phase Discipline, §28 Code Quality,
  §29 Documentation Principle, §30 Git and Version Control, §31 No Fake
  Functionality, §32 Data Integrity Principle, §33 Privacy Principle,
  §34 Scalability Principle, §35 Definition of Done, §36 Final Project
  Standard, and a new Governance section (versioning/amendment/
  compliance mechanics, not present in the user-authored draft).
Removed sections: the 1.0.0 "Additional Constraints" note restricting the
  stack to React 19 + Router 7 + Vite + Three.js only (superseded by
  §2's full-stack technology principles).
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — generic, derives Constitution
     Check gates dynamically from this file; already supports a
     backend/frontend split (Option 2: Web application); no edit needed
  ✅ .specify/templates/spec-template.md — generic FR/SC structure
     already accommodates backend + auth + data requirements; no edit
     needed
  ✅ .specify/templates/tasks-template.md — generic phase/user-story
     structure already covers DB migrations, auth foundation, contract
     tests; no edit needed
  ✅ .claude/commands/sp.*.md — no agent-specific or outdated references
     found
  ⚠ README.md — still documents the current shipped state ("This is a
     front-end prototype... no backend, database, or payment processor")
     which now describes ONLY the pre-migration baseline, not the
     constitution's target architecture. Needs a manual rewrite (or a
     "Current implementation status vs. target architecture" note) once
     backend work begins — NOT done here as it exceeds constitution scope.
  ⚠ package.json — declares only frontend dependencies (react,
     react-dom, react-router-dom, three); will need a companion
     backend project (FastAPI/uv) per §2.1 when that work starts.
Follow-up TODOs: none blocking — the two ⚠ items above are expected
  since the constitution defines a target architecture ahead of the
  matching implementation; they are not placeholder gaps in this file.
-->

# Pet Fish Shop Platform Constitution

## 1. Project Vision

Build a modern, production-ready online pet fish and aquarium marketplace that allows customers to:

- Discover and purchase pet fish
- Purchase aquarium products and supplies
- Book aquarium-related services
- Schedule home visits and maintenance
- Manage orders and appointments
- Select their preferred currency
- Manage their customer account
- Receive a smooth, responsive, accessible, and trustworthy shopping experience

The platform must combine:

- E-commerce
- Appointment booking
- Aquarium services
- Inventory management
- Multi-currency pricing
- Customer accounts
- Administrative management
- Modern visual design
- Optional immersive 3D experiences

The system must be designed for future expansion without requiring major architectural changes.

---

## 2. Core Technology Principles

### 2.1 Backend

The backend MUST use:

- Python
- FastAPI
- PostgreSQL
- Neon PostgreSQL
- Pydantic
- SQLAlchemy or SQLModel
- Alembic
- uv

Backend business logic MUST remain independent from frontend implementation.

### 2.2 Frontend

The frontend SHOULD use:

- JavaScript / TypeScript
- React-based architecture
- Modern responsive UI
- Component-based development
- API-driven communication with FastAPI

The frontend MUST NOT directly access the production database.

All business-critical operations MUST go through backend APIs.

### 2.3 3D and Visual Experience

The project may use:

- Three.js
- React Three Fiber
- WebGL
- 3D models
- Animations
- Interactive aquarium environments

3D elements MUST enhance the user experience rather than interfere with:

- Navigation
- Accessibility
- Performance
- Product discovery
- Checkout
- Mobile usability

3D MUST NOT be required for core functionality.

---

## 3. Architecture Principles

The project MUST follow a modular architecture.

Major domains include:

- Authentication
- Users
- Products
- Categories
- Fish
- Aquarium supplies
- Inventory
- Cart
- Wishlist
- Orders
- Appointments
- Services
- Currency
- Reviews
- Promotions
- Notifications
- Administration

Each domain SHOULD have clearly separated:

- Models
- Schemas
- API routes
- Business logic
- Database operations
- Tests

Business logic MUST NOT be duplicated across frontend and backend.

---

## 4. API-First Principle

The backend MUST expose functionality through well-defined REST APIs.

The frontend MUST consume backend APIs instead of implementing independent business logic.

API design MUST prioritize:

- Predictability
- Consistency
- Validation
- Security
- Versioning
- Clear error handling
- Documentation

The API SHOULD use:

`/api/v1/`

as the initial version prefix.

---

## 5. Database Principles

Neon PostgreSQL is the primary production database.

Database design MUST prioritize:

- Data integrity
- Referential integrity
- Appropriate relationships
- Foreign keys
- Unique constraints
- Indexes
- Transactions
- Migration safety

Database schema changes MUST use Alembic migrations.

Direct production database manipulation MUST NOT be used as the normal development workflow.

---

## 6. Product Principles

The platform MUST support both:

### Live Aquatic Products

Examples:

- Betta fish
- Guppies
- Goldfish
- Tetras
- Angelfish
- Cichlids
- Other freshwater fish
- Marine fish where supported
- Shrimp
- Snails

### Aquarium Products

Examples:

- Aquariums
- Filters
- Pumps
- Heaters
- Lighting
- Fish food
- Water conditioners
- Plants
- Decorations
- Gravel/substrate
- Cleaning equipment
- Aquarium accessories

The architecture MUST allow new product types to be added without restructuring the entire system.

---

## 7. Fish Welfare Principle

The platform MUST treat live fish differently from ordinary physical products.

Fish-related information SHOULD include:

- Species
- Scientific name
- Size
- Age where applicable
- Gender where applicable
- Temperament
- Difficulty
- Minimum tank size
- Temperature requirements
- pH requirements
- Diet
- Compatibility
- Care instructions

The platform MUST NOT encourage irresponsible stocking or incompatible fish combinations.

Product information should prioritize responsible fish ownership.

---

## 8. E-Commerce Principles

The platform MUST support:

- Product browsing
- Product search
- Filtering
- Sorting
- Product details
- Cart
- Wishlist
- Checkout
- Orders
- Order history
- Inventory

The backend MUST be the source of truth for:

- Product prices
- Stock availability
- Discounts
- Order totals
- Inventory
- Order status

The frontend MUST NOT be trusted for financial calculations or inventory validation.

---

## 9. Inventory Principles

Inventory MUST be tracked by the backend.

The system MUST:

- Track stock quantities
- Prevent overselling
- Support stock adjustments
- Support low-stock thresholds
- Handle out-of-stock products
- Update inventory safely during order processing

Inventory-changing operations MUST be transaction-safe.

Live fish inventory SHOULD support availability states appropriate for live animals.

---

## 10. Currency Principle

The platform MUST support user-selectable currencies.

Initial currencies:

- USD — US Dollar
- GBP — British Pound
- PKR — Pakistani Rupee

The currency system MUST be designed so additional currencies can be added later.

The user MUST be able to change their preferred currency.

Currency preference SHOULD persist for authenticated users.

Guest users may store the preference on the client side.

---

## 11. Currency Calculation Principle

Products SHOULD have one authoritative base price and base currency.

Converted prices MUST be calculated using exchange rates.

The system MUST NOT maintain manually duplicated permanent prices for every currency unless explicitly required for a future business reason.

Financial calculations MUST use decimal-safe monetary handling.

The frontend MUST NOT be responsible for authoritative order totals.

---

## 12. Appointment-Based Services

The platform MUST support service appointments.

Initial services may include:

- Aquarium setup
- Aquarium cleaning
- Aquarium maintenance
- Aquascaping
- Water testing
- Fish-care consultation
- Home aquarium visits
- Custom aquarium design
- Aquarium relocation

Customers MUST be able to:

1. Select a service
2. Select an available date
3. Select an available time
4. Provide required information
5. Submit the appointment

The backend MUST verify availability before confirming an appointment.

Double-booking MUST be prevented.

---

## 13. Customer Experience Principle

The platform MUST prioritize a simple customer journey:

`Discover → Explore → Select → Customize → Purchase/Book → Track → Manage`

Important actions MUST be easy to find.

The interface SHOULD minimize unnecessary steps.

Customers MUST receive clear feedback after important actions.

---

## 14. Responsive Design Principle

The platform MUST work across:

- Desktop
- Laptop
- Tablet
- Mobile

Core functionality MUST remain usable on small screens.

Responsive behavior MUST be considered during component design rather than added as an afterthought.

---

## 15. UI/UX Principle

The design should feel:

- Modern
- Premium
- Clean
- Trustworthy
- Aquatic
- Immersive
- Professional

The visual language SHOULD communicate an aquarium environment without sacrificing usability.

Use:

- Strong visual hierarchy
- Clear typography
- Consistent spacing
- Meaningful animations
- High-quality product presentation
- Clear calls to action

Avoid unnecessary visual complexity.

---

## 16. 3D Experience Principle

3D experiences SHOULD be used strategically.

Potential applications:

- Interactive hero aquarium
- 3D fish environments
- Aquarium product visualization
- Aquascape previews
- Interactive aquarium builder
- 3D service presentation

3D MUST NOT:

- Block page interaction
- Cause excessive loading
- Reduce accessibility
- Prevent mobile usage
- Replace essential textual information

Provide graceful fallbacks where necessary.

---

## 17. Accessibility Principle

The platform MUST follow accessible web-development practices.

Requirements include:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Accessible forms
- Meaningful labels
- Appropriate contrast
- Alternative text for meaningful images
- Reduced-motion support where appropriate

Core functionality MUST remain usable without relying exclusively on animations or 3D.

---

## 18. Authentication and Authorization

The platform MUST distinguish between:

### Customer

Can:

- Manage profile
- Browse products
- Manage cart
- Manage wishlist
- Create orders
- View own orders
- Book appointments
- View own appointments
- Submit reviews

### Admin

Can:

- Manage products
- Manage categories
- Manage inventory
- Manage orders
- Manage appointments
- Manage services
- Manage promotions
- Manage customers where appropriate
- View dashboard statistics

Authorization MUST be enforced by the backend.

---

## 19. Security Principle

Security MUST be considered a first-class requirement.

The project MUST:

- Hash passwords securely
- Protect authenticated endpoints
- Enforce authorization
- Validate input
- Protect sensitive resources
- Prevent unauthorized resource access
- Use environment variables for secrets
- Never commit secrets
- Avoid exposing internal errors
- Configure CORS securely
- Validate ownership of customer resources

Sensitive operations MUST be validated server-side.

---

## 20. Error Handling Principle

Errors MUST be predictable and user-safe.

The backend SHOULD use a consistent error structure.

Errors MUST:

- Provide useful messages
- Use appropriate HTTP status codes
- Avoid exposing stack traces
- Avoid exposing secrets
- Use stable error codes where appropriate

The frontend SHOULD be able to display meaningful errors without interpreting backend internals.

---

## 21. Validation Principle

Validation MUST occur at the API boundary.

Validate:

- User input
- Email addresses
- Passwords
- Product IDs
- Quantities
- Currency codes
- Prices
- Dates
- Appointment times
- Coupon codes
- Query parameters

The backend MUST never assume that frontend validation is sufficient.

---

## 22. Testing Principle

Critical functionality MUST have automated tests.

Tests SHOULD cover:

- Authentication
- Authorization
- Product APIs
- Search/filtering
- Cart
- Inventory
- Orders
- Currency conversion
- Appointments
- Reviews
- Promotions
- Admin functionality
- Error handling

Business-critical operations MUST have stronger test coverage than cosmetic functionality.

---

## 23. Performance Principle

Performance MUST be considered from the beginning.

The system SHOULD:

- Use pagination
- Optimize database queries
- Avoid N+1 queries
- Use appropriate indexes
- Cache exchange rates where appropriate
- Lazy-load heavy 3D resources
- Optimize images
- Avoid unnecessary API requests
- Keep initial page loading reasonable

Visual quality MUST NOT come at the expense of basic usability.

---

## 24. External Services Principle

External APIs and services MUST be isolated behind service modules.

Examples:

- Currency exchange API
- Email provider
- Payment provider
- Maps provider
- Future AI services

External dependencies MUST NOT be tightly coupled to core business logic.

External API failures MUST be handled gracefully.

---

## 25. Environment Configuration

Environment-specific configuration MUST be separated from source code.

Use environment variables for:

- Database URL
- Secret keys
- API keys
- Authentication configuration
- Currency API configuration
- Email configuration
- Payment configuration
- CORS configuration

Provide:

`.env.example`

Never commit real credentials.

---

## 26. Development Workflow

Development MUST follow a specification-driven workflow.

The project should follow:

`Constitution → Specify → Plan → Tasks → Implementation → Testing`

Requirements MUST be defined before implementation whenever practical.

Large features MUST be divided into manageable phases.

Implementation MUST follow the approved specification.

---

## 27. Phase Discipline

Features SHOULD be implemented incrementally.

A phase MUST have:

- Clear scope
- Defined requirements
- Technical plan
- Implementation tasks
- Acceptance criteria

Do not implement future-phase features prematurely.

Avoid unnecessary scope expansion.

---

## 28. Code Quality

Code MUST prioritize:

- Readability
- Maintainability
- Modularity
- Reusability
- Type safety where applicable
- Clear naming
- Small focused functions
- Separation of concerns

Avoid:

- Duplicate logic
- Giant files
- Hardcoded business rules
- Hidden side effects
- Unnecessary abstractions
- Premature optimization

---

## 29. Documentation Principle

Important project functionality MUST be documented.

Documentation SHOULD include:

- Setup instructions
- Environment variables
- Database setup
- Migration instructions
- API documentation
- Development commands
- Testing commands
- Deployment requirements

FastAPI's generated API documentation MUST remain available during development.

---

## 30. Git and Version Control

Git MUST be used for source control.

Commits SHOULD be:

- Small
- Meaningful
- Feature-focused
- Easy to understand

Do not commit:

- `.env`
- API keys
- Passwords
- Database credentials
- Generated secrets
- Unnecessary build artifacts

---

## 31. No Fake Functionality

The application MUST NOT present simulated functionality as real functionality.

Examples:

- Fake payment success
- Fake inventory
- Fake exchange rates presented as live
- Fake appointment availability
- Fake order tracking
- Fake authentication

If a feature is not implemented, the UI MUST clearly indicate its state.

---

## 32. Data Integrity Principle

The backend is the authoritative source for business data.

Critical operations MUST be transaction-safe.

Particularly:

- Checkout
- Inventory updates
- Order creation
- Appointment booking
- Coupon usage
- Account changes

Partial operations MUST NOT leave inconsistent database state.

---

## 33. Privacy Principle

Only necessary customer information should be collected.

Customer information MUST be protected.

Users MUST only access their own private data unless they have appropriate administrative authorization.

Administrative access SHOULD follow least-privilege principles.

---

## 34. Scalability Principle

The initial implementation should remain simple enough for a small business while allowing future growth.

The architecture should support future additions such as:

- Payment gateways
- Delivery tracking
- Subscription plans
- Loyalty points
- Gift cards
- AI aquarium advisor
- Fish compatibility checker
- Aquarium builder
- Water parameter calculator
- Customer support chat
- Advanced analytics
- Multi-vendor support

Future features MUST NOT be implemented prematurely.

---

## 35. Definition of Done

A feature is considered complete only when:

- Requirements are implemented
- Backend logic works
- API contracts are defined
- Database changes are migrated
- Validation exists
- Authorization is enforced where required
- Error handling exists
- Critical paths are tested
- Documentation is updated where necessary
- No secrets are exposed
- The feature works with the existing architecture
- The implementation does not break existing functionality

---

## 36. Final Project Standard

Every implementation decision MUST prioritize, in order:

1. Correctness
2. Security
3. Data integrity
4. User experience
5. Maintainability
6. Performance
7. Visual quality
8. Extensibility

The project must remain a reliable pet fish and aquarium commerce platform rather than becoming overloaded with unnecessary features.

All future specifications, plans, tasks, and implementations MUST comply with this constitution.

---

## Governance

This constitution supersedes ad-hoc practices for this repository. It is
amended by editing this file directly, updating the Sync Impact Report at
its top, and bumping the version per semantic versioning:

- **MAJOR**: backward-incompatible removal or redefinition of a principle
  (e.g., reversing a MUST/MUST NOT rule).
- **MINOR**: a new principle or section, or materially expanded guidance.
- **PATCH**: clarifications, wording, or non-semantic refinements.

Every `/sp.plan` execution MUST pass a Constitution Check against the
applicable principles above before Phase 0 research and again after Phase
1 design. Any complexity or deviation that violates a principle MUST be
justified in that plan's Complexity Tracking table, or the simpler,
compliant approach MUST be used instead.

Every user prompt MUST be recorded as a PHR under `history/prompts/` per
the project's PHR routing rules. When a decision meets the significance
test (long-term impact, real alternatives considered, cross-cutting
scope), an ADR MUST be suggested — never auto-created — and created only
with explicit user consent via `/sp.adr`.

**Version**: 2.0.0 | **Ratified**: 2026-09-12 | **Last Amended**: 2026-09-12
