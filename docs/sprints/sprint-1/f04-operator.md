# F-04 — Operator Order Management Contract

**Contract version:** v0.1 proposed (7 November 2026); Lab 7 v0.2 revised, 25 November 2026
**GitHub Issue:** #4, #48
**Lead / reviewer:** 67070503481 / 67070503484
**Requirements:** FR-05, BR-08, FR-04, NFR-01, NFR-04
**Dependencies:** F-01 authenticated role, F-03 persisted orders
**Status:** Designed / Not run (Lab 7 Part A contract revision for Issue #48)

---

## 1. Feature-Level SDS and Requirement History

### 1.1 Requirement Evolution

- **Sprint 1 v0.1 Baseline Behavior (7 November 2026):**
  An authenticated `OPERATOR` inspected incoming orders for the single café and accepted a `PENDING` order via `PATCH /api/v1/operator/orders/:id/accept` without sending a request body. The server updated order status conditionally to `ACCEPTED`. No time estimate was collected, and no ready timestamp was stored.
- **Lab 7 v0.2 Revised Behavior (25 November 2026, Issue #48):**
  Order acceptance now mandates an operator preparation duration estimate (`estimatedPrepMinutes`) provided in the request body.
  1. The value must be an integer multiple of 5 between 5 and 60 inclusive.
  2. The server validates the payload and returns HTTP 400 with error code `INVALID_PREP_ESTIMATE` on malformed, missing, non-multiple, or out-of-range values.
  3. The server calculates the target ready timestamp:
     $$\text{estimatedReadyAt} = \text{acceptanceTime} + (\text{estimatedPrepMinutes} \times 60 \times 1000)$$
  4. The server atomically persists `status = ACCEPTED` and `estimatedReadyAt` in UTC in the PostgreSQL database within a single conditional update.
  5. Repeated acceptance or acceptance of non-pending orders remains rejected with HTTP 409 Conflict and error code `ORDER_NOT_PENDING`.
  6. The owning Customer can retrieve the calculated estimate via `GET /api/v1/orders/:id` (FR-04). Unauthorized callers (anonymous or other customers) cannot view protected order or estimate details (NFR-01).

---

## 2. Compact Impact Table

The following matrix connects the affected requirements, specification sections, acceptance criteria, test cases, and application modules for Lab 7 v0.2:

| Req ID | Requirement Summary | Spec Section | Acceptance Criteria | Executable Test ID | Affected Code & Schema Modules |
|---|---|---|---|---|---|
| **FR-05** | Operator order review and acceptance with mandatory prep estimate | §3 API, §4 UI | `L7-F04-AC01`, `L7-F04-AC02` | `L7-F04-T01`, `L7-F04-T02` | `backend/src/routes/operatorRoutes.ts`<br>`frontend/src/features/operator/OperatorOrdersPage.tsx`<br>`frontend/src/features/operator/operatorApi.ts` |
| **BR-08** | Atomic `PENDING → ACCEPTED` transition, repeat 409 rejection (`ORDER_NOT_PENDING`), estimate validation | §3 API, §4 Data | `L7-F04-AC02`, `L7-F04-AC03`, `L7-F04-AC04` | `L7-F04-T02`, `L7-F04-T03`, `L7-F04-T04` | `backend/src/routes/operatorRoutes.ts`<br>`backend/prisma/schema.prisma` (`Order`) |
| **FR-04** | Customer owner retrieves persisted order details and ready estimate | §3 API, §4 UI | `L7-F04-AC06`, `L7-F04-AC07` | `L7-F04-T06`, `L7-F04-T07` | `backend/src/routes/orderRoutes.ts`<br>`frontend/src/features/orders/OrderPages.tsx`<br>`frontend/src/features/orders/ordersApi.ts` |
| **NFR-01** | Security: operator-only acceptance, owner-only retrieval, credential safety | §3 API, §5 Roles | `L7-F04-AC05`, `L7-F04-AC06` | `L7-F04-T05`, `L7-F04-T06` | `backend/src/middleware/auth.ts`<br>`backend/src/routes/operatorRoutes.ts`<br>`backend/src/routes/orderRoutes.ts` |
| **NFR-04** | Persistence: atomic DB save of status/estimate across restarts and null compatibility | §4 Data, §6 Compat | `L7-F04-AC03`, `L7-F04-AC06`, `L7-F04-AC07` | `L7-F04-T03`, `L7-F04-T06`, `L7-F04-T07` | `backend/prisma/schema.prisma`<br>`backend/src/routes/operatorRoutes.ts`<br>`backend/src/tests/operatorOrders.test.ts` |
| **F-04** | Full feature lifecycle: operator incoming review, acceptance, customer visibility | All sections | `L7-F04-AC01`–`AC07` | `L7-F04-T01`–`T07` | `frontend/src/features/operator/OperatorOrdersPage.tsx`<br>`frontend/src/features/orders/OrderPages.tsx`<br>`backend/src/routes/operatorRoutes.ts`<br>`backend/src/tests/operatorOrders.test.ts` |

---

## 3. API Specification

### 3.1 Endpoints Overview

| Method/path | Role | Request | Success | Failure |
|---|---|---|---|---|
| `GET /api/v1/operator/orders` | `OPERATOR` | None (session cookie) | `200`, list of café orders with customer details, items, totals, status, and `estimatedReadyAt: string \| null` | `401` anonymous, `403` wrong role |
| `PATCH /api/v1/operator/orders/:id/accept` | `OPERATOR` | `{"estimatedPrepMinutes": 20}` | `200`, saved order ID, `ACCEPTED` status, and calculated `estimatedReadyAt` timestamp | `400` invalid estimate, `401` anonymous, `403` wrong role, `404` nonexistent, `409` not pending |

### 3.2 Acceptance Request & Validation Contract (`PATCH /api/v1/operator/orders/:id/accept`)

- **URL Parameter:** `:id` must be a valid UUID. If malformed or absent, return HTTP 400 or 404.
- **Headers:** `Content-Type: application/json`
- **Request Body Schema:**
  ```json
  {
    "estimatedPrepMinutes": 20
  }
  ```
- **Validation Rules:**
  - `estimatedPrepMinutes` is a **mandatory required field**.
  - Must be a finite JavaScript safe integer (`typeof val === 'number' && Number.isSafeInteger(val)`).
  - Must satisfy range bounds: $5 \le \text{estimatedPrepMinutes} \le 60$. Boundaries `5` and `60` are strictly valid.
  - Must be a multiple of 5: `estimatedPrepMinutes % 5 === 0`.
  - **Invalid Inputs (Reject with HTTP 400):**
    - Below lower bound: `0`, `-5`
    - Above upper bound: `61`, `65`
    - Not divisible by 5: `7`, `1`, `13`
    - Fractional / floating-point: `2.5`, `15.5`
    - Non-number types: `"20"` (string), `true`, `[]`, `{}`
    - Missing / null: `null`, `undefined`, omitted field `{}`
- **Error Response for Invalid Estimate (HTTP 400 Bad Request):**
  ```json
  {
    "error": {
      "code": "INVALID_PREP_ESTIMATE",
      "message": "Preparation estimate must be an integer multiple of 5 between 5 and 60 minutes."
    }
  }
  ```
- **Order State Precondition (HTTP 409 Conflict):**
  - If the order exists but its status is **not** `PENDING` (e.g. already `ACCEPTED` or future state), preserve the existing error code `ORDER_NOT_PENDING`:
    ```json
    {
      "error": {
        "code": "ORDER_NOT_PENDING",
        "message": "Only pending orders can be accepted."
      }
    }
    ```
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "data": {
      "id": "c3555555-5555-4555-8555-555555555555",
      "status": "ACCEPTED",
      "estimatedReadyAt": "2026-11-25T15:25:00.000Z",
      "updatedAt": "2026-11-25T15:05:00.000Z"
    }
  }
  ```

---

## 4. UI and Data Specification

### 4.1 UI Design & Workflow
- **/operator/orders Screen (`frontend/src/features/operator/OperatorOrdersPage.tsx`):**
  - Displays incoming café order cards/rows with items, quantities, customer email/ID, total, and status.
  - For `PENDING` orders, renders an **Estimated Preparation Time** selector (stepper, radio group, or dropdown offering options: `5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60 min`, defaulting to unselected or 15 min).
  - The `Accept` button is disabled until a valid estimate is selected.
  - Submitting via `frontend/src/features/operator/operatorApi.ts` disables controls, displays loading state, and upon HTTP 200 updates the card to show `ACCEPTED` with the formatted estimated ready time.
  - Displays safe error messages on failure (e.g., if another operator accepted the order concurrently).
- **/orders/:id Screen (`frontend/src/features/orders/OrderPages.tsx`):**
  - Displays order status, item breakdown, and total via `frontend/src/features/orders/ordersApi.ts`.
  - When `status === 'ACCEPTED'` and `estimatedReadyAt` is present, renders estimated collection time formatted in local time (Bangkok UTC+07:00, e.g. "Estimated Ready: 10:25 PM").
  - If `estimatedReadyAt` is `null` (historical Sprint 1 orders), gracefully displays order status without errors, omitting the estimate line.

### 4.2 Data Model & Persistence
- **Entity Update in `Order` (`backend/prisma/schema.prisma`):**
  ```prisma
  model Order {
    id               String        @id @default(uuid())
    customerId       String
    status           OrderStatus   @default(PENDING)
    paymentStatus    PaymentStatus @default(UNPAID)
    totalSatang      Int
    estimatedReadyAt DateTime?
    createdAt        DateTime      @default(now())
    updatedAt        DateTime      @updatedAt
    // ... relations
  }
  ```
- **Prisma Migration Notice:** A versioned non-destructive Prisma migration (`add_order_estimated_ready_at`) will be authored during implementation, **NOT** during this documentation phase.
- **Atomic State Transition:**
  The server in `backend/src/routes/operatorRoutes.ts` performs acceptance and timestamp recording in a single atomic database query:
  ```typescript
  const acceptanceTime = new Date();
  const estimatedReadyAt = new Date(acceptanceTime.getTime() + estimatedPrepMinutes * 60 * 1000);

  const result = await prisma.order.updateMany({
    where: {
      id,
      status: OrderStatus.PENDING,
    },
    data: {
      status: OrderStatus.ACCEPTED,
      estimatedReadyAt,
    },
  });
  if (result.count === 0) {
    // Determine 404 vs 409 ORDER_NOT_PENDING
  }
  ```
  This conditional update guarantees that concurrent requests cannot double-accept or create inconsistent status/estimate states.

---

## 5. Backward Compatibility and Invariants

1. **Historical Orders Null-Compatibility:**
   Pre-existing Sprint 1 orders retain `estimatedReadyAt: null`. `GET /api/v1/orders` and `GET /api/v1/orders/:id` return `estimatedReadyAt: null` without schema errors, and the frontend renders them cleanly.
2. **No Historical Backfill:**
   No migration script or seed update will fabricate historical ready timestamps for older orders.
3. **Decoupled Fulfillment:**
   The calculated `estimatedReadyAt` timestamp is purely informational for customers and staff. Reaching the timestamp does **not** automatically transition order status (status advancement to `PREPARING`, `READY`, or `COMPLETED` remains operator-driven in Sprint 2 F-07).
4. **Order Invariants Preserved:**
   - Pricing rules: Total satang and unit-price snapshots are unchanged.
   - Stock rules: Stock was decremented at checkout; acceptance does not alter inventory.
   - Payment rules: Payment remains simulated (`PaymentStatus.UNPAID` preserved).
   - Ownership rules: Only the authenticated owner may inspect order details.

---

## 6. Not-Applicable (N/A) Considerations

The following system capabilities are explicitly evaluated and determined **Not Applicable** to this change:

1. **Price Calculations (N/A):**
   *Reason:* Preparation time has zero impact on menu item pricing, subtotal, or order total calculations.
2. **Stock Modifications (N/A):**
   *Reason:* Stock decrement occurs atomically during customer order creation (F-03). Operator acceptance confirms order intake and does not adjust inventory.
3. **Payment Gateway Integration (N/A):**
   *Reason:* CampusBite operates on simulated payment states (F-08); acceptance does not charge or contact external financial services.
4. **Historical Timestamp Backfill (N/A):**
   *Reason:* Altering historical orders would falsify test and audit baselines established in Sprint 1 and Lab 5/6. Nullable timestamps accurately reflect that Sprint 1 did not record preparation estimates.

---

## 7. Acceptance Criteria (Lab 7 v0.2)

| AC ID | Statement | Verification Focus |
|---|---|---|
| **L7-F04-AC01** | Operator provides valid `estimatedPrepMinutes` (5–60 inclusive, multiple of 5); order transitions to `ACCEPTED` and `estimatedReadyAt` is calculated correctly. | Valid acceptance at boundaries (5, 60) and interior values (e.g. 20). |
| **L7-F04-AC02** | Request with missing, null, non-integer, non-multiple of 5, or out-of-range estimate is rejected with HTTP 400 `INVALID_PREP_ESTIMATE`; order remains `PENDING`. | Boundary rejections: 0, -5, 61, 7, 2.5, "20", null, omitted. |
| **L7-F04-AC03** | Transition `PENDING → ACCEPTED` and `estimatedReadyAt` timestamp are saved atomically; database state never records one without the other. | Database persistence and atomic compare-and-set check. |
| **L7-F04-AC04** | Attempting to accept an order that is not in `PENDING` status returns HTTP 409 Conflict with error code `ORDER_NOT_PENDING`; existing status and estimate are untouched. | Idempotency and invalid state transition guard. |
| **L7-F04-AC05** | Anonymous requests return HTTP 401; Customer requests return HTTP 403; neither can trigger acceptance or modify order state. | Role-based authorization enforcement. |
| **L7-F04-AC06** | Owning Customer retrieves persisted `estimatedReadyAt` on order detail endpoint/UI; other customers receive HTTP 404. | Customer visibility, persistence across page reload/restart, privacy. |
| **L7-F04-AC07** | Existing accepted orders with `estimatedReadyAt: null` remain readable via operator and customer endpoints without errors; Sprint 1 regression suite passes. | Backward compatibility and regression safety. |

---

## 8. Executable Software Test Specification (L7-F04-T01 to T07)

### Test Summary Matrix

| Test ID | Level | Linked AC | Target Behavior | Execution Status |
|---|---|---|---|---|
| **L7-F04-T01** | API+DB | `L7-F04-AC01` | Valid acceptance and boundaries (5 and 60 minutes) | Designed / Not run |
| **L7-F04-T02** | Unit / API | `L7-F04-AC02` | Rejection of invalid estimate inputs (400 `INVALID_PREP_ESTIMATE`) | Designed / Not run |
| **L7-F04-T03** | API+DB | `L7-F04-AC03` | Atomic persisted status and calculated ready timestamp | Designed / Not run |
| **L7-F04-T04** | API+DB | `L7-F04-AC04` | Repeated acceptance or non-pending state returns 409 (`ORDER_NOT_PENDING`) | Designed / Not run |
| **L7-F04-T05** | API+DB | `L7-F04-AC05` | Authentication (401) and role restriction (403) enforcement | Designed / Not run |
| **L7-F04-T06** | API+DB+UI | `L7-F04-AC06` | Customer owner retrieval, persistence, and cross-customer denial | Designed / Not run |
| **L7-F04-T07** | Regression | `L7-F04-AC07` | Historical null compatibility and baseline test regression | Designed / Not run |

---

### Detailed Test Case Specifications

#### L7-F04-T01: Valid Acceptance and Boundary Values
- **Level:** API + DB
- **Linked AC:** `L7-F04-AC01`
- **Prerequisites:** Seeded Customer A order in `PENDING` status; Operator session active.
- **Input:**
  - Case 1a: `{"estimatedPrepMinutes": 5}` (minimum boundary)
  - Case 1b: `{"estimatedPrepMinutes": 60}` (maximum boundary)
  - Case 1c: `{"estimatedPrepMinutes": 20}` (interior multiple of 5)
- **Steps:**
  1. Record current timestamp $T_0$.
  2. Send `PATCH /api/v1/operator/orders/:id/accept` with body.
  3. Inspect HTTP status and response payload.
  4. Query PostgreSQL database via Prisma for the updated order record.
- **Expected Outcome:**
  - HTTP 200 OK.
  - Response body contains `status: "ACCEPTED"` and ISO string `estimatedReadyAt`.
  - Stored `estimatedReadyAt` timestamp falls within $[T_0 + M \text{ min}, T_1 + M \text{ min}]$ where $M \in \{5, 20, 60\}$.
- **Status:** Designed / Not run

#### L7-F04-T02: Rejection of Invalid Estimate Inputs
- **Level:** Unit + API
- **Linked AC:** `L7-F04-AC02`
- **Prerequisites:** Seeded Customer A order in `PENDING` status; Operator session active.
- **Input Matrix:**
  - Below min: `{"estimatedPrepMinutes": 0}`, `{"estimatedPrepMinutes": -5}`
  - Above max: `{"estimatedPrepMinutes": 61}`, `{"estimatedPrepMinutes": 75}`
  - Non-multiple of 5: `{"estimatedPrepMinutes": 7}`, `{"estimatedPrepMinutes": 1}`
  - Fractional: `{"estimatedPrepMinutes": 2.5}`, `{"estimatedPrepMinutes": 15.01}`
  - Type error: `{"estimatedPrepMinutes": "20"}`, `{"estimatedPrepMinutes": true}`
  - Missing/Null: `{"estimatedPrepMinutes": null}`, `{}`
- **Steps:**
  1. For each input in matrix, send `PATCH /api/v1/operator/orders/:id/accept`.
  2. Inspect HTTP status and error payload.
  3. Verify order status in database.
- **Expected Outcome:**
  - HTTP 400 Bad Request across all invalid inputs.
  - Response payload matches `{ "error": { "code": "INVALID_PREP_ESTIMATE", ... } }`.
  - Database verifies order remains strictly `PENDING` with `estimatedReadyAt = null`.
- **Status:** Designed / Not run

#### L7-F04-T03: Atomic Persistence of Status and Estimate
- **Level:** API + DB
- **Linked AC:** `L7-F04-AC03`
- **Prerequisites:** Seeded `PENDING` order; Operator session active.
- **Input:** `{"estimatedPrepMinutes": 25}`
- **Steps:**
  1. Execute acceptance request via `PATCH`.
  2. Directly query PostgreSQL `Order` table for the target ID.
- **Expected Outcome:**
  - HTTP 200 OK.
  - Database row contains `status = 'ACCEPTED'` and non-null `estimatedReadyAt`.
  - Transactionality check: Never observe `status = 'ACCEPTED'` with `estimatedReadyAt = null`, nor `status = 'PENDING'` with non-null `estimatedReadyAt`.
- **Status:** Designed / Not run

#### L7-F04-T04: Repeated and Invalid State Transitions
- **Level:** API + DB
- **Linked AC:** `L7-F04-AC04`
- **Prerequisites:** Order already in `ACCEPTED` status (from previous valid step); Operator session active.
- **Input:** `{"estimatedPrepMinutes": 15}`
- **Steps:**
  1. Send `PATCH /api/v1/operator/orders/:id/accept` against the already accepted order.
  2. Inspect response and verify database row.
- **Expected Outcome:**
  - HTTP 409 Conflict with error code `ORDER_NOT_PENDING`.
  - Response body contains `{ "error": { "code": "ORDER_NOT_PENDING", "message": "Only pending orders can be accepted." } }`.
  - Original `ACCEPTED` status, original `estimatedReadyAt`, and total satang remain unmodified.
- **Status:** Designed / Not run

#### L7-F04-T05: Authentication and Role Restrictions
- **Level:** API + DB
- **Linked AC:** `L7-F04-AC05`
- **Prerequisites:** Seeded `PENDING` order.
- **Input:** `{"estimatedPrepMinutes": 30}`
- **Steps:**
  1. Send `PATCH /api/v1/operator/orders/:id/accept` with no session cookie (Anonymous).
  2. Send `PATCH /api/v1/operator/orders/:id/accept` with Customer A session cookie.
- **Expected Outcome:**
  - Anonymous call returns HTTP 401 Unauthorized (`UNAUTHORIZED`).
  - Customer call returns HTTP 403 Forbidden (`FORBIDDEN`).
  - Target order remains `PENDING` in database with `estimatedReadyAt = null`.
- **Status:** Designed / Not run

#### L7-F04-T06: Owning Customer Retrieval, Refresh and Cross-Customer Privacy
- **Level:** API + DB + UI
- **Linked AC:** `L7-F04-AC06`
- **Prerequisites:** Customer A places order; Operator accepts with `estimatedPrepMinutes: 20`.
- **Input:** Customer A session cookie; Customer B session cookie.
- **Steps:**
  1. Customer A requests `GET /api/v1/orders/:id`.
  2. Customer A refreshes browser or starts a new session and requests `GET /api/v1/orders/:id`.
  3. Customer B requests `GET /api/v1/orders/:id` for Customer A's order.
- **Expected Outcome:**
  - Step 1 & 2: HTTP 200 OK; body returns `status: "ACCEPTED"` and saved `estimatedReadyAt` timestamp; UI displays formatted ready time.
  - Step 3: HTTP 404 Not Found (`ORDER_NOT_FOUND`); no protected status or ready estimate disclosed.
- **Status:** Designed / Not run

#### L7-F04-T07: Historical Null Compatibility and Regression
- **Level:** API + DB Regression
- **Linked AC:** `L7-F04-AC07`
- **Prerequisites:** Historical accepted order in database with `estimatedReadyAt = null` (e.g. baseline order `7d08127f-...`).
- **Input:** Customer A session; Operator session.
- **Steps:**
  1. Customer A retrieves order via `GET /api/v1/orders/:id`.
  2. Operator retrieves orders via `GET /api/v1/operator/orders`.
  3. Execute automated test suite (`npm test`).
- **Expected Outcome:**
  - Step 1 & 2: HTTP 200 OK; payloads return `estimatedReadyAt: null`; UI renders without runtime errors.
  - Step 3: All 51 baseline tests pass with zero regressions.
- **Status:** Designed / Not run

---

## 9. Definition of Done (Lab 7 v0.2)

- [x] Contract, impact table, acceptance criteria, and STS cases saved in repository documentation before implementation.
- [ ] Non-destructive Prisma migration (`add_order_estimated_ready_at`) created and tested locally in `backend/prisma/schema.prisma`.
- [ ] API validation and conditional atomic update implemented in `backend/src/routes/operatorRoutes.ts`.
- [ ] Customer order retrieval endpoint in `backend/src/routes/orderRoutes.ts` includes `estimatedReadyAt`.
- [ ] Operator UI in `frontend/src/features/operator/OperatorOrdersPage.tsx` and `frontend/src/features/operator/operatorApi.ts` includes preparation estimate selector.
- [ ] Customer UI in `frontend/src/features/orders/OrderPages.tsx` and `frontend/src/features/orders/ordersApi.ts` displays formatted estimate.
- [ ] Automated tests `L7-F04-T01` through `L7-F04-T07` implemented in `backend/src/tests/operatorOrders.test.ts` and passing.
- [ ] Full regression suite (51 baseline tests + new Lab 7 tests) passing in CI.
- [ ] Peer review completed and merged via GitHub Pull Request convention.
