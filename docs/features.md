# CampusBite — Feature Inventory

**Version:** v0.1 proposed baseline, 7 November 2026  
**Source of truth:** [`srs.md`](srs.md)  
**Status:** For joint student review before implementation

The product has ten planned features. Sprint 1 intentionally contains the smallest real order journey, including login, server authorization, UI/API/database persistence, and a tested order rule. IDs remain stable when features are revised.

| Feature | Name and key behavior | Related requirements | Sprint | Dependencies | Lead / reviewer |
|---|---|---|---|---|---|
| F-01 | Authentication: login, logout, current-user identity, sessions, role guards | FR-01, BR-07, BR-08, NFR-01 | 1 | User/session schema and seed | 3481 / 3484 |
| F-02 | Menu browsing: active products, price and stock status, UI states | FR-02, BR-03, NFR-03 | 1 | MenuItem schema and seed | 3484 / 3481 |
| F-03 | Customer ordering: multi-item order, server totals, atomic stock reservation, own-order retrieval | FR-03, FR-04, BR-01–BR-07, NFR-01, NFR-02, NFR-04 | 1 | F-01, F-02, Order/OrderItem schema | 3484 / 3481 |
| F-04 | Operator order management: incoming orders and pending-to-accepted transition | FR-05, BR-08, NFR-01, NFR-04 | 1 | F-01, F-03 | 3481 / 3484 |
| F-05 | Menu/stock administration: create/edit/activate items, adjust stock | FR-06, BR-09 | 2 | F-01, F-02, F-03 | To agree in Sprint 2 |
| F-06 | Cancellation: pending-order cancellation, stock restoration exactly once | FR-07, BR-10 | 2 | F-03, F-04 | To agree in Sprint 2 |
| F-07 | Fulfillment: accepted, preparing, ready, completed transitions and customer status | FR-08, BR-11 | 2 | F-04 | To agree in Sprint 2 |
| F-08 | Simulated payment: operator records and views synthetic payment state | FR-09, BR-12 | 2 | F-04, F-07 | To agree in Sprint 2 |
| F-09 | Order filtering and reporting: own-order search, operator filters, completed-sales summary | FR-10, FR-11, BR-13, NFR-05 | 3 | F-05–F-08 | To agree in Sprint 3 |
| F-10 | Product hardening: full regression, API failure handling, usability, final release readiness | NFR-01–NFR-06 | 3 | F-01–F-09, Lab 5/6/7 findings | Both / cross-review |

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
- Sprint 2 features must be completed by 29 November; Sprint 3 must show contract and implementation progress then and be finished by 13 December.

