# F-08 Simulated Payment

**Sprint 2 · Deliverable 2 · Draft v0.1 · Author 3481 · Review requested from 3484**

F-08 lets Operators inspect and record a simulated payment state for café orders. FR-09 defines the recording and viewing workflow. BR-12 limits the stored values to `UNPAID` and `PAID_SIMULATED` and restricts writes to Operators. The System SDS specifies the one-way transition `UNPAID → PAID_SIMULATED`. BR-07 still protects customer ownership. NFR-01 and NFR-04 apply to authorization and durability. DEC-07 and BR-13 define the downstream sales rule for F-09.

Source documents: [SRS](../../srs.md), [feature inventory](../../features.md), [System SDS](../../system-sds.md), [traceability](../../traceability.md).

## 1. Workflow and feature SDS

1. A signed-in Operator opens the existing `/operator/orders` page. Every order card shows its saved payment state. Use **Unpaid** and **Paid (simulated)** as display labels.
2. For an eligible unpaid order, the Operator chooses **Mark paid (simulated)**. The UI disables that order’s payment action during submission. It displays the saved state from the server response and surfaces rejection messages. On a state conflict it refreshes the order before allowing another attempt.
3. The Express operator route resolves the session and authorizes the Operator, validates the UUID and JSON body, and applies the transition to the persisted order. An already paid order displays its saved state without an edit action.
4. The existing operator list and customer-owned order details reflect the saved state on the next fetch. Customer details remain read-only and customer order lists remain scoped to their owner.

The workflow updates the local payment flag only. The page collects zero card, bank, or personal payment details and makes no provider requests. Refunds, receipts, payment amounts, and transaction references are outside this feature.

## 2. API contract

| Method and path | Role | Contract |
|---|---|---|
| `GET /api/v1/operator/orders` | Operator | Existing `200 { data: [...] }` includes `paymentStatus` on each café order |
| `PATCH /api/v1/operator/orders/:id/payment-status` | Operator | Takes exactly one `paymentStatus` field and returns `200` with the saved ID, payment state, and `updatedAt` |
| `GET /api/v1/orders` and `GET /api/v1/orders/:id` | Customer, own orders only | Existing responses keep `paymentStatus`. Another customer’s order detail returns `404 ORDER_NOT_FOUND` |

```json
{"paymentStatus":"PAID_SIMULATED"}
```

```json
{
  "data": {
    "id": "c3555555-5555-4555-8555-555555555555",
    "paymentStatus": "PAID_SIMULATED",
    "updatedAt": "2026-11-25T15:05:00.000Z"
  }
}
```

Use the existing session cookie and Operator middleware. The authenticated Operator can act on any order of the single café. Customer ownership of an order grants read access only. The new endpoint uses the same UUID format check as the current operator acceptance endpoint.

| Status and code | Condition |
|---|---|
| `400 INVALID_PAYMENT_STATUS` | Empty, malformed, or non-object JSON, missing field, null, numbers, unsupported or differently cased values, or additional fields such as `role`, `customerId`, `status`, or `amount`. Map JSON parser errors for this route to the same response. |
| `400 BAD_REQUEST` | Malformed order ID |
| `401 UNAUTHORIZED` | Missing, expired, or invalid session |
| `403 FORBIDDEN` | Authenticated Customer, including the order owner |
| `404 ORDER_NOT_FOUND` | Well-formed ID with no matching order |
| `409 PAYMENT_ORDER_INELIGIBLE` | Request to mark an order paid while its fulfillment status is `PENDING` or `CANCELLED` |
| `409 PAYMENT_STATUS_CONFLICT` | Request for `UNPAID` on a `PAID_SIMULATED` order |
| `500 INTERNAL_SERVER_ERROR` | Unexpected failure with a sanitized message |

Errors use the existing `{ "error": { "code": "...", "message": "..." } }` envelope. Only the exact case-sensitive strings `UNPAID` and `PAID_SIMULATED` are valid request values. A rejected request leaves the order unchanged.

## 3. Transition and data contract

The proposed eligibility window is `ACCEPTED`, `PREPARING`, `READY`, or `COMPLETED`. It allows the Operator to record payment after accepting the order, including after pickup. Payments and fulfillment have separate controls.

| Stored payment state | Requested state | Order status | Outcome |
|---|---|---|---|
| `UNPAID` | `PAID_SIMULATED` | `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED` | `200`, persist the change and return the saved fields |
| `PAID_SIMULATED` | `PAID_SIMULATED` | `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED` | `200`, return the saved state without a write or timestamp change |
| Either value | `PAID_SIMULATED` | `PENDING`, `CANCELLED` | `409 PAYMENT_ORDER_INELIGIBLE` |
| `UNPAID` | `UNPAID` | Any | `200`, return the saved state without a write or timestamp change |
| `PAID_SIMULATED` | `UNPAID` | Any | `409 PAYMENT_STATUS_CONFLICT` |

- Reuse the PostgreSQL-backed `Order.paymentStatus` enum and its `UNPAID` default. Existing rows keep their stored state. No new payment records or schema fields are required.
- Use a conditional database write that checks ID, expected payment state `UNPAID`, and eligible fulfillment status together. Return persisted fields from that write. If it matches no row, read current state and apply the table. Concurrent mark-paid requests result in one write and a successful same-state response for the other request.
- A payment write changes only `paymentStatus` and the automatic `updatedAt`. Checkout prices, totals, items, stock, fulfillment state, customer ownership, and the Lab 7 ready estimate are preserved. F-07 fulfillment handlers must write only their own fields so that concurrent updates preserve both results.
- F-01 provides the session and role guard. F-03 creates unpaid orders and supplies owner-scoped reads. F-04 supplies the operator list and acceptance. F-06 handles pending cancellation and stock restoration. F-07 advances fulfillment independently of payment. F-09 will count only orders with both `COMPLETED` and `PAID_SIMULATED`, using their saved prices.

Baseline modules: [Prisma schema](../../../backend/prisma/schema.prisma), [role middleware](../../../backend/src/middleware/auth.ts), [operator API routes](../../../backend/src/routes/operatorRoutes.ts), [customer order routes](../../../backend/src/routes/orderRoutes.ts), [operator UI](../../../frontend/src/features/operator/OperatorOrdersPage.tsx), [operator API client](../../../frontend/src/features/operator/operatorApi.ts), [customer order UI](../../../frontend/src/features/orders/OrderPages.tsx).

## 4. Acceptance criteria

1. **S2-F08-AC01** · New orders start unpaid. An Operator can inspect both states and mark an eligible unpaid order as paid. The saved state survives refresh and application restart. `FR-09, BR-12, NFR-04`
2. **S2-F08-AC02** · The backend enforces the transition table, including eligibility, same-state retries, reversals, and concurrent requests. `FR-09, BR-12`
3. **S2-F08-AC03** · Anonymous, expired-session, and Customer callers cannot mutate payment. Malformed input and missing orders receive the specified errors with no write. `BR-12, NFR-01`
4. **S2-F08-AC04** · The owner can read the saved payment state. Other Customers cannot see the order or its payment state. Payment preserves order data and the independent fulfillment workflow. `FR-04, BR-07, BR-11, BR-12`
5. **S2-F08-AC05** · The Operator UI identifies the action as simulated, prevents duplicate in-flight actions, and displays server-confirmed state and safe errors. The workflow collects no payment details and contacts no payment service. `FR-09, BR-12`

## 5. Software Test Specification

Use isolated PostgreSQL fixtures with Customer A (owner), Customer B, an Operator, and a guest. Use new fixtures for each transition row and check pre/post database snapshots. Exercise checkout and F-04 acceptance through their APIs for the main journey. Use seeded lifecycle states for boundary cases and independent database connections when testing concurrent writes.

| Test ID | AC | Level and input / action | Expected outcome | Status |
|---|---|---|---|---|
| S2-F08-T01 | AC01, AC04 | API + DB. A checks out a valid item. Inspect the Operator list and A’s details. Accept with `estimatedPrepMinutes: 20`, then PATCH to `PAID_SIMULATED`. Fetch in new sessions after app restart on the same database. | Checkout creates `UNPAID`. PATCH returns `200`; database and both reads show `PAID_SIMULATED`. Compare order ID, owner, `ACCEPTED` status, saved ready estimate, line prices, total and menu stock before and after the payment write. | Designed / Not run |
| S2-F08-T02 | AC02 | API + DB. For each of the six order statuses seed a fresh unpaid order and PATCH to `PAID_SIMULATED`. | The four eligible states return `200` and persist payment without changing fulfillment. `PENDING` and `CANCELLED` return `409 PAYMENT_ORDER_INELIGIBLE` with the order unchanged. | Designed / Not run |
| S2-F08-T03 | AC02 | API + DB. Send `UNPAID` to an unpaid order. Send two simultaneous mark-paid requests on an eligible fixture, then repeat the paid request and attempt `UNPAID`. | Initial no-op returns `200` with the original timestamp. Both concurrent requests return `200` with the same saved timestamp. Later replay preserves it. Reversal returns `409 PAYMENT_STATUS_CONFLICT` and leaves the order paid. | Designed / Not run |
| S2-F08-T04 | AC03, AC04 | API + DB. Guest, expired-session caller, A and B attempt the valid PATCH and Operator list. A includes a forged role in a second PATCH. A and B request A’s detail via the customer route and B lists own orders. | Guest and expired session get `401`. Customers get `403` on operator operations. No payment changes. A can read the detail, B gets `404 ORDER_NOT_FOUND`, and B’s list omits A’s order. | Designed / Not run |
| S2-F08-T05 | AC03 | API + DB. As Operator send `{}`, no body, malformed JSON, an array, null, `{"paymentStatus":1}`, `{"paymentStatus":"paid_simulated"}`, `{"paymentStatus":"REFUNDED"}`, and an otherwise valid object with an extra field. Then send a valid body to a malformed ID and to a valid unused UUID. | Invalid bodies return `400 INVALID_PAYMENT_STATUS`. The malformed ID returns `400 BAD_REQUEST` and the absent order returns `404 ORDER_NOT_FOUND`. All rejected cases leave DB rows unchanged. | Designed / Not run |
| S2-F08-T06 | AC02, AC04 | API + DB with F-07. On an accepted unpaid fixture, issue the legal `ACCEPTED → PREPARING` action and mark paid concurrently. Continue the fulfillment workflow on an independent unpaid fixture. | Final state is `PREPARING` and `PAID_SIMULATED` on the first fixture. The unpaid fixture can still advance through F-07 and stays unpaid. Neither action alters the estimate, price snapshots, or stock. | Designed / Not run |
| S2-F08-T07 | AC04, AC05 | Browser + API + DB. Open the Operator feed with eligible, pending, cancelled, and paid orders. Attempt two immediate clicks on an eligible order, then reload and view as A. In a separate Operator session, expire its session after loading the feed and click the action. Inspect UI, handler, and request destinations. | Only eligible unpaid cards have the action. The button disables while one request is in flight. Success shows Paid (simulated) after reload and A can read it. The expired session gets `401`, the UI shows safe feedback, and its target remains unpaid. No financial inputs or payment-provider calls appear. | Designed / Not run |

## 6. Definition of Done

- [ ] 3484 reviews the contract and records agreement on the eligibility window and retry semantics.
- [ ] Operator and customer read workflows and Operator-only writes are demonstrated with real PostgreSQL. All F-08 criteria have passing evidence.
- [ ] Run the existing build and test commands. Recheck F-01 session permissions, F-03 checkout and ownership, F-04 acceptance and estimates, F-06 cancellation, and F-07 fulfillment.
- [ ] Record the tested commit, commands, results, concurrency setup, and browser evidence in the implementation review. Update shared traceability after review.

## 7. Decisions for review with 3484

- Confirm whether payment is allowed from acceptance, as drafted, or only once the order is ready for pickup or completed. Confirm that completion can occur while unpaid.
- Confirm that repeat requests for the same state are successful no-ops and that paid-to-unpaid corrections require a later contract. The System SDS currently specifies the one-way transition.
