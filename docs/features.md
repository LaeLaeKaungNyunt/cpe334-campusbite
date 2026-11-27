# CampusBite — Feature Inventory

**Version:** v0.1 proposed baseline (7 November 2026); Lab 7 v0.2 revision (25 November 2026); Deliverable 2 v0.3 (26 November 2026)
**Source of truth:** [`srs.md`](srs.md)  
**Status:** Sprint 1 implementation baseline, Lab 7 Part A maintenance record (Issue #48), and Deliverable 2 reviewed Sprint 2 contracts (PR #52 and PR #53)

The inventory tracks ten features across three sprints. Sprint 1 intentionally contains the smallest real order journey, including login, server authorization, UI/API/database persistence, and a tested order rule. IDs remain stable when features are revised.

| Feature | Name and key behavior | Related requirements | Sprint | Dependencies | Lead / reviewer | Status |
|---|---|---|---|---|---|---|
| F-01 | Authentication: login, logout, current-user identity, sessions, role guards | FR-01, BR-07, BR-08, NFR-01 | 1 | User/session schema and seed | 3481 / 3484 | Implemented (Sprint 1 baseline) |
| F-02 | Menu browsing: active products, price and stock status, UI states | FR-02, BR-03, NFR-03 | 1 | MenuItem schema and seed | 3484 / 3481 | Implemented (Sprint 1 baseline) |
| F-03 | Customer ordering: multi-item order, server totals, atomic stock reservation, own-order retrieval | FR-03, FR-04, BR-01–BR-07, NFR-01, NFR-02, NFR-04 | 1 | F-01, F-02, Order/OrderItem schema | 3484 / 3481 | Implemented (Sprint 1 baseline) |
| F-04 | Operator order management: incoming orders and pending-to-accepted transition with mandatory preparation estimate (5–60 min, step 5) and atomic estimatedReadyAt calculation | FR-05, BR-08, FR-04, NFR-01, NFR-04 | 1 (Revised Lab 7 v0.2) | F-01, F-03 | 3481 / 3484 | Implemented, tested, and deployed with Lab 7 v0.2 preparation estimate; release PR #61. |
| F-05 | [Menu and stock administration](sprints/sprint-2/f05-menu-stock-admin.md) for catalog visibility, pricing, and guarded available-stock edits | FR-06, BR-09, NFR-01, NFR-02, NFR-04 | 2 | F-01, F-02, F-03; coordinate stock writes with F-06 | 3481 / 3484 | Implemented and deployed (PR #57); focused backend tests 20/20 PASS; release PR #61. |
| F-06 | [Cancellation](sprints/sprint-2/f06-cancellation.md) of pending orders by the owner or an Operator, with exactly-once stock restoration | FR-07, BR-10, NFR-01, NFR-02, NFR-04 | 2 | F-01, F-03, F-04; coordinate stock writes with F-05 | 3484 / 3481 | Implemented and deployed (PR #55); final AC-level evidence reconciliation pending. |
| F-07 | [Fulfillment](sprints/sprint-2/f07-fulfillment.md) through preparation, readiness, and completion, with preserved ready estimate and owner-visible status | FR-08, BR-11, NFR-01, NFR-04 | 2 | F-01, F-03, F-04, F-06 | 3484 / 3481 | Implemented and deployed (PRs #55 and #56); final AC-level evidence reconciliation pending. |
| F-08 | [Simulated payment](sprints/sprint-2/f08-simulated-payment.md) for eligible orders, with Operator writes and owner-scoped reads | FR-09, BR-12, BR-13 (F-09 dependency), NFR-01, NFR-04 | 2 | F-01, F-03, F-04, F-06, F-07 | 3481 / 3484 | Implemented and deployed (PR #59); final focused GREEN evidence reconciliation pending. |
| F-09 | [Order filtering and reporting](sprints/sprint-3/f09-search-reporting.md): own-order search, operator filters, completed-sales summary | FR-10, FR-11, BR-13, NFR-05 | 3 | F-05–F-08 | 3484 / 3481 | Customer status/full-UUID search implemented and tested (PR #60); customer date filters, operator filters, sales report, and NFR-05 benchmark pending. |
| F-10 | [Product hardening](sprints/sprint-3/f10-product-hardening.md): full regression, API failure handling, usability, final release readiness | NFR-01–NFR-06 | 3 | F-01–F-09, Lab 5/6/7 findings | Both / cross-review | Contract draft v0.1 added; AC/STS designed, not run; teammate review pending. |

## Cross-cutting system responsibilities

| ID | Responsibility | Requirements | Established / verified |
|---|---|---|---|
| SYS-01 | Database migrations, reproducible synthetic seed accounts/menu, README setup and build/test commands | NFR-03 | Sprint 1; fresh setup and test evidence |
| SYS-02 | Persistent configuration and Docker/GCP delivery design | NFR-04, NFR-06 | Architecture planned Sprint 1; deployment and persistence verified in Lab 5 |
| SYS-03 | Security and authorization regression across customer/operator APIs | NFR-01 | Sprint 1 foundation; rerun every release |
| SYS-04 | Benchmark selected API operations on seeded dataset | NFR-05 | Sprint 3 |

## Scope decisions

- There are no real payment, delivery, multi-café, customer-registration, notification, or pickup-slot features.
- A feature that changes the agreed baseline must have an updated SRS/feature contract, traceability row, and reviewed Git history.
- Lab 7 v0.2 scope change: F-04 order acceptance requires an operator preparation estimate (5–60 min in 5-minute increments), calculating and persisting nullable `Order.estimatedReadyAt` in UTC. Existing orders remain null-compatible with no backfill. The estimate does not automatically change order status. At the time of the Lab 7 revision, the scope of F-05 through F-08 remained unchanged.
- F-09 uses the F-07 and F-08 persisted states and F-03 price snapshots for BR-13. F-06 cancelled orders are excluded. The reporting case is scheduled with F-09 in Sprint 3.
- Sprint 2 features must be completed by 29 November; Sprint 3 must show contract and implementation progress then and be finished by 13 December.

