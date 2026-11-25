# F-06 — Order Cancellation Contract

**Contract version:** v0.2 revised (26 November 2026)<br>
**Feature:** F-06 Order Cancellation<br>
**Requirements:** FR-07, BR-10; NFR-01, NFR-02, NFR-04<br>
**Dependencies:** F-01 authentication and roles; F-03 persisted orders and stock reservation; F-05 stock administration coordination<br>
**Status:** Designed / Not run<br>
**Review:** Proposed for agreement with 67070503481 before implementation

## 1. Requirement links and workflow

- **FR-07:** A Customer or authorized Operator can cancel an eligible pending order and receive a recorded result.
- **BR-10:** Cancellation is allowed only while an order is `PENDING`; a successful cancellation restores its reserved stock exactly once.
- **NFR-01:** Authentication, role enforcement, and customer ownership are enforced by the backend.
- **NFR-02 / NFR-04:** Order status and every stock restoration commit together and persist.

An order reserves stock when it is placed (F-03). Cancellation returns the quantities recorded in its `OrderItem` rows to the corresponding `MenuItem.stockQuantity`; it does not reprice or delete the order. Proposed workflow:

1. Authenticate the Customer or Operator. A Customer may address only an order whose `customerId` is their authenticated user ID. An Operator may address any café order.
2. Start a database transaction and conditionally change the order from `PENDING` to `CANCELLED`.
3. Only if that conditional transition affects exactly one row, increment each referenced menu item's stock by the order item's stored quantity.
4. Commit the status and all stock increments together. Any failure rolls back all of them.
5. A competing or repeated request cannot restore stock again because the order no longer satisfies the `PENDING` condition.

## 2. Feature SDS and API contract

### 2.1 Endpoints

The following paths apply the shared Duo L decisions:

| Method and path | Caller | Success |
|---|---|---|
| `PATCH /api/v1/orders/:id/cancel` | Authenticated `CUSTOMER`, owner only | `200` with `{ "data": { "id": "…", "status": "CANCELLED", "updatedAt": "…" } }` |
| `PATCH /api/v1/operator/orders/:id/cancel` | Authenticated `OPERATOR` | Same response; any order at the single café may be targeted |

No request body is required or accepted as authority. The caller cannot supply a customer ID, status, stock quantity, item list, or cancellation result. `:id` follows the existing UUID validation conventions. Customer cancellation is limited to the authenticated owner; an Operator may cancel any single-café order.

### 2.2 Validation and errors

| Condition | Expected response |
|---|---|
| Missing, invalid, or expired session | `401 UNAUTHORIZED` |
| Authenticated wrong role for endpoint | `403 FORBIDDEN` |
| Malformed order UUID | Customer endpoint: `404 ORDER_NOT_FOUND` (matches current customer order detail privacy behavior); Operator endpoint: `400 BAD_REQUEST` (matches the existing operator accept route) |
| Customer requests another customer's order | `404 ORDER_NOT_FOUND` (do not disclose the record) |
| Validly formed ID has no order | `404 ORDER_NOT_FOUND` |
| Existing order is not `PENDING` (`ACCEPTED`, `CANCELLED`, or later state) | `409 ORDER_NOT_PENDING` |
| Transaction/database failure while restoring any item | Sanitized `500`; no partial status or stock change persists |

The only cancellable state is `PENDING`; there is no cancellation after acceptance, preparation, readiness, or completion. A failed request leaves the order and all menu stock unchanged. Repeated cancellation is rejected with `409`, rather than reported as a second success.

### 2.3 Atomicity and exactly-once stock restoration

The implementation must use a database transaction containing both the conditional order update and all stock increments. The conditional update predicate includes the requested order ID and `status = PENDING`; for the Customer endpoint it must also enforce `customerId` ownership in the database predicate or an equivalent authorization check inside the transaction. Stock increments use each immutable `OrderItem.quantity`, not client values or current menu prices/availability. Use atomic database increments (`stockQuantity: increment quantity`) so F-05 stock adjustments cannot overwrite cancellation increments. Restore every line exactly once if and only if the status update wins. Do not delete order items or change totals, payment state, price snapshots, or `estimatedReadyAt`.

If the conditional update affects zero rows, distinguish absent/unauthorized (`404`) from an existing non-pending order (`409`) without exposing another customer's order. If any stock write fails, the transaction must roll back the status change and all preceding stock writes.

## 3. UI contract

- **Customer `/orders` and `/orders/:id`:** Show a Cancel action only for the authenticated Customer's `PENDING` order. Disable it while submitting. On success, show `CANCELLED` using the server result and refresh/reconcile the order list. On conflict or failure, retain server state and show a safe message.
- **Operator `/operator/orders`:** Show a Cancel action for `PENDING` orders only. Operators can cancel any café order. On success, display `CANCELLED` and refresh/reconcile the list. A concurrent state change is reported without optimistic stock or status assumptions.
- Hiding an action is not authorization; both APIs enforce role, ownership, and state.
- Cancellation does not remove the order from history, alter order contents, or initiate payment/refund behavior.

## 4. Data contract and unchanged behavior

The existing `OrderStatus` enum already includes `CANCELLED`; `OrderItem` stores the reserved quantity and `MenuItem` stores integer `stockQuantity`. No schema change is currently required by this contract. Current Sprint 1 routes implement order creation, reads, and F-04 acceptance but do not yet implement cancellation. If implementation review finds a new persisted cancellation field or schema constraint necessary, revise this contract and migration plan before coding.

Unchanged invariants:

- Order submission reserves stock atomically; cancellation releases only that order's reservation.
- Unit-price snapshots, total satang, payment status, item rows, and ownership are preserved.
- `estimatedReadyAt` is left untouched. A pending order normally has no acceptance estimate; cancellation must not fabricate one.
- A cancelled order is not an eligible F-07 fulfillment order and remains excluded from completed sales under BR-13.
- F-04 acceptance (`PENDING → ACCEPTED` with mandatory preparation estimate) and historical null-estimate compatibility remain unchanged.

## 5. Acceptance criteria

| AC | Statement |
|---|---|
| **F06-AC01** | An authenticated owner Customer can cancel their `PENDING` order; the API returns `200`, records `CANCELLED`, and the order remains visible in their history. |
| **F06-AC02** | An authenticated Operator can cancel any café `PENDING` order; a Customer cannot use the Operator endpoint. |
| **F06-AC03** | Cancellation restores each order item's reserved quantity to its matching menu item, with status and every increment committed atomically. |
| **F06-AC04** | A repeated, concurrent-losing, or otherwise non-pending cancellation returns `409 ORDER_NOT_PENDING` and causes no additional stock restoration. |
| **F06-AC05** | Anonymous requests are rejected; a Customer cannot cancel another Customer's order, and the response does not reveal that order's details. |
| **F06-AC06** | If any restoration write fails, no partial stock restoration or `CANCELLED` status remains persisted. |
| **F06-AC07** | Cancellation preserves order items, snapshots, total, payment state, and nullable `estimatedReadyAt`; it does not fabricate an estimate or cause a price, payment, fulfillment, or refund side effect. |

## 6. Software Test Specification (STS)

Integration cases use the isolated test database, seeded synthetic Customer A, Customer B, Operator, and menu items, plus isolated orders. Record before/after stock for every involved menu item. **Every case is Designed / Not run.**

| Test ID | AC | Level | Inputs and steps | Expected outcome | Status |
|---|---|---|---|---|---|
| **F06-T01** | AC01, AC03 | API + DB | Create Customer A `PENDING` order with two menu lines (e.g. 2 lattes and 1 sandwich); record both stocks; Customer A calls `PATCH /api/v1/orders/:id/cancel`. | `200`, response `CANCELLED`; order remains with original items and totals; stocks increase by exactly 2 and 1. | Designed / Not run |
| **F06-T02** | AC02, AC03 | API + DB | Create Customer A `PENDING` order; Operator calls `PATCH /api/v1/operator/orders/:id/cancel`. | `200`, `CANCELLED`; each reserved quantity is restored once. | Designed / Not run |
| **F06-T03** | AC05 | API + DB | Try customer endpoint without a session; try it as Customer B against Customer A's order; try operator endpoint as Customer A; submit malformed UUIDs on both endpoints and a well-formed absent UUID. | `401`, `404 ORDER_NOT_FOUND`, `403`, customer malformed `404`, operator malformed `400`, and absent `404 ORDER_NOT_FOUND`; order and stock remain unchanged. | Designed / Not run |
| **F06-T04** | AC04 | API + DB | Create non-pending (`ACCEPTED`) and already `CANCELLED` orders with known stock state; send cancellation with the proper role. | Each returns `409 ORDER_NOT_PENDING`; status and stock remain unchanged. | Designed / Not run |
| **F06-T05** | AC04 | Concurrent API + DB | Send Customer-owner and Operator cancellation requests concurrently for the same `PENDING` order. | Exactly one request returns `200`, the other `409`; final status is `CANCELLED`; stock is restored once, not twice. | Designed / Not run |
| **F06-T06** | AC06 | API + DB transaction | In the isolated test database only, use a temporary test fixture (such as a test-only constraint/trigger) to make a stock restoration write fail after at least one line has been processed; remove the fixture during cleanup and inspect the order and every menu item. Do not add a production failure-injection route or switch. | Sanitized failure; order remains `PENDING`; all stock values equal their pre-request values. | Designed / Not run |
| **F06-T07** | AC07 | API + DB | Cancel a pending order; reload the order as its owner and compare items, total, payment state, and nullable estimate with pre-request values. | Those fields and line items are unchanged apart from status/updatedAt; no estimate, refund, or payment change is introduced. | Designed / Not run |

## 7. Definition of Done

1. The team reviews this contract before implementation and preserves the shared role, path, status-code, and exactly-once decisions in code and tests.
2. Customer and Operator cancellation APIs enforce authentication, role, ownership, UUID, and `PENDING` state checks.
3. A single database transaction conditionally changes status and restores all item quantities exactly once; rollback and competing requests are covered.
4. Customer and Operator UI actions are state-aware, show server outcomes, and remain usable after refresh.
5. F06-T01 through F06-T07 are implemented without weakening existing F-03/F-04 regression tests; test evidence is recorded from an isolated database.
6. Review verifies no mutation to price snapshots, totals, payment state, fulfillment state, or Lab 7 estimate behavior.
7. Relevant API/UI and system traceability documentation is updated in its own reviewed change before release.

## 8. Dependencies, regression behavior, and open decisions

- **Dependencies:** F-01 session and role guards; F-03 stock reservation, order-item snapshots, and owner-only reads; F-05 must coordinate stock writes with transaction-safe increments.
- **Unchanged regression behavior:** order creation still reserves stock once; customer reads remain owner-only; operator acceptance remains estimate-required and conditional; payment stays simulated; no automatic fulfillment transition is introduced.
- **Resolved by Duo L:** Customer may cancel only their own pending order; Operator may cancel any single-café pending order; repeated/invalid-state cancellation returns `409 ORDER_NOT_PENDING`; races restore stock once; stock writes coordinate with F-05 atomic operations. Rollback/concurrency tests use isolated fixtures; no production failure-injection endpoint is allowed.
- **Implementation coordination:** F-05 must use atomic stock mutations compatible with cancellation increments. The test-only rollback fixture must be created and removed only in the isolated test database.
