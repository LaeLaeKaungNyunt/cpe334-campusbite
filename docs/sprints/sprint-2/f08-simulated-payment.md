# F-08 Simulated Payment

**Sprint 2 · Deliverable 2 · Draft v0.2 · Author 3481 · Duo L proposed decisions**

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
| `PATCH /api/v1/operator/orders/:id/payment` | Operator | Accepts exactly `{"paymentStatus":"PAID_SIMULATED"}` and returns `200` with the saved ID, payment state, and `updatedAt` |
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
| `400 INVALID_PAYMENT_STATUS` | Empty, malformed, or non-object JSON, missing field, any value other than `PAID_SIMULATED` (including `UNPAID`), or additional fields such as `role`, `customerId`, `status`, or `amount`. Map JSON parser errors for this route to the same response. |
| `400 BAD_REQUEST` | Malformed order ID |
| `401 UNAUTHORIZED` | Missing, expired, or invalid session |
| `403 FORBIDDEN` | Authenticated Customer, including the order owner |
| `404 ORDER_NOT_FOUND` | Well-formed ID with no matching order |
| `409 PAYMENT_ORDER_INELIGIBLE` | An unpaid order is `PENDING` or `CANCELLED` |
| `409 PAYMENT_ALREADY_RECORDED` | The order already has `PAID_SIMULATED` |
| `500 INTERNAL_SERVER_ERROR` | Unexpected failure with a sanitized message |

Errors use the existing `{ "error": { "code": "...", "message": "..." } }` envelope. The request accepts the exact case-sensitive value `PAID_SIMULATED`. `UNPAID` is the initial persisted state. A rejected request leaves the order and its `updatedAt` unchanged.

## 3. Transition and data contract

The Operator can record payment during `ACCEPTED`, `PREPARING`, `READY`, or `COMPLETED`. Fulfillment can advance independently and an order can complete while `UNPAID`. Payment has no reversal.

| Stored payment state | Requested state | Order status | Outcome |
|---|---|---|---|
| `UNPAID` | `PAID_SIMULATED` | `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED` | `200`, persist the change and return the saved fields |
| `PAID_SIMULATED` | `PAID_SIMULATED` | Any | `409 PAYMENT_ALREADY_RECORDED`, no write |
| `UNPAID` | `PAID_SIMULATED` | `PENDING`, `CANCELLED` | `409 PAYMENT_ORDER_INELIGIBLE`, no write |
| Either value | `UNPAID` | Any | `400 INVALID_PAYMENT_STATUS`, no write |

- Reuse the PostgreSQL-backed `Order.paymentStatus` enum and its `UNPAID` default. Existing rows keep their stored state. No new payment records or schema fields are required.
- Use a conditional database write that checks ID, expected payment state `UNPAID`, and eligible fulfillment status together. Return persisted fields from that write. If it matches no row, read current state and return the matching error. Concurrent mark-paid requests on the same eligible order produce one `200` and one `409 PAYMENT_ALREADY_RECORDED`.
- A payment write changes only `paymentStatus` and the automatic `updatedAt`. Checkout prices, totals, items, stock, fulfillment state, customer ownership, and the Lab 7 ready estimate are preserved. F-07 fulfillment handlers must write only their own fields so that concurrent updates preserve both results.
- F-01 provides the session and role guard. F-03 creates unpaid orders and supplies owner-scoped reads. F-04 supplies the operator list and acceptance. F-06 handles pending cancellation and stock restoration. F-07 advances fulfillment independently of payment. F-09 will count only orders with both `COMPLETED` and `PAID_SIMULATED`, using their saved prices.

Baseline modules: [Prisma schema](../../../backend/prisma/schema.prisma), [role middleware](../../../backend/src/middleware/auth.ts), [operator API routes](../../../backend/src/routes/operatorRoutes.ts), [customer order routes](../../../backend/src/routes/orderRoutes.ts), [operator UI](../../../frontend/src/features/operator/OperatorOrdersPage.tsx), [operator API client](../../../frontend/src/features/operator/operatorApi.ts), [customer order UI](../../../frontend/src/features/orders/OrderPages.tsx).

## 4. Acceptance criteria

1. **S2-F08-AC01** · New orders start unpaid. An Operator can inspect both states and mark an eligible unpaid order as paid. The saved state survives refresh and application restart. `FR-09, BR-12, NFR-04`
2. **S2-F08-AC02** · The backend permits only the unpaid-to-paid transition on eligible orders. Repeated or competing payment requests return a conflict after the first success, and requests for reversal are rejected. `FR-09, BR-12`
3. **S2-F08-AC03** · Anonymous, expired-session, and Customer callers cannot mutate payment. Malformed input and missing orders receive the specified errors with no write. `BR-12, NFR-01`
4. **S2-F08-AC04** · The owner can read the saved payment state. Other Customers cannot see the order or its payment state. Payment preserves order data and the independent fulfillment workflow. `FR-04, BR-07, BR-11, BR-12`
5. **S2-F08-AC05** · The Operator UI identifies the action as simulated, prevents duplicate in-flight actions, and displays server-confirmed state and safe errors. The workflow collects no payment details and contacts no payment service. `FR-09, BR-12`
6. **S2-F08-AC06** · For F-09 reporting, an order qualifies as a sale only when its saved states are `COMPLETED` and `PAID_SIMULATED`. The amount uses saved order prices. `DEC-07, BR-13`

## 5. Software Test Specification

Use isolated PostgreSQL fixtures with Customer A (owner), Customer B, an Operator, and a guest. Use new fixtures for each transition row and check pre/post database snapshots. Exercise checkout and F-04 acceptance through their APIs for the main journey. Use seeded lifecycle states for boundary cases and independent database connections when testing concurrent writes.

| Test ID | AC | Level and input / action | Expected outcome | Status |
|---|---|---|---|---|
| S2-F08-T01 | AC01, AC04 | API + DB. A orders two active units priced at 6500 satang. Inspect the Operator list and A’s details. Accept with `estimatedPrepMinutes: 20`, then send the payment PATCH example. Fetch in new sessions after app restart on the same database. | Checkout creates `UNPAID` with a 13000-satang total. PATCH returns `200`; database and both reads show `PAID_SIMULATED`. Order ID, owner, `ACCEPTED` status, saved estimate, line prices, total and menu stock match the pre-payment snapshot. | Designed / Not run |
| S2-F08-T02 | AC02 | API + DB. For each of the six order statuses seed a fresh unpaid order and PATCH to `PAID_SIMULATED`. | The four eligible states return `200` and persist payment without changing fulfillment. `PENDING` and `CANCELLED` return `409 PAYMENT_ORDER_INELIGIBLE` with the order unchanged. | Designed / Not run |
| S2-F08-T03 | AC02 | API + DB. Send `UNPAID` to an unpaid order. Send two simultaneous mark-paid requests on that eligible fixture, then repeat the paid request and attempt `UNPAID` on the paid order. | The first `UNPAID` request returns `400 INVALID_PAYMENT_STATUS`. One concurrent request returns `200` and the other `409 PAYMENT_ALREADY_RECORDED`. The later replay returns the same conflict and reversal returns `400 INVALID_PAYMENT_STATUS`. The saved paid state and timestamp match the successful update. | Designed / Not run |
| S2-F08-T04 | AC03, AC04 | API + DB. Guest, expired-session caller, A and B attempt the valid PATCH and Operator list. A includes a forged role in a second PATCH. A and B request A’s detail via the customer route and B lists own orders. | Guest and expired session get `401`. Customers get `403` on operator operations. No payment changes. A can read the detail, B gets `404 ORDER_NOT_FOUND`, and B’s list omits A’s order. | Designed / Not run |
| S2-F08-T05 | AC03 | API + DB. As Operator send `{}`, no body, malformed JSON, an array, null, `{"paymentStatus":1}`, `{"paymentStatus":"paid_simulated"}`, `{"paymentStatus":"REFUNDED"}`, and an otherwise valid object with an extra field. Then send a valid body to a malformed ID and to a valid unused UUID. | Invalid bodies return `400 INVALID_PAYMENT_STATUS`. The malformed ID returns `400 BAD_REQUEST` and the absent order returns `404 ORDER_NOT_FOUND`. All rejected cases leave DB rows unchanged. | Designed / Not run |
| S2-F08-T06 | AC02, AC04 | API + DB with F-07. On an accepted unpaid fixture, issue the legal `ACCEPTED → PREPARING` action and mark paid concurrently. On an independent accepted unpaid fixture, complete the full F-07 sequence. | Final state is `PREPARING` and `PAID_SIMULATED` on the first fixture. The second finishes as `COMPLETED` and `UNPAID`. Both retain their estimates, price snapshots, and stock values. | Designed / Not run |
| S2-F08-T07 | AC04, AC05 | Browser + API + DB. Open the Operator feed with eligible, pending, cancelled, and paid orders. Attempt two immediate clicks on an eligible order, then reload and view as A. For another eligible order, have a second Operator record payment before the first submits. In a separate session, expire the Operator session after loading the feed and click the action. Inspect UI, handler, and request destinations. | Only eligible unpaid cards have the action. One request is sent during the first submission. Success shows Paid (simulated) after reload and A can read it. The stale view receives `409`, displays the error, and refreshes to the paid label without an action. The expired session gets `401` and its target stays unpaid. The workflow collects no financial inputs and contacts no payment provider. | Designed / Not run |
| S2-F08-T08 | AC06 | API + DB when F-09 is available. For one report period seed completed-and-paid, completed-and-unpaid, ready-and-paid, and cancelled-and-unpaid orders with saved totals of 13000, 14000, 15000 and 16000 satang respectively. Change the current menu price and query the F-09 sales summary for that period. | The summary counts one order totaling 13000 satang. Excluded orders and the current price have no effect on the result. | Designed / Not run |

## 6. Definition of Done

- [ ] Record teammate review of the payment contract and the F-07/F-09 dependencies.
- [ ] Demonstrate Operator-only writes and owner-scoped reads with real PostgreSQL. Collect passing evidence for AC01–AC05. Carry the AC06 reporting check into F-09 integration.
- [ ] Run the existing build and test commands. Recheck F-01 session permissions, F-03 checkout and ownership, F-04 acceptance and estimates, F-06 cancellation, and F-07 fulfillment.
- [ ] Record the tested commit, commands, results, concurrency setup, and browser evidence in the implementation review. Update shared traceability after review.

## 7. Baseline alignment

The SRS and System SDS already define Operator-only simulated payment and the one-way transition. The eligibility window and repeat conflict specify behavior left open by the shared documents. The current schema and checkout already default to `UNPAID`, and existing reads already carry the payment state. The payment write endpoint and Operator controls are Sprint 2 additions. Existing ownership rules, historical records, and Lab 7 acceptance are preserved.
