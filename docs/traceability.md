# CampusBite — Requirements-to-Feature-to-Sprint Traceability

**Version:** v0.1 proposed baseline (7 November 2026); Lab 7 v0.2 revised (25 November 2026, Issue #48)
**Status:** Planned coverage and Lab 7 Part A contract revision (Designed / Not run). Update as tests are executed and releases are accepted.

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
| FR-06 | F-05 | 2 | Menu edit, authorization and stock integration tests (IDs assigned before implementation) |
| FR-07 | F-06 | 2 | Eligible/ineligible cancellation and exactly-once stock restoration tests |
| FR-08 | F-07 | 2 | Allowed/forbidden fulfillment status transitions and customer retrieval tests |
| FR-09 | F-08 | 2 | Simulated payment transition and operator-permission tests |
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
| BR-09 | F-05 | 2 | Operator-only menu mutation tests |
| BR-10 | F-06 | 2 | Pending cancellation and no duplicate stock restoration |
| BR-11 | F-07 | 2 | Valid, skipped, repeated, backward transitions |
| BR-12 | F-08 | 2 | Simulated payment and wrong-role rejection |
| BR-13 | F-09 | 3 | Sales summary counts only paid-and-completed orders |

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
| **F-04 (Lab 7 v0.2)** | **L7-F04-AC01–L7-F04-AC07** | **L7-F04-T01–L7-F04-T07** | **Issue #48 revised contract (Designed / Not run)** |

**Coverage status:** All baseline and Lab 7 revised requirements are assigned to features and test IDs. **New Lab 7 tests are Designed / Not run.** Actual test execution records will be updated upon implementation in later lab parts.
