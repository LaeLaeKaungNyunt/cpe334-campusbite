# CampusBite — Requirements-to-Feature-to-Sprint Traceability

**Version:** v0.1 proposed baseline (7 November 2026); Lab 7 v0.2 revised (25 November 2026, Issue #48); Deliverable 2 v0.3 (26 November 2026)
**Status:** Sprint 1 baseline results, Lab 7 Part A contract revision, and reviewed Deliverable 2 Sprint 2 contracts (PR #52 and PR #53). All new cases are Designed / Not run.

Sprint 1 acceptance and test IDs below are planned in GitHub Issues #1–#4. Detailed expected outputs and input conditions belong in the pre-implementation feature contracts and STS. Lab 7 Part A requirements for Issue #48 revise F-04 to mandate operator preparation time estimation and atomic estimated ready timestamp persistence.

---

## 1. Functional Requirements Traceability

| Requirement | Feature | Planned Sprint | Planned Verification |
|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01–AC-05 / TEST-01–TEST-05 |
| FR-02 | F-02 | 1 | AC-06–AC-08 / TEST-06–TEST-08 |
| FR-03 | F-03 | 1 | AC-09–AC-12 / TEST-09–TEST-12 |
| FR-04 | F-03, F-04 | 1, Lab 7 | AC-13–AC-14 / TEST-13–TEST-14 (Sprint 1); `L7-F04-AC06` / `L7-F04-T06` (Lab 7 v0.2 customer estimate retrieval) |
| FR-05 | F-04 | 1, Lab 7 | AC-15–AC-19 / TEST-15–TEST-19 (Sprint 1 baseline); `L7-F04-AC01`–`AC07` / `L7-F04-T01`–`T07` (Lab 7 v0.2 prep estimate) |
| FR-06 | F-05 | 2 | See §6 for the contract AC, STS cases, and current status. |
| FR-07 | F-06 | 2 | See §6 for the contract AC, STS cases, and current status. |
| FR-08 | F-07 | 2 | See §6 for the contract AC, STS cases, and current status. |
| FR-09 | F-08 | 2 | See §6 for the contract AC, STS cases, and current status. |
| FR-10 | F-09 | 3 | Own-order/operator filtering tests |
| FR-11 | F-09 | 3 | Completed-sales aggregation and exclusion tests |

---

## 2. Business Rules Traceability

| Requirement | Feature | Planned Sprint | Planned Verification |
|---|---|---|---|
| BR-01 | F-03 | 1 | AC-09, AC-11 / TEST-09, TEST-11 (empty/duplicate lines) |
| BR-02 | F-03 | 1 | AC-11 / TEST-11 (positive integer boundary) |
| BR-03 | F-02, F-03 | 1 | AC-07, AC-11 / TEST-07, TEST-11 (inactive, sold-out, low stock) |
| BR-04 | F-03 | 1 | AC-10 / TEST-10 (tampered client prices and totals) |
| BR-05 | F-03 | 1 | AC-10 / TEST-10 (stored unit-price snapshot) |
| BR-06 | F-03 | 1 | AC-12 / TEST-12 (atomicity and competing stock orders) |
| BR-07 | F-01, F-03 | 1 | AC-03, AC-14 / TEST-03, TEST-14 (anonymous/other customer) |
| BR-08 | F-01, F-04 | 1, Lab 7 | AC-04, AC-16–AC-18 / TEST-04, TEST-16–TEST-18 (Sprint 1); `L7-F04-AC01`–`AC05` / `L7-F04-T01`–`T05` (Lab 7 v0.2 prep estimate validation, atomic state transition, repeat 409 `ORDER_NOT_PENDING`) |
| BR-09 | F-05 | 2 | See §6 for the contract AC, STS cases, and current status. |
| BR-10 | F-06 | 2 | See §6 for the contract AC, STS cases, and current status. |
| BR-11 | F-07 | 2 | See §6 for the contract AC, STS cases, and current status. |
| BR-12 | F-08 | 2 | See §6 for the contract AC, STS cases, and current status. |
| BR-13 | F-09 (depends on F-06–F-08) | 3 | See §6 for the reporting integration case. |

---

## 3. Important Non-Functional Requirements Traceability

| Requirement | Feature / Responsibility | Planned Verification Window | Evidence to Collect |
|---|---|---|---|
| NFR-01 | F-01, F-03, F-04, SYS-03 | Sprint 1, Lab 7, and regression | Auth/role/ownership integration tests; password hash inspection; `L7-F04-T05` (operator role guard) and `L7-F04-T06` (cross-customer privacy for estimate) |
| NFR-02 | F-03 | Sprint 1 | TEST-10–TEST-12, database state before/after failed transaction |
| NFR-03 | SYS-01 | Sprint 1 | Clean migration and seed command, build/test output, tested commit |
| NFR-04 | F-03, F-04, SYS-02 | Sprint 1, Lab 5/6, Lab 7 | Order persisted after local restart; deployed restart/redeployment retrieval; `L7-F04-T03`, `L7-F04-T06`, `L7-F04-T07` (atomic DB persistence and null compatibility) |
| NFR-05 | F-09, SYS-04 | Sprint 3 | 95th percentile timing on documented ≤1,000-order dataset |
| NFR-06 | SYS-02 | Sprint 1 design; Lab 5 execution | Environment-variable design, no-real-secret check, Docker/GCP deployment and data survival |

---

## 4. Lab 7 Part A Traceability & Impact Matrix (Issue #48)

The following compact impact table cross-references requirements, specification sections, acceptance criteria, test cases, and application code/schema modules for the Lab 7 v0.2 operator preparation estimate enhancement:

| Req ID | Requirement Statement | Spec Section | Acceptance Criteria | Executable Test ID | Affected Modules |
|---|---|---|---|---|---|
| **FR-05** | Operator accepts pending order with mandatory prep estimate (5–60 min, step 5) | `docs/srs.md` §4<br>`docs/sprints/sprint-1/f04-operator.md` §3 | `L7-F04-AC01`<br>`L7-F04-AC02` | `L7-F04-T01`<br>`L7-F04-T02` | `backend/src/routes/operatorRoutes.ts`<br>`frontend/src/features/operator/OperatorOrdersPage.tsx`<br>`frontend/src/features/operator/operatorApi.ts` |
| **BR-08** | Atomic `PENDING → ACCEPTED` transition, repeat 409 rejection (`ORDER_NOT_PENDING`), estimate validation | `docs/srs.md` §5<br>`docs/sprints/sprint-1/f04-operator.md` §3, §4 | `L7-F04-AC02`<br>`L7-F04-AC03`<br>`L7-F04-AC04` | `L7-F04-T02`<br>`L7-F04-T03`<br>`L7-F04-T04` | `backend/src/routes/operatorRoutes.ts`<br>`backend/prisma/schema.prisma` (`Order`) |
| **FR-04** | Customer owner retrieves persisted order details and ready estimate | `docs/srs.md` §4<br>`docs/sprints/sprint-1/f04-operator.md` §3, §4 | `L7-F04-AC06`<br>`L7-F04-AC07` | `L7-F04-T06`<br>`L7-F04-T07` | `backend/src/routes/orderRoutes.ts`<br>`frontend/src/features/orders/OrderPages.tsx`<br>`frontend/src/features/orders/ordersApi.ts` |
| **NFR-01** | Security: operator-only acceptance, owner-only retrieval, credential safety | `docs/srs.md` §6<br>`docs/system-sds.md` §5 | `L7-F04-AC05`<br>`L7-F04-AC06` | `L7-F04-T05`<br>`L7-F04-T06` | `backend/src/middleware/auth.ts`<br>`backend/src/routes/operatorRoutes.ts`<br>`backend/src/routes/orderRoutes.ts` |
| **NFR-04** | Persistence: atomic DB save of status/estimate across restarts and null compatibility | `docs/srs.md` §6<br>`docs/system-sds.md` §2 | `L7-F04-AC03`<br>`L7-F04-AC06`<br>`L7-F04-AC07` | `L7-F04-T03`<br>`L7-F04-T06`<br>`L7-F04-T07` | `backend/prisma/schema.prisma`<br>`backend/src/routes/operatorRoutes.ts`<br>`backend/src/tests/operatorOrders.test.ts` |
| **F-04** | Operator order management feature lifecycle | `docs/features.md`<br>`docs/sprints/sprint-1/f04-operator.md` | `L7-F04-AC01`–`AC07` | `L7-F04-T01`–`T07` | `frontend/src/features/operator/OperatorOrdersPage.tsx`<br>`frontend/src/features/orders/OrderPages.tsx`<br>`backend/src/routes/operatorRoutes.ts`<br>`backend/src/tests/operatorOrders.test.ts` |

---

## 5. Sprint 1 & Lab 7 AC-to-Test Planning Index

| Feature | AC IDs | Planned Test IDs | Current State |
|---|---|---|---|
| F-01 | AC-01–AC-05 | TEST-01–TEST-05 | Sprint 1 Baseline (Pass) |
| F-02 | AC-06–AC-08 | TEST-06–TEST-08 | Sprint 1 Baseline (Pass) |
| F-03 | AC-09–AC-14 | TEST-09–TEST-14 | Sprint 1 Baseline (Pass) |
| F-04 (Sprint 1 v0.1) | AC-15–AC-19 | TEST-15–TEST-19 | Sprint 1 Baseline (Pass) |
| **F-04 (Lab 7 v0.2)** | **L7-F04-AC01–L7-F04-AC07** | **L7-F04-T01–L7-F04-T07** | **Implemented and deployed (PR #61); integrated backend regression 161/161 PASS on 27 Nov 2026. Individual Lab 7 case results tracked in the Lab 7 report.** |

**Sprint 1 and Lab 7 coverage:** All baseline and Lab 7 revised requirements are assigned to features and test IDs. **The Lab 7 v0.2 design originally had Designed / Not run status.** The revised F-04 behavior was subsequently implemented and released through PR #61. The integrated backend regression passed 161/161 on 27 November 2026. Individual L7-F04 test executions, RED/GREEN evidence, and deployed verification are documented separately in the Lab 7 report. These results must not be inferred solely from planned test identifiers.


---

## 6. Deliverable 2 Sprint 2 Requirements and Test Coverage

The [F-05](sprints/sprint-2/f05-menu-stock-admin.md), [F-06](sprints/sprint-2/f06-cancellation.md), [F-07](sprints/sprint-2/f07-fulfillment.md), and [F-08](sprints/sprint-2/f08-simulated-payment.md) contracts define the acceptance criteria, cases, and expected outcomes. Responsibilities below refer to planned changes in the existing layers. Each row links the requirement to the relevant portion of the contract. The AC-to-case index retains the associations recorded by each contract.

| Requirement | Feature | Sprint | Acceptance criteria | STS cases | Planned implementation responsibility | Current implementation status | Actual test status |
|---|---|---|---|---|---|---|---|
| FR-06 | F-05 | 2 | `S2-F05-AC01`, `S2-F05-AC02`, `S2-F05-AC03`, `S2-F05-AC04`, `S2-F05-AC05`, `S2-F05-AC06` | `S2-F05-T01`, `S2-F05-T02`, `S2-F05-T03`, `S2-F05-T04`, `S2-F05-T05`, `S2-F05-T06`, `S2-F05-T07`, `S2-F05-T08`, `S2-F05-T09`, `S2-F05-T10` | React operator menu and public menu, Express catalog endpoints, PostgreSQL catalog and checkout integration | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS E2E execution unverified: S2-F05-T09 AC-level audit pending |
| BR-09 | F-05 | 2 | `S2-F05-AC03`, `S2-F05-AC04`, `S2-F05-AC06` | `S2-F05-T03`, `S2-F05-T04`, `S2-F05-T05`, `S2-F05-T06`, `S2-F05-T09`, `S2-F05-T10` | Operator role guard, atomic stock endpoint, and server-confirmed form feedback | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS E2E execution unverified: S2-F05-T09 AC-level audit pending |
| FR-07 | F-06 | 2 | `F06-AC01`, `F06-AC02`, `F06-AC03`, `F06-AC04`, `F06-AC05`, `F06-AC06`, `F06-AC07` | `F06-T01`, `F06-T02`, `F06-T03`, `F06-T04`, `F06-T05`, `F06-T06`, `F06-T07` | Customer order and Operator queue actions, customer/operator cancellation routes, PostgreSQL transaction | Implemented/deployed; PR #55 |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| BR-10 | F-06 | 2 | `F06-AC03`, `F06-AC04`, `F06-AC06`, `F06-AC07` | `F06-T01`, `F06-T02`, `F06-T04`, `F06-T05`, `F06-T06`, `F06-T07` | Pending-only conditional transition, atomic restoration and rollback, preservation of stored order data | Implemented/deployed; PR #55 |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| BR-10 | F-05 | 2 | `S2-F05-AC04` | `S2-F05-T05`, `S2-F05-T06` | Stock adjustment checks pending reservation headroom under lock and allows restoration for inactive items | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| FR-08 | F-07 | 2 | `F07-AC01`, `F07-AC02`, `F07-AC03`, `F07-AC04`, `F07-AC05`, `F07-AC06`, `F07-AC07` | `F07-T01`, `F07-T02`, `F07-T03`, `F07-T04`, `F07-T05`, `F07-T06`, `F07-T07`, `F07-T08` | Operator queue and mutation API, owner-scoped reads and estimate display, PostgreSQL status update | Implemented/deployed; PRs #55/#56 |Backend IDs present; full regression 161/161 PASS No matching test ID found: F07-T08 AC-level audit pending |
| BR-11 | F-07 | 2 | `F07-AC01`, `F07-AC02`, `F07-AC04`, `F07-AC06`, `F07-AC07` | `F07-T01`, `F07-T02`, `F07-T05`, `F07-T07`, `F07-T08` | Conditional adjacent transitions, estimate preservation, and completion while unpaid | Implemented/deployed; PRs #55/#56 |Backend IDs present; full regression 161/161 PASS No matching test ID found: F07-T08 AC-level audit pending |
| BR-11 | F-08 | 2 | `S2-F08-AC04` | `S2-F08-T01`, `S2-F08-T04`, `S2-F08-T06`, `S2-F08-T07` | Payment and fulfillment handlers use field-specific writes so both can succeed concurrently | Implemented/deployed; PR #59 |Backend IDs present; full regression 161/161 PASS E2E execution unverified: S2-F08-T07 AC-level audit pending |
| FR-09 | F-08 | 2 | `S2-F08-AC01`, `S2-F08-AC02`, `S2-F08-AC05` | `S2-F08-T01`, `S2-F08-T02`, `S2-F08-T03`, `S2-F08-T06`, `S2-F08-T07` | Operator queue badges and simulated action, Express payment mutation, PostgreSQL payment flag | Implemented/deployed; PR #59 |Backend IDs present; full regression 161/161 PASS E2E execution unverified: S2-F08-T07 AC-level audit pending |
| BR-12 | F-08 | 2 | `S2-F08-AC01`, `S2-F08-AC02`, `S2-F08-AC03`, `S2-F08-AC04`, `S2-F08-AC05` | `S2-F08-T01`, `S2-F08-T02`, `S2-F08-T03`, `S2-F08-T04`, `S2-F08-T05`, `S2-F08-T06`, `S2-F08-T07` | Operator-only, one-way payment write filtered by saved order and payment state, owner-scoped reads, local-only flag | Implemented/deployed; PR #59 |Backend IDs present; full regression 161/161 PASS E2E execution unverified: S2-F08-T07 AC-level audit pending |
| NFR-01 | F-05 | 2 | `S2-F05-AC03` | `S2-F05-T03`, `S2-F05-T04`, `S2-F05-T10` | Session and Operator guard on the admin catalog | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| NFR-01 | F-06 | 2 | `F06-AC02`, `F06-AC05` | `F06-T02`, `F06-T03` | Authenticated role boundaries, transactional customer ownership check, privacy-preserving errors | Implemented/deployed; PR #55 |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| NFR-01 | F-07 | 2 | `F07-AC03`, `F07-AC05` | `F07-T03`, `F07-T04`, `F07-T06` | Operator-only writes and owner-scoped customer reads | Implemented/deployed; PRs #55/#56 |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| NFR-01 | F-08 | 2 | `S2-F08-AC03`, `S2-F08-AC04` | `S2-F08-T01`, `S2-F08-T04`, `S2-F08-T05`, `S2-F08-T06`, `S2-F08-T07` | Operator payment guard, customer ownership, and safe validation errors | Implemented/deployed; PR #59 |Backend IDs present; full regression 161/161 PASS E2E execution unverified: S2-F08-T07 AC-level audit pending |
| NFR-02 | F-05 | 2 | `S2-F05-AC04`, `S2-F05-AC05` | `S2-F05-T05`, `S2-F05-T06`, `S2-F05-T07`, `S2-F05-T08` | PostgreSQL transaction and coordinated stock locks, server price snapshots, integer bounds and rollback | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| NFR-02 | F-06 | 2 | `F06-AC03`, `F06-AC04`, `F06-AC06`, `F06-AC07` | `F06-T01`, `F06-T02`, `F06-T04`, `F06-T05`, `F06-T06`, `F06-T07` | Atomic restoration from stored order lines, conflict handling, and rollback | Implemented/deployed; PR #55 |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| NFR-02 | F-07 | 2 | `F07-AC04`, `F07-AC06`, `F07-AC07` | `F07-T01`, `F07-T05`, `F07-T07`, `F07-T08` | Conditional updates preserve saved estimate, order data, inventory, and payment | Implemented/deployed; PRs #55/#56 |Backend IDs present; full regression 161/161 PASS No matching test ID found: F07-T08 AC-level audit pending |
| NFR-02 | F-08 | 2 | `S2-F08-AC02`, `S2-F08-AC04` | `S2-F08-T01`, `S2-F08-T02`, `S2-F08-T03`, `S2-F08-T04`, `S2-F08-T06`, `S2-F08-T07` | Conditional update preserves unrelated fields while fulfillment advances | Implemented/deployed; PR #59 |Backend IDs present; full regression 161/161 PASS E2E execution unverified: S2-F08-T07 AC-level audit pending |
| NFR-04 | F-05 | 2 | `S2-F05-AC01` | `S2-F05-T01`, `S2-F05-T04`, `S2-F05-T10` | Durable catalog fields and stock in PostgreSQL. T01 explicitly exercises application restart | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| NFR-04 | F-06 | 2 | `F06-AC01`, `F06-AC03`, `F06-AC07` | `F06-T01`, `F06-T02`, `F06-T07` | Persist cancellation, restored inventory, and retained details for subsequent owner reads | Implemented/deployed; PR #55 |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| NFR-04 | F-07 | 2 | `F07-AC01`, `F07-AC05`, `F07-AC06` | `F07-T01`, `F07-T06`, `F07-T07`, `F07-T08` | Persist changed status and retain the ready estimate for subsequent API reads and UI refresh | Implemented/deployed; PRs #55/#56 |Backend IDs present; full regression 161/161 PASS No matching test ID found: F07-T08 AC-level audit pending |
| NFR-04 | F-08 | 2 | `S2-F08-AC01` | `S2-F08-T01` | Persist the payment flag and retrieve it after application restart | Implemented/deployed; PR #59 |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| FR-02, BR-03 | F-05 | 2 | `S2-F05-AC02` | `S2-F05-T01`, `S2-F05-T02` | Public menu publication and sold-out display, checkout activation and availability checks | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| BR-04, BR-05 | F-05 | 2 | `S2-F05-AC05` | `S2-F05-T07`, `S2-F05-T08` | Authoritative prices from reservation row versions, stored snapshots, and bounded totals | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| BR-06 | F-05 | 2 | `S2-F05-AC04`, `S2-F05-AC05` | `S2-F05-T05`, `S2-F05-T06`, `S2-F05-T07`, `S2-F05-T08` | Atomic checkout, competing stock edits, and overflow rollback | Implemented/deployed; PR #57; focused backend 20/20 PASS |Backend IDs present; full regression 161/161 PASS AC-level audit pending |
| FR-04, BR-07 | F-08 | 2 | `S2-F08-AC04` | `S2-F08-T01`, `S2-F08-T04`, `S2-F08-T06`, `S2-F08-T07` | Owner-scoped payment read and retained order details | Implemented/deployed; PR #59 |Backend IDs present; full regression 161/161 PASS E2E execution unverified: S2-F08-T07 AC-level audit pending |
| BR-13 | F-08 → F-09 | 3 (dependency defined in Sprint 2) | `S2-F08-AC06` | `S2-F08-T08` | F-09 sales summary uses both saved states and stored prices. Cancelled orders are excluded | Planned with F-09 | Designed / Not run |

### Contract AC-to-case index

| Feature | Acceptance criterion | STS cases |
|---|---|---|
| F-05 | `S2-F05-AC01` | `S2-F05-T01`, `S2-F05-T04`, `S2-F05-T10` |
| F-05 | `S2-F05-AC02` | `S2-F05-T01`, `S2-F05-T02` |
| F-05 | `S2-F05-AC03` | `S2-F05-T03`, `S2-F05-T04`, `S2-F05-T10` |
| F-05 | `S2-F05-AC04` | `S2-F05-T05`, `S2-F05-T06` |
| F-05 | `S2-F05-AC05` | `S2-F05-T07`, `S2-F05-T08` |
| F-05 | `S2-F05-AC06` | `S2-F05-T09` |
| F-06 | `F06-AC01` | `F06-T01` |
| F-06 | `F06-AC02` | `F06-T02` |
| F-06 | `F06-AC03` | `F06-T01`, `F06-T02` |
| F-06 | `F06-AC04` | `F06-T04`, `F06-T05` |
| F-06 | `F06-AC05` | `F06-T03` |
| F-06 | `F06-AC06` | `F06-T06` |
| F-06 | `F06-AC07` | `F06-T07` |
| F-07 | `F07-AC01` | `F07-T01` |
| F-07 | `F07-AC02` | `F07-T02` |
| F-07 | `F07-AC03` | `F07-T03`, `F07-T04` |
| F-07 | `F07-AC04` | `F07-T05` |
| F-07 | `F07-AC05` | `F07-T06` |
| F-07 | `F07-AC06` | `F07-T07`, `F07-T08` |
| F-07 | `F07-AC07` | `F07-T01`, `F07-T07` |
| F-08 | `S2-F08-AC01` | `S2-F08-T01` |
| F-08 | `S2-F08-AC02` | `S2-F08-T02`, `S2-F08-T03`, `S2-F08-T06` |
| F-08 | `S2-F08-AC03` | `S2-F08-T04`, `S2-F08-T05` |
| F-08 | `S2-F08-AC04` | `S2-F08-T01`, `S2-F08-T04`, `S2-F08-T06`, `S2-F08-T07` |
| F-08 | `S2-F08-AC05` | `S2-F08-T07` |
| F-08 | `S2-F08-AC06` | `S2-F08-T08` |

The four contracts define 26 acceptance criteria and 33 STS cases. Of these, 32 cases are planned for Sprint 2 and `S2-F08-T08` is carried into Sprint 3 for F-09's BR-13 reporting check. Execution evidence was updated on 27 November 2026: the integrated backend regression passed 161/161 tests across nine files, and the focused F-05 suite previously passed 20/20 tests. Backend test-ID presence and passing suite results are not, by themselves, proof of complete acceptance-criterion coverage. Playwright execution and unlocated test cases remain explicitly unverified.

The F-06 and F-07 cases check persistence through database assertions and subsequent reads or refresh. Their designs have no explicit application restart step. F-07's estimate cases have no explicit elapsed-time step to check that passing the estimate never advances the order. `S2-F05-T06` checks stock adjustment followed by cancellation at the stock limit. The contract cases do not force an overlap between a stock adjustment and a cancellation.


## 7. Sprint 3 F-10 Requirements and Test Traceability

Source: [F-10 Product Hardening](sprints/sprint-3/f10-product-hardening.md).

F-10 is a proposed Sprint 3 hardening contract pending Duo L review. The following acceptance criteria and STS identifiers are defined in contract draft v0.1. All F-10 tests remain **Designed / Not run** until actual criterion-level execution evidence is recorded.

| Requirement | Feature | Sprint | Acceptance criterion | Planned STS cases | Verification area | Actual F-10 test status |
|---|---|---|---|---|---|---|
| NFR-01 | F-10 | 3 | `S3-F10-AC01` | `S3-F10-T01` | Authentication, role/ownership guards, privacy, password storage | Designed / Not run |
| NFR-02 | F-10 | 3 | `S3-F10-AC02` | `S3-F10-T02`, `S3-F10-T03` | Transaction integrity, stock, cancellation, order/payment consistency | Designed / Not run |
| NFR-03 | F-10 | 3 | `S3-F10-AC03` | `S3-F10-T04` | Clean setup, migrations, repeatable seed, tests and builds | Designed / Not run |
| NFR-04 | F-10 | 3 | `S3-F10-AC04` | `S3-F10-T05` | Controlled restart and saved-state retrieval | Designed / Not run |
| NFR-05 | F-10 | 3 | `S3-F10-AC05` | `S3-F10-T06` | Seeded API performance benchmark and measured threshold | Designed / Not run |
| NFR-06 | F-10 | 3 | `S3-F10-AC06` | `S3-F10-T07` | Environment configuration, secret review, Docker/GCP release and readiness | Designed / Not run |
| NFR-01, NFR-03 | F-10 | 3 | `S3-F10-AC07` | `S3-F10-T08`, `S3-F10-T09` | Controlled API errors, UI loading, empty and failure states | Designed / Not run |
| NFR-01–NFR-06 | F-10 | 3 | `S3-F10-AC08` | `S3-F10-T10` | Release evidence, defects, traceability and readiness decision | Designed / Not run |

**Existing evidence, not new F-10 execution:** The 27 November Deliverable 2 candidate at commit `68420a4` passed 161 backend tests across nine files and was successfully deployed. F-05 additionally has a focused 20/20 PASS result. These records may support future F-10 assessment only when mapped to the applicable criteria and verified versions.

**Remaining work:** Review this contract; reconcile executed Sprint 2 tests and the partial F-09 milestone; run or explicitly disposition planned F-10 verification; record benchmark results and the final READY/NOT READY decision before Final Delivery.

## 8. Sprint 3 F-09 Requirements and Test Traceability

Source: [F-09 Search and Reporting Contract](sprints/sprint-3/f09-search-reporting.md).

F-09 is partially implemented. The customer status and exact full-UUID search milestone was merged through PR #60 and included in release PR #61, commit `68420a4`.

On 27 November 2026, the integrated backend regression passed 161/161 tests across nine files. The `orderSearch.test.ts` file passed 26/26 tests. The implemented Customer search workflow was also checked through the deployed UI.

| Requirements | Feature | Acceptance criterion | Planned STS cases | Recorded status |
|---|---|---|---|---|
| FR-10, BR-07, NFR-01 | F-09 | `S3-F09-AC01` | `S3-F09-T01`, `S3-F09-T02`, `S3-F09-T04` | Customer status/full-UUID search implemented; backend IDs present and integrated regression PASS. Final criterion-level mapping to be reconciled. |
| FR-10, BR-08, NFR-01 | F-09 | `S3-F09-AC02` | `S3-F09-T02`, `S3-F09-T03`, `S3-F09-T04`, `S3-F09-T05` | Partial shared validation coverage; Operator-specific filtering remains planned. |
| FR-11, NFR-01 | F-09 | `S3-F09-AC03` | `S3-F09-T02`, `S3-F09-T04`, `S3-F09-T05` | Sales reporting and complete period validation remain planned. |
| FR-11, BR-13 | F-09 | `S3-F09-AC04` | `S3-F09-T05`, `S3-F09-T06` | Completed-and-simulated-paid sales aggregation remains planned. |
| FR-10, FR-11 | F-09 | `S3-F09-AC05` | `S3-F09-T07` | Customer filter UI manually verified; complete browser STS and Operator report UI remain unverified. |
| NFR-05 | F-09 | `S3-F09-AC06` | `S3-F09-T08` | Performance benchmark designed / not run. |

### F-09 Execution and Scope Notes

Backend test IDs `S3-F09-T01`, `S3-F09-T02`, and `S3-F09-T04` are present in `orderSearch.test.ts`.

No matching implementation/test identifiers were located for T03 or T05–T08 during the 27 November source audit. Missing IDs are treated as verification gaps rather than automatically assumed functional defects.

The 26/26 passing result belongs to the complete `orderSearch.test.ts` file; it is not a claim that all eight planned F-09 STS cases passed.

The completed Customer milestone satisfies the Deliverable 2 requirement to demonstrate meaningful Sprint 3 implementation progress. Remaining F-09 work is tracked toward Final Delivery on 13 December 2026.
