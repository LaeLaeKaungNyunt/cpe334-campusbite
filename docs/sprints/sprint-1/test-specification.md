# CampusBite — Software Test Specification (STS)

**Version:** STS v0.1 proposed before implementation (7 November 2026); Lab 7 v0.2 revised (25 November 2026, Issue #48)
**Scope:** F-01–F-04 / AC-01–AC-19 / TEST-01–TEST-19 (Sprint 1 Baseline) + L7-F04-AC01–AC07 / L7-F04-T01–T07 (Lab 7 Part A)
**Current status:** Test design only. **All Lab 7 tests are Designed / Not run.**

The feature contracts contain the input, precondition, operation, expected response and level for each test. This index provides stable AC coverage and evidence locations to fill in after actual execution.

---

## 1. Sprint 1 Baseline Test Index (F-01 to F-04)

| Test ID | AC | Feature | Level | Target behavior | Actual test file/name | Result/commit |
|---|---|---|---|---|---|---|
| TEST-01 | AC-01 | F-01 | API+DB | Valid role-specific login and `/me` | `backend/src/tests/auth.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-02 | AC-02 | F-01 | API | Invalid credentials | `backend/src/tests/auth.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-03 | AC-03 | F-01 | API | Anonymous protected access | `backend/src/tests/auth.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-04 | AC-04 | F-01 | API+DB | Customer forbidden Operator operation | `backend/src/tests/auth.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-05 | AC-05 | F-01 | API+DB/UI | Logout and revoked session | `backend/src/tests/auth.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-06 | AC-06 | F-02 | API+DB | Persisted active menu/prices | `backend/src/tests/menu.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-07 | AC-07 | F-02 | API+DB | Sold-out and inactive items | `backend/src/tests/menu.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-08 | AC-08 | F-02 | UI | Loading/empty/error, sold out, disabled control, THB price | `docs/sprints/sprint-1/f02-menu-test-procedure.md` | Sprint 1 Baseline (Pass) |
| TEST-09 | AC-09 | F-03 | API+DB/E2E | Valid order persistence | `backend/src/tests/orders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-10 | AC-10 | F-03 | Unit/API+DB | Rejection of tampered pricing fields and correct server calculation for a valid request | `backend/src/tests/orders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-11 | AC-11 | F-03 | API+DB | Invalid order no partial save | `backend/src/tests/orders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-12 | AC-12 | F-03 | API+DB | Competing stock reservations | `backend/src/tests/orders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-13 | AC-13 | F-03 | API+DB | Own order retrieval/persistence | `backend/src/tests/orders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-14 | AC-14 | F-03 | API+DB | Cross-customer privacy | `backend/src/tests/orders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-15 | AC-15 | F-04 | API+DB/UI | Operator incoming orders | `backend/src/tests/operatorOrders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-16 | AC-16 | F-04 | API+DB | Pending order acceptance (v0.1 empty body) | `backend/src/tests/operatorOrders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-17 | AC-17 | F-04 | Unit/API+DB | Repeated/invalid transition | `backend/src/tests/operatorOrders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-18 | AC-18 | F-04 | API+DB | Anonymous/customer Operator denial | `backend/src/tests/operatorOrders.test.ts` | Sprint 1 Baseline (Pass) |
| TEST-19 | AC-19 | F-04 | API+DB | Accepted state persisted/retrieved | `backend/src/tests/operatorOrders.test.ts` | Sprint 1 Baseline (Pass) |

---

## 2. Lab 7 Part A Test Specification: F-04 Preparation Time Estimation (L7-F04-T01 to T07)

### 2.1 Planning and Execution Summary Matrix

| Test ID | AC | Feature | Level | Target Behavior | Target Test Module | Execution Status |
|---|---|---|---|---|---|---|
| **L7-F04-T01** | `L7-F04-AC01` | F-04 | API+DB | Valid operator acceptance and boundaries (5, 60, and interior multiples of 5) | `backend/src/tests/operatorOrders.test.ts` | Designed / Not run |
| **L7-F04-T02** | `L7-F04-AC02` | F-04 | Unit/API | Rejection of invalid estimate inputs (400 `INVALID_PREP_ESTIMATE`) | `backend/src/tests/operatorOrders.test.ts` | Designed / Not run |
| **L7-F04-T03** | `L7-F04-AC03` | F-04 | API+DB | Atomic persistence of `ACCEPTED` status and calculated `estimatedReadyAt` | `backend/src/tests/operatorOrders.test.ts` | Designed / Not run |
| **L7-F04-T04** | `L7-F04-AC04` | F-04 | API+DB | Repeated acceptance or invalid state transition rejected (409 `ORDER_NOT_PENDING`) | `backend/src/tests/operatorOrders.test.ts` | Designed / Not run |
| **L7-F04-T05** | `L7-F04-AC05` | F-04 | API+DB | Anonymous (401) and Customer (403) role rejection | `backend/src/tests/operatorOrders.test.ts` | Designed / Not run |
| **L7-F04-T06** | `L7-F04-AC06` | F-04 | API+DB+UI | Customer owner retrieval, persistence, and cross-customer privacy | `backend/src/tests/operatorOrders.test.ts` | Designed / Not run |
| **L7-F04-T07** | `L7-F04-AC07` | F-04 | Regression | Historical null compatibility and baseline test regression | `backend/src/tests/operatorOrders.test.ts` | Designed / Not run |

---

### 2.2 Detailed Executable Test Cases

#### L7-F04-T01 — Valid Acceptance and Boundary Verification
- **Test ID:** `L7-F04-T01`
- **Linked AC:** `L7-F04-AC01` (FR-05, BR-08)
- **Test Level:** API + Database Integration
- **Prerequisites:**
  - Isolated test database reachable.
  - Three distinct seeded customer orders in `PENDING` status (`order1`, `order2`, `order3`).
  - Active `OPERATOR` session cookie.
- **Inputs:**
  - Case 1: `order1` with `{"estimatedPrepMinutes": 5}` (minimum valid boundary).
  - Case 2: `order2` with `{"estimatedPrepMinutes": 60}` (maximum valid boundary).
  - Case 3: `order3` with `{"estimatedPrepMinutes": 20}` (standard interior multiple of 5).
- **Execution Steps:**
  1. Record starting timestamp $T_{\text{start}} = \text{Date.now()}$.
  2. Send `PATCH /api/v1/operator/orders/:id/accept` with JSON payload for Case 1.
  3. Send `PATCH /api/v1/operator/orders/:id/accept` with JSON payload for Case 2.
  4. Send `PATCH /api/v1/operator/orders/:id/accept` with JSON payload for Case 3.
  5. Directly query PostgreSQL `Order` table for each order.
- **Expected Outcome:**
  - HTTP 200 OK for all three requests.
  - Response body contains `data.status = 'ACCEPTED'` and `data.estimatedReadyAt` as valid ISO-8601 UTC string.
  - In the database, each order's `status` is `ACCEPTED`, and `estimatedReadyAt` equals acceptance timestamp $+ M \times 60 \text{ sec}$ ($\pm 2 \text{ seconds}$ execution window) where $M \in \{5, 60, 20\}$.
- **Result:** Designed / Not run

#### L7-F04-T02 — Rejection of Invalid Estimate Inputs
- **Test ID:** `L7-F04-T02`
- **Linked AC:** `L7-F04-AC02` (BR-08)
- **Test Level:** Unit + API Integration
- **Prerequisites:** Seeded Customer order in `PENDING` status; active `OPERATOR` session cookie.
- **Input Matrix:**
  - Below lower boundary: `{"estimatedPrepMinutes": 0}`, `{"estimatedPrepMinutes": -5}`
  - Above upper boundary: `{"estimatedPrepMinutes": 61}`, `{"estimatedPrepMinutes": 75}`
  - Non-multiple of 5: `{"estimatedPrepMinutes": 7}`, `{"estimatedPrepMinutes": 1}`
  - Fractional number: `{"estimatedPrepMinutes": 2.5}`, `{"estimatedPrepMinutes": 15.01}`
  - Wrong type: `{"estimatedPrepMinutes": "20"}`, `{"estimatedPrepMinutes": true}`, `{"estimatedPrepMinutes": []}`
  - Missing/Null: `{"estimatedPrepMinutes": null}`, `{}`
- **Execution Steps:**
  1. Submit `PATCH /api/v1/operator/orders/:id/accept` for each invalid input in the matrix.
  2. Capture HTTP response status and JSON body.
  3. Query database to verify target order state.
- **Expected Outcome:**
  - HTTP 400 Bad Request returned for every input in the matrix.
  - JSON body contains `{ "error": { "code": "INVALID_PREP_ESTIMATE", "message": "Preparation estimate must be an integer multiple of 5 between 5 and 60 minutes." } }`.
  - Database verification: Order remains strictly `PENDING`, and `estimatedReadyAt` remains `null`.
- **Result:** Designed / Not run

#### L7-F04-T03 — Atomic Status and Estimate Persistence
- **Test ID:** `L7-F04-T03`
- **Linked AC:** `L7-F04-AC03` (BR-08, NFR-04)
- **Test Level:** API + Database Integration
- **Prerequisites:** Seeded Customer order in `PENDING` status; active `OPERATOR` session cookie.
- **Inputs:** `{"estimatedPrepMinutes": 25}`
- **Execution Steps:**
  1. Dispatch `PATCH /api/v1/operator/orders/:id/accept`.
  2. Directly query the PostgreSQL `Order` table using Prisma.
  3. Verify consistency between status and `estimatedReadyAt`.
- **Expected Outcome:**
  - HTTP 200 OK.
  - Database row reflects `status = 'ACCEPTED'` and non-null `estimatedReadyAt`.
  - Invariance assertion: An order is never stored in `ACCEPTED` status with a `null` timestamp under this workflow, nor does `estimatedReadyAt` populate while status remains `PENDING`.
- **Result:** Designed / Not run

#### L7-F04-T04 — Repeated Acceptance and State Conflict Guard
- **Test ID:** `L7-F04-T04`
- **Linked AC:** `L7-F04-AC04` (BR-08)
- **Test Level:** API + Database Integration
- **Prerequisites:** An order that has already transitioned to `ACCEPTED` status; active `OPERATOR` session cookie.
- **Inputs:** `{"estimatedPrepMinutes": 15}`
- **Execution Steps:**
  1. Record existing `status`, `estimatedReadyAt`, and `updatedAt` for the accepted order.
  2. Send second `PATCH /api/v1/operator/orders/:id/accept` with valid payload.
  3. Re-read database record.
- **Expected Outcome:**
  - HTTP 409 Conflict returned with error code `ORDER_NOT_PENDING`.
  - Response body contains `{ "error": { "code": "ORDER_NOT_PENDING", "message": "Only pending orders can be accepted." } }`.
  - Database verification: Stored `status` remains `ACCEPTED`, and `estimatedReadyAt` retains its original value unchanged.
- **Result:** Designed / Not run

#### L7-F04-T05 — Authentication and Role Access Restrictions
- **Test ID:** `L7-F04-T05`
- **Linked AC:** `L7-F04-AC05` (NFR-01)
- **Test Level:** API Integration
- **Prerequisites:** Seeded Customer order in `PENDING` status; seeded Customer A session cookie; unauthenticated caller.
- **Inputs:** `{"estimatedPrepMinutes": 30}`
- **Execution Steps:**
  1. Send `PATCH /api/v1/operator/orders/:id/accept` with no session cookie (Anonymous).
  2. Send `PATCH /api/v1/operator/orders/:id/accept` with Customer A session cookie (`CUSTOMER` role).
- **Expected Outcome:**
  - Step 1 returns HTTP 401 Unauthorized (`error.code = 'UNAUTHORIZED'`).
  - Step 2 returns HTTP 403 Forbidden (`error.code = 'FORBIDDEN'`).
  - Database verification: Target order remains in `PENDING` status with `estimatedReadyAt = null`.
- **Result:** Designed / Not run

#### L7-F04-T06 — Customer Owner Retrieval, Persistence and Privacy
- **Test ID:** `L7-F04-T06`
- **Linked AC:** `L7-F04-AC06` (FR-04, NFR-01, NFR-04)
- **Test Level:** API + Database + UI Integration
- **Prerequisites:** Customer A has placed an order; Operator has accepted it with `estimatedPrepMinutes = 20`.
- **Inputs:** Customer A session cookie; Customer B session cookie.
- **Execution Steps:**
  1. Customer A requests `GET /api/v1/orders/:id`.
  2. Customer A starts a fresh session / page reload and requests `GET /api/v1/orders/:id`.
  3. Customer B requests `GET /api/v1/orders/:id` for Customer A's order ID.
- **Expected Outcome:**
  - Steps 1 & 2 return HTTP 200 OK. Response body contains `data.status = 'ACCEPTED'` and matching `data.estimatedReadyAt`. Customer UI renders formatted estimate.
  - Step 3 returns HTTP 404 Not Found (`error.code = 'ORDER_NOT_FOUND'`). No protected order items, totals, or ready estimates are leaked to Customer B.
- **Result:** Designed / Not run

#### L7-F04-T07 — Historical Null Compatibility and Regression
- **Test ID:** `L7-F04-T07`
- **Linked AC:** `L7-F04-AC07` (NFR-04)
- **Test Level:** API + Database Regression
- **Prerequisites:** Pre-existing accepted order in database with `estimatedReadyAt = null` (Sprint 1 baseline state).
- **Inputs:** Customer A session cookie; Operator session cookie.
- **Execution Steps:**
  1. Customer A requests `GET /api/v1/orders/:id` for the historical accepted order.
  2. Operator requests `GET /api/v1/operator/orders`.
  3. Execute full automated backend test suite (`npm test`).
- **Expected Outcome:**
  - Steps 1 & 2 return HTTP 200 OK with `estimatedReadyAt: null`. Frontend renders gracefully without displaying an invalid date string.
  - Step 3: All 51 Sprint 1 baseline tests pass without regression.
- **Result:** Designed / Not run

---

## 3. Test Data and Execution Rules

- Use an isolated test database, reproducible migrations, and synthetic seeded Customer A, Customer B, Operator accounts.
- Seed Iced Latte (`6500` satang, stock `10`), Chicken Sandwich (`8500`, stock `5`), Croissant (`4500`, stock `0`), plus an inactive item. A valid two-latte/one-sandwich order totals `21500` satang (฿215.00).
- Reset test fixtures for isolation. Record the actual build/test commands, date, commit SHA, runner, environment and pass/fail/skip totals.
- Important rule/defect work must show red (failing intended test) before implementation and green after, without weakening assertions.
- Do not substitute mock-only persistence, static screenshots or AI claims for real API/database results. UI state simulation may supplement, not replace, genuine integration tests.
- Record justified manual checks separately from automated tests.

---

## 4. Product Definition of Done (Lab 7 v0.2)

1. SRS, feature inventory, traceability, System SDS, and F-04 contract recorded before implementation with review history.
2. Every planned criterion (`L7-F04-AC01` through `AC07`) has a mapped executable test (`L7-F04-T01` through `T07`).
3. UI → API → persistent database domain journey demonstrated for preparation time estimation.
4. Unit/API/database tests pass in `backend/src/tests/operatorOrders.test.ts`; all historical baseline tests remain green.
5. Issues and bounded branches linked to teammate-reviewed PRs into sprint staging.
6. README and deployment documentation updated as necessary upon release.

**This is a design specification, not execution evidence.** Fill the actual result columns only from commands and tests you ran.
