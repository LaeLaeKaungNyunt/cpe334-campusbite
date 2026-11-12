# CampusBite — Software Requirements Specification (SRS)

| Field | Value |
|---|---|
| Course | CPE334 — Introduction to Software Engineering in the Age of AI Agents |
| Project theme | Theme 4 — E-Commerce or Ordering System |
| Product | CampusBite: Campus Food Pre-Ordering and Pickup Management System |
| Team | 67070503481 (GitHub: `LaeLaeKaungNyunt`); Naing Zay Linn, 67070503484 (GitHub: `naingzaylinn`) |
| Baseline version | SRS v0.1 — scope accepted by both students; formal repository PR review pending |
| Prepared | 7 November 2026 |
| Primary assessment | Project Deliverable 1, Part A (10 points) |

## 1. Stakeholder problem and context

A small, fictional campus café currently takes orders at the counter. During busy periods, customers must wait to place orders, and staff may find it difficult to track incoming requests and preparation progress. CampusBite is a single-café, pickup-only web application in which customers can submit food and drink orders before collecting them at the counter. An operator can inspect and accept incoming orders and, in later sprints, complete preparation and pickup workflows.

The product uses synthetic menu data and demonstration accounts. It is **not** an official university service and does not process real payments. It must be a real full-stack application: browser UI → backend/API and business logic → persistent relational database.

## 2. Stakeholders and actors

| Actor | Goal and authorized responsibility |
|---|---|
| Customer | Sign in, inspect the menu, place a valid order, see only their own order details and statuses, and later cancel an eligible order. |
| Operator | Sign in, inspect all orders for the single café, accept pending orders, and later manage menu/stock, preparation, pickup, and simulated payment status. |
| Café owner/manager (stakeholder, not a third login role) | Understand sales and product availability through operator reporting in the completed product. |
| Course assessors / UAT partner team | Reproduce a released version with safe seeded accounts, verify specified workflows, and record test findings. |

There are exactly two application roles in the baseline: `CUSTOMER` and `OPERATOR`. Each seeded user has one role. All authority and ownership checks occur on the backend.

## 3. Product boundary and scope

### In scope across the three sprints

- Authentication, logout, current-user identity, and backend role enforcement.
- Menu browsing with prices, active/available flags, and finite stock quantities.
- Multi-item order submission, authoritative server-side total calculation, stock reservation, and persisted order history.
- Operator order review and controlled status changes.
- Menu and stock maintenance, pending-order cancellation, preparation and pickup completion.
- Simulated payment status, search/filter functions, and basic sales summaries.
- Tests, versioned documentation, traceability, a reproducible local setup, and (through Lab 5) Docker/GCP deployment.

### Explicitly out of scope

- Real credit-card/bank payments or payment-gateway integration.
- Delivery, courier tracking, table reservations, or multiple cafés/branches.
- Customer-selected pickup time slots, automated kitchen scheduling, email/SMS, and external APIs.
- Public self-registration, password reset, email verification, coupons, loyalty schemes, and tax calculations.
- Real customer or financial data; demonstrations use synthetic records only.

## 4. Functional requirements (FR)

Each statement describes observable behavior. The feature inventory and traceability document maps each ID to a planned sprint and verification.

| ID | Requirement | Sprint |
|---|---|---|
| FR-01 | The system shall let seeded Customers and Operators log in with credentials, log out, and retrieve their current authenticated identity and role. | 1 |
| FR-02 | The system shall display active menu items from the database with names, prices in THB, and availability/stock status. | 1 |
| FR-03 | An authenticated Customer shall submit an order containing one or more menu items with selected quantities. | 1 |
| FR-04 | An authenticated Customer shall retrieve a list of their orders and open persisted order details, totals, and statuses. | 1 |
| FR-05 | An authenticated Operator shall inspect incoming café orders and accept a pending order. | 1 |
| FR-06 | An Operator shall create, update, activate/deactivate, and manage the stock and price of menu items. | 2 |
| FR-07 | A Customer or authorized Operator shall cancel an eligible pending order and receive a recorded result. | 2 |
| FR-08 | An Operator shall progress accepted orders through preparation, ready-for-pickup, and completed states; Customers shall see their statuses. | 2 |
| FR-09 | An Operator shall record and inspect simulated payment status without contacting a payment provider. | 2 |
| FR-10 | Customers shall filter/search their own orders, and Operators shall filter café orders by appropriate fields. | 3 |
| FR-11 | An Operator shall view a basic summary of completed sales and product quantities for a selected period. | 3 |

## 5. Business rules (BR)

| ID | Rule and required rejection/behavior | Sprint |
|---|---|---|
| BR-01 | An order must have at least one item; duplicate menu-item IDs in the same request are rejected rather than silently double-counted. | 1 |
| BR-02 | Each requested quantity must be a positive integer; zero, negative, fractional, or nonnumeric quantities are rejected. | 1 |
| BR-03 | Every ordered item must exist, be active/available, and have sufficient unreserved stock; otherwise the entire order is rejected. | 1 |
| BR-04 | The backend calculates each line and total using database prices in integer satang; client-submitted totals or prices cannot override authoritative values. | 1 |
| BR-05 | Each order item stores a snapshot of the unit price at submission; later menu-price changes must not modify historical totals. | 1 |
| BR-06 | Validation, order creation, order-item creation, and stock decrement occur atomically; competing requests must not oversell or produce partial orders. | 1 |
| BR-07 | A Customer can access only their own protected order records; neither another customer nor an anonymous requester may read them. | 1 |
| BR-08 | Only an Operator may inspect the operator order list or accept an order; only `PENDING → ACCEPTED` is valid in Sprint 1, and repeat acceptance is rejected. | 1 |
| BR-09 | Only Operators may change menu/stock records. A hidden button alone is not authorization. | 2 |
| BR-10 | Cancellation is allowed only while an order is `PENDING`; a successful cancellation restores its reserved stock exactly once. | 2 |
| BR-11 | Fulfillment follows `ACCEPTED → PREPARING → READY → COMPLETED`; backward, skipped, or repeated transitions are rejected. | 2 |
| BR-12 | Payment status is `UNPAID` or `PAID_SIMULATED`; only Operators change it, and no real transaction is initiated. | 2 |
| BR-13 | Sales totals count only `COMPLETED` orders with `PAID_SIMULATED` status, using stored order-item prices. Cancelled orders do not count. | 3 |

## 6. Important non-functional requirements (NFR)

| ID | Measurable target | Verification and allocation |
|---|---|---|
| NFR-01 Security | 100% of protected API operations require a valid authenticated session; role-restricted and record-ownership operations reject unauthorized callers without private response data. Managed passwords are stored as salted hashes, never plaintext. | Sprint 1 API integration tests for anonymous, wrong-role, and cross-customer access; review password-storage code and seeded database. |
| NFR-02 Data integrity | 100% of tested accepted order transactions preserve correct totals and stock; failed orders leave no partial order or stock update. | Sprint 1 API/database tests, including boundary and competing stock requests. |
| NFR-03 Reproducibility | A clean local database can be created from documented migrations and a seed command; the documented build and automated-test commands complete on the submitted commit. | Sprint 1 fresh-setup verification, recorded commands, outputs, and commit hash. |
| NFR-04 Persistence | Submitted orders and their statuses remain available after stopping and restarting the application/database services. | Sprint 1 restart/retrieval check; Lab 5 redeployment persistence check on GCP. |
| NFR-05 Performance | In a seeded demonstration environment with up to 1,000 orders, at least 95% of successful key API requests complete within 2 seconds, excluding initial cold start. | Sprint 3 repeatable local benchmark with environment and sample count documented. |
| NFR-06 Deployment | The released application shall be configurable through environment variables, contain no committed real secrets, and run with persistent storage after Docker/GCP deployment. | System design in Sprint 1; Lab 5 deployment and persistence verification. |

## 7. Key assumptions, decisions, and open clarifications

| ID | Decision / assumption | Rationale or action |
|---|---|---|
| DEC-01 | One fictional café, one pickup counter, pickup-only orders; no customer-selected pickup slot. | Keeps the required ordering workflow bounded. |
| DEC-02 | Seed at least two Customers and one Operator with safe test data. | Demonstrates role and cross-customer access without self-registration. |
| DEC-03 | Store prices and totals as integer satang; display THB. | Avoids floating-point money errors. |
| DEC-04 | Reserve available stock on successful order submission, not on operator acceptance. | Gives consistent availability for pending orders. |
| DEC-05 | Newly submitted orders begin as `PENDING`; Sprint 1 implements only operator acceptance to `ACCEPTED`. | Matches the theme's required small vertical slice. |
| DEC-06 | Menu items with stock zero remain visible as **Sold Out**, but inactive items are hidden. | Customers can see availability while inactive catalog entries stay unpublished. |
| DEC-07 | An order is not considered a sale until completed and marked paid (simulated). | Defines a non-misleading summary rule for later reporting. |
| DEC-08 | Use an opaque server-side session with an HttpOnly cookie, database-backed revocation, and a 24-hour expiry as specified in the System-Level SDS and F-01 contract. | Both students accepted the proposed baseline on 7 November; implementation and security checks remain to be verified. |

### Resolved domain questions

- **Who manages the menu?** Operators only.
- **Who sees orders?** Customers see their own; Operators see all orders belonging to the single café.
- **When is stock reserved?** Atomically when the order is placed.
- **What happens with insufficient stock?** Reject the entire order without partial database changes.
- **Can customers cancel accepted orders?** Not in the baseline; only `PENDING` orders can be cancelled in Sprint 2.
- **How are payments handled?** Synthetic status only; no external payment provider.

### Team decision record

On 7 November, both students stated that they would proceed with the proposed baseline, including the authentication lifecycle, cancellation rules, sales counting rule, and measurable NFR targets. The draft remains subject to a **recorded GitHub PR review** before it is treated as the authoritative implemented baseline. Any infeasible NFR target must be revised explicitly, not silently omitted.

## 8. Acceptance of this baseline and change control

Both students must record approval or specific change requests in a reviewed GitHub PR **before implementing feature code**. If a requirement changes, revise its ID-linked feature contract, acceptance criteria, tests, and traceability; preserve the prior Git history. The feature inventory and three-sprint plan must collectively cover all FR, BR, and NFR IDs listed above.

## 9. Terminology

| Term | Meaning |
|---|---|
| SRS | Software Requirements Specification: externally observable product behavior and constraints. |
| SDS | Software Design Specification: architecture and detailed design choices. |
| AC | Acceptance Criterion: observable pass/fail condition for a feature. |
| STS | Software Test Specification: planned test inputs, actions, expected outputs, and AC coverage. |
| DoD | Definition of Done: evidence required before declaring a feature complete. |
| Atomic order | All required database changes succeed together, or none are committed. |
