# F-07 — Order Fulfillment Contract

**Contract version:** v0.2 revised (26 November 2026)<br>
**Feature:** F-07 Order Fulfillment<br>
**Requirements:** FR-08, BR-11; NFR-01, NFR-04<br>
**Dependencies:** F-01 authentication and roles; F-03 persisted customer orders; F-04 acceptance and `estimatedReadyAt`<br>
**Status:** Designed / Not run<br>
**Review:** Proposed for agreement with 67070503481 before implementation

## 1. Requirement links and workflow

- **FR-08:** An Operator progresses accepted orders through preparation, ready-for-pickup, and completed states; Customers see their statuses.
- **BR-11:** The only fulfillment sequence is `ACCEPTED → PREPARING → READY → COMPLETED`; backward, skipped, and repeated transitions are rejected.
- **NFR-01:** Only an authenticated Operator may change fulfillment state; Customers can retrieve only their own order records.
- **NFR-04:** Status changes persist across requests and application restarts.

`PENDING → ACCEPTED` remains F-04's operator action requiring `estimatedPrepMinutes`. F-07 begins at `ACCEPTED`. `CANCELLED` is a terminal non-fulfillment state from F-06. The estimated-ready timestamp is informational: reaching it does not trigger any transition.

## 2. Feature SDS and API contract

### 2.1 Endpoint

Use the shared decision endpoint:

`PATCH /api/v1/operator/orders/:id/status`

Request body contains exactly one requested target state:

```json
{ "status": "PREPARING" }
```

The `status` value must be an exact uppercase member of the existing `OrderStatus` enum. Only the three adjacent transitions in the table below can succeed. Recognized enum states such as `PENDING`, `ACCEPTED`, or `CANCELLED` that do not form the next legal transition are rejected as state conflicts (`409`), not coerced or silently accepted. Missing values, null, non-string values, unknown strings, and unexpected body fields are invalid requests (`400`). The caller cannot set `customerId`, `paymentStatus`, or `estimatedReadyAt`.

Success response:

```json
{ "data": { "id": "…", "status": "PREPARING", "estimatedReadyAt": "…", "updatedAt": "…" } }
```

`estimatedReadyAt` is the persisted ISO UTC string or `null` for historical orders. The response returns persisted values, not a client-computed estimate.

### 2.2 Transition and validation rules

| Current state | Allowed target | Result |
|---|---|---|
| `ACCEPTED` | `PREPARING` | `200` |
| `PREPARING` | `READY` | `200` |
| `READY` | `COMPLETED` | `200` |
| Any other current/target pair, including same-state repeat | None | `409 ORDER_NOT_PENDING` (shared System-Level SDS status-policy code for an invalid transition) |

Validate UUID and request shape before transition. A syntactically valid but unsupported target returns `400 INVALID_FULFILLMENT_STATUS`. Unknown order returns `404 ORDER_NOT_FOUND`. Missing/invalid session returns `401 UNAUTHORIZED`; authenticated Customer on the Operator endpoint returns `403 FORBIDDEN`.

| Invalid or denied request | Expected response |
|---|---|
| Malformed order UUID | `400 BAD_REQUEST` (matches the existing operator acceptance route) |
| Missing/null body, missing `status`, non-string or unknown target, extra body fields | `400 INVALID_FULFILLMENT_STATUS` |
| Syntactically valid but absent order ID | `404 ORDER_NOT_FOUND` |
| Anonymous / expired session | `401 UNAUTHORIZED` |
| Authenticated Customer | `403 FORBIDDEN` |
| Existing order with a skipped, backward, repeated, or otherwise invalid current state | `409 ORDER_NOT_PENDING` |

For each target, perform an atomic conditional update matching both order ID and its one expected predecessor status. If no row updates, distinguish absent order (`404`) from an existing order in a different state (`409 ORDER_NOT_PENDING`). Concurrent requests for the same step produce at most one success; the losing request does not mutate data. A successful update changes only status and database-managed `updatedAt`; it preserves order items, totals, stock, payment state, and `estimatedReadyAt`. Completion does not require `PAID_SIMULATED` and does not change payment state.

### 2.3 Customer retrieval

`GET /api/v1/orders` and `GET /api/v1/orders/:id` continue returning the latest persisted status for the authenticated owner. Another Customer receives the existing privacy-preserving `404 ORDER_NOT_FOUND`; anonymous requests remain `401`. F-07 does not add public or cross-customer status access.

### 2.4 UI contract

- **Operator `/operator/orders`:** For `ACCEPTED`, offer “Start preparation” (`PREPARING`); for `PREPARING`, offer “Mark ready” (`READY`); for `READY`, offer “Complete order” (`COMPLETED`). Do not offer state-changing controls for terminal `COMPLETED` or `CANCELLED` orders. Disable the active action while submitting, show the persisted result, and safely report conflicts.
- **Customer `/orders` and `/orders/:id`:** Display the current persisted lifecycle status. A page load or explicit refresh retrieves current server state; status is not inferred from elapsed time or browser state.
- Display `estimatedReadyAt` during `ACCEPTED` and `PREPARING` when non-null. Hide the estimate as a future-facing promise at `READY` and `COMPLETED`; keep its persisted value unchanged and return it in the API, including for historical `null` values.
- Browser/manual refresh is sufficient to see a changed status; no polling or realtime notification is required.
- UI visibility is not authorization; the API must enforce the transition graph and Operator role.

## 3. Data contract and Lab 7 compatibility

The existing `OrderStatus` enum already contains `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED`, and `CANCELLED`; no enum/schema addition is currently required. The existing customer order queries return persisted order data, including status and `estimatedReadyAt`.

F-07 must not clear, recompute, or use `estimatedReadyAt` to trigger a transition. Orders accepted under Lab 7 retain their original estimate through all three fulfillment transitions. Historical orders with `estimatedReadyAt = null` remain readable and transitionable. Payment remains separate: completing an order does not automatically change `UNPAID` to `PAID_SIMULATED`.

## 4. Acceptance criteria

| AC | Statement |
|---|---|
| **F07-AC01** | An Operator can make each valid adjacent transition `ACCEPTED → PREPARING → READY → COMPLETED`, receiving `200` and the persisted target state each time. |
| **F07-AC02** | Skipped, backward, repeated, or otherwise disallowed state transitions return `409 ORDER_NOT_PENDING` and do not change the order. |
| **F07-AC03** | Missing/unsupported target values and malformed IDs follow the documented validation behavior; unauthorized roles cannot change state. |
| **F07-AC04** | Concurrent attempts for one transition have at most one successful compare-and-set; the order ends in one valid state. |
| **F07-AC05** | The Customer owner can retrieve the latest persisted status through customer order reads; another Customer cannot retrieve it. |
| **F07-AC06** | Fulfillment transitions preserve the accepted order's `estimatedReadyAt`, including null compatibility; UI displays it only during `ACCEPTED` and `PREPARING`; elapsed estimate time never changes status automatically. |
| **F07-AC07** | Fulfillment changes do not alter order items, totals, price snapshots, stock, ownership, or payment status; completion is allowed while payment remains `UNPAID`. |

## 5. Software Test Specification (STS)

Use the isolated test database and synthetic Customer A, Customer B, and Operator fixtures. Each successful transition test verifies API response and persisted database state. **Every case is Designed / Not run.**

| Test ID | AC | Level | Inputs and steps | Expected outcome | Status |
|---|---|---|---|---|---|
| **F07-T01** | AC01, AC07 | API + DB | Create order in `ACCEPTED`; Operator sends `{status:"PREPARING"}`, then `{status:"READY"}`, then `{status:"COMPLETED"}` to the status endpoint. | Each request returns `200` with the requested state; persisted sequence matches; totals, items, stock, and payment remain unchanged. | Designed / Not run |
| **F07-T02** | AC02 | API + DB | Try `ACCEPTED → READY` (skip), `PREPARING → ACCEPTED` and `READY → PREPARING` (backward), `PREPARING → PENDING`, `READY → CANCELLED`, and same-state targets. | Every recognized but disallowed transition returns `409 ORDER_NOT_PENDING`; database state and unrelated fields remain unchanged. | Designed / Not run |
| **F07-T03** | AC03 | API | Try missing body, `{}`, `null`, numeric target, unknown target, extra body field, and malformed UUID. | Invalid body returns `400 INVALID_FULFILLMENT_STATUS`; malformed UUID returns `400 BAD_REQUEST` per existing operator route convention; no order changes. | Designed / Not run |
| **F07-T04** | AC03 | API + DB | Call status endpoint anonymously and with Customer A session; call a valid target on an absent UUID as Operator. | `401`, `403`, and `404 ORDER_NOT_FOUND`; no state changes. | Designed / Not run |
| **F07-T05** | AC04 | Concurrent API + DB | Two Operator requests concurrently attempt `ACCEPTED → PREPARING` for one order. | Exactly one `200`; the other `409 ORDER_NOT_PENDING`; persisted state is `PREPARING`. | Designed / Not run |
| **F07-T06** | AC05 | API + DB | Operator advances Customer A's order; Customer A GETs list and detail; Customer B requests the detail. | Owner sees the latest status and its order; other Customer receives `404 ORDER_NOT_FOUND`. | Designed / Not run |
| **F07-T07** | AC06, AC07 | API + DB | Create accepted order with a known `estimatedReadyAt` and `UNPAID` payment status; advance it through fulfillment, then retrieve as owner. Include a separate historical accepted order with null estimate. | `COMPLETED` succeeds while unpaid; non-null timestamp is unchanged in storage and API at every step; null remains null; stock and payment remain unchanged. | Designed / Not run |
| **F07-T08** | AC06 | Playwright UI + API | Open the owning Customer's order detail at `ACCEPTED`, refresh after an Operator changes it to `PREPARING`, then refresh after transitions to `READY` and `COMPLETED`. | Estimate is displayed at `ACCEPTED` and `PREPARING`, absent as a future promise at `READY` and `COMPLETED`; status reflects each persisted value after browser refresh. | Designed / Not run |

## 6. Definition of Done

1. Implement the shared endpoint, transition graph, role boundaries, response codes, and estimate-display decisions recorded here.
2. Operator endpoint validates target values and implements only the three adjacent compare-and-set transitions.
3. Anonymous and Customer callers are rejected; customer status reads retain owner-only privacy.
4. Operator UI exposes only the next legal action; Customer UI displays server-persisted status after load/refresh.
5. `estimatedReadyAt` survives all transitions; it is displayed only in `ACCEPTED` and `PREPARING`; historical null estimates remain valid; time passage has no automatic state effect.
6. F07-T01 through F07-T08 pass on an isolated database without weakening existing F-04 or order-ownership tests.
7. Regression evidence confirms no changes to stock, money, payment, or order ownership behavior; update reviewed traceability/docs before release.

## 7. Dependencies, regression behavior, and open decisions

- **Dependencies:** F-01 authentication and roles; F-03 customer-owned order reads; F-04 acceptance state and estimate; F-06 cancellation must remain outside the fulfillment graph.
- **Unchanged regression behavior:** F-04 accepts only `PENDING` with a valid 5–60 minute estimate, stores estimate atomically, and rejects repeats; F-06 `PENDING → CANCELLED` restores stock once; F-07 never touches stock or payment; owner-only order detail and historical null estimates continue working.
- **Resolved by Duo L:** Use `PATCH /api/v1/operator/orders/:id/status`; permit only adjacent Operator transitions; customer browser/manual refresh is sufficient; preserve `estimatedReadyAt` but display it only in `ACCEPTED` and `PREPARING`; do not mutate stock or require payment before completion.
- **Baseline alignment note:** The shared System-Level SDS uses `ORDER_NOT_PENDING` as its example code for an invalid transition, so this contract uses that code for F-07 conflicts as well. Current Sprint 1 code implements F-04 acceptance and customer status retrieval but has no F-07 endpoint or operator transition UI. The current customer detail UI shows `estimatedReadyAt` only in `ACCEPTED`; the agreed `PREPARING` display behavior requires a future UI update.
