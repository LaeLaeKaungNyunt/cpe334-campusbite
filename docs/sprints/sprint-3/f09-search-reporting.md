# F-09 Order Search and Completed-Sales Reporting

**Sprint 3 · Deliverable 2 · v1.0 · Member 3484 · Finalized Duo L design**

**Requirements** FR-10, FR-11, BR-07, BR-08, BR-13, NFR-01, NFR-05

**Verification status** Designed / Not run

Customers can find their own orders from **My orders**. Operators can filter café orders and view sales totals and units sold by product. The report covers completed and simulated-paid orders placed during the selected period and uses checkout price snapshots.

Sources · [SRS](../../srs.md) · [Feature inventory](../../features.md) · [System SDS](../../system-sds.md) · [Traceability](../../traceability.md) · [F-08 simulated payment](../sprint-2/f08-simulated-payment.md)

## 1. API and authorization

| Method and path | Access | Success response |
|---|---|---|
| `GET /api/v1/orders` | Customer, own orders only | Existing `200 { "data": [...] }` with optional filters |
| `GET /api/v1/operator/orders` | Operator, all orders at the single café | Existing `200 { "data": [...] }` with optional filters |
| `GET /api/v1/operator/reports/sales?from=YYYY-MM-DD&through=YYYY-MM-DD` | Operator | `200 { "data": { ... } }` aggregate defined in §3 |

Reuse the existing session cookie and role guards. Authorize before query validation. Every customer list query includes `Order.customerId = authenticatedUser.id` alongside the filters. A valid search for another customer's ID returns the same empty array as a search for an absent ID. Keep the existing owner-scoped order detail route and its privacy-preserving `404 ORDER_NOT_FOUND`. The operator list keeps its existing fields, including the safe customer summary. The report returns only aggregate and product data. The existing Operator role is sufficient.

Unfiltered requests to both list endpoints retain their existing response fields, including status, payment state, items, totals, and nullable `estimatedReadyAt`. Keep newest-first ordering by `createdAt` with descending ID as a deterministic tie-breaker. Lists keep their existing all-matches behavior. All three reads leave the stored records untouched.

| Status and code | Condition |
|---|---|
| `400 INVALID_ORDER_FILTER` | Invalid list query |
| `400 INVALID_REPORT_PERIOD` | Invalid sales report query, including missing required dates |
| `401 UNAUTHORIZED` | Missing, expired, or invalid session |
| `403 FORBIDDEN` | Authenticated role lacks access to the endpoint |
| `500 INTERNAL_SERVER_ERROR` | Unexpected server or database failure with a sanitized message |

Errors use the existing `{ "error": { "code": "...", "message": "..." } }` envelope. Use parameterized database queries. Reject unknown parameters, repeated keys, array or object syntax, and empty values. Query keys and enums are case-sensitive. Reject identity and role inputs such as `customerId` and `role` as unknown parameters.

## 2. Order search and date filters

All supplied list filters combine with AND. The report accepts only `from` and `through`.

| Query key | Customer list | Operator list | Rule |
|---|---|---|---|
| `orderId` | Optional | Optional | Exact full UUID in canonical 8-4-4-4-12 hex format, case-insensitive. Reject partial IDs and free text. |
| `status` | Optional | Optional | One of `PENDING`, `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED` |
| `paymentStatus` | — | Optional | `UNPAID` or `PAID_SIMULATED` |
| `from`, `through` | Optional | Optional | Each supplied value is a real calendar date in `YYYY-MM-DD` format |

Both date filters refer to `Order.createdAt` and include the selected local calendar days in `Asia/Bangkok`. Convert local midnight on `from` to the inclusive UTC lower bound and local midnight on the day after `through` to the exclusive UTC upper bound. Each missing list bound leaves that side open. A report requires both dates and accepts 1 to 366 calendar days, counting both endpoints. Reject invalid dates, reversed bounds, and report windows longer than 366 days. For `from=2026-11-26&through=2026-11-26`, use `createdAt >= 2026-11-25T17:00:00.000Z` and `createdAt < 2026-11-26T17:00:00.000Z`.

Add labeled filters with **Apply** and **Clear** controls to `/orders` and `/operator/orders`. Label the ID field **Full order ID** and make the full ID accessible from the list card or linked detail. Show a distinct no-matches state, loading feedback, and safe validation or request errors. Preserve the applied filters through refresh actions and reconciliation after cancellation, acceptance, fulfillment, or payment. After a mutation succeeds, a row that no longer matches the filters leaves the result. Only the latest applied query may update the list.

## 3. Completed-sales report

Add an Operator-only **Sales summary** section to `/operator/orders` with required **Order placed from** and **Order placed through** fields and a **View summary** action. Label the results **Completed and simulated-paid orders placed during the selected period.** Show order count, total in THB, and product rows with units sold and sales amount. Identify the selected dates and `Asia/Bangkok` alongside the results. Display a zero-sales state for a successful empty period and a separate error state if retrieval fails.

- Select orders whose saved `status = COMPLETED` **and** `paymentStatus = PAID_SIMULATED` and whose `Order.createdAt` is in the window. The summary reflects both states at query time. An order paid or completed later can enter an earlier placement-period report on the next fetch.
- Count qualifying orders once. Compute `salesTotalSatang` from the sum of their saved `OrderItem.lineTotalSatang`. Group the same rows by stable `menuItemId`, sum saved quantities and saved line totals, then sort by quantity descending and menu item ID ascending. All amounts use integer satang. Use exact sums internally and range-check before serializing JSON numbers.
- Use the current menu name only as a display label. A rename changes the label while the same ID retains its historical quantities and amounts. The schema has no historical product-name snapshot. Current menu price, stock, activation, and ready estimates play no part in sale qualification or amounts.
- Derive the order count, totals, and product rows from one database snapshot, using a single aggregate query or equivalent consistent read. The database records placement time and the saved fulfillment and payment states. The schema has no dedicated completion or payment timestamp. The mutable `updatedAt` field tracks updates across workflows.

Example response for two qualifying orders placed on 26 November 2026. The first saved two lattes at 6500 satang each. The second saved one latte at 7000 and one sandwich at 8500.

```json
{
  "data": {
    "from": "2026-11-26",
    "through": "2026-11-26",
    "timeZone": "Asia/Bangkok",
    "dateField": "createdAt",
    "completedOrderCount": 2,
    "salesTotalSatang": 28500,
    "products": [
      {
        "menuItemId": "c3444444-4444-4444-8444-444444444444",
        "menuItemName": "Iced Latte",
        "quantity": 3,
        "salesTotalSatang": 20000
      },
      {
        "menuItemId": "c3555555-5555-4555-8555-555555555555",
        "menuItemName": "Chicken Sandwich",
        "quantity": 1,
        "salesTotalSatang": 8500
      }
    ]
  }
}
```

An empty result uses the same shape with both totals zero and `products: []`.

## 4. Acceptance criteria

Every criterion is **Designed / Not run** until implementation and verification.

| ID | Acceptance criterion | Requirements |
|---|---|---|
| S3-F09-AC01 | A Customer can filter their own orders and search by exact full UUID. Foreign and absent IDs produce the same empty list, and protected detail retains its existing behavior. | FR-10, BR-07, NFR-01 |
| S3-F09-AC02 | An Operator can filter café orders by exact full UUID, lifecycle state, payment state, and placement dates. Both list APIs preserve unfiltered retrieval and validate queries within their roles. | FR-10, BR-08, NFR-01 |
| S3-F09-AC03 | An Operator can request a report for 1 to 366 inclusive Bangkok-local placement dates. Valid empty periods return zero sales. Invalid periods are rejected and unauthorized roles are denied. | FR-11, NFR-01 |
| S3-F09-AC04 | Only orders with both saved qualifying states count. Product summaries group by stable menu item ID. Quantities and sales amounts use saved order lines, and current menu names serve only as display labels. | FR-11, BR-13, S2-F08-AC06 |
| S3-F09-AC05 | Customers and Operators can apply and clear filters, see reconciled results and safe feedback, and Operators can run the report in their existing workflow. | FR-10, FR-11 |
| S3-F09-AC06 | Record measured timing evidence against the NFR-05 threshold using a documented, repeatable seeded benchmark. | NFR-05, SYS-04 |

## 5. Software Test Specification

Use Vitest and Supertest with isolated PostgreSQL and synthetic Customer A, Customer B, Operator, guest, and expired sessions. Use independent fixtures per case. Assert JSON keys, codes, and returned IDs or totals. Exercise browser controls using Playwright. Every case is **Designed / Not run**.

| Test ID | AC | Setup and action | Expected outcome |
|---|---|---|---|
| S3-F09-T01 | AC01 | Seed A and B with one `PENDING` order each and A with an `ACCEPTED` order. As A, query the customer list unfiltered, with `status=PENDING`, with A's pending UUID and that status, then with the same UUID and `status=ACCEPTED`. Search B's UUID and an unused UUID. Fetch B's detail as A. | Unfiltered returns only A's two orders. Matching filters return A's pending row. Mismatch, B's ID, and unused ID return identical empty arrays. B's detail returns `404 ORDER_NOT_FOUND`. |
| S3-F09-T02 | AC01, AC02, AC03 | Request both lists and the report as guest and with an expired session. Repeat protected requests as the wrong role. As A, send a valid filter with `customerId` set to B's ID. | Guest and expired sessions receive `401`. Wrong roles receive `403`. The forged owner query receives `400 INVALID_ORDER_FILTER`. Error bodies expose no order or aggregate data. |
| S3-F09-T03 | AC02 | Seed Operator fixtures across both customers and both payment states, with two orders tied on `createdAt`. Compare the unfiltered response with baseline fields. Apply each allowed filter and then combine operator ID, status, payment, and date filters. Include a legacy null estimate. | Same unfiltered field set and descending sort with ID tie-break. Only matching orders remain and persisted state, estimates, and item fields are preserved. |
| S3-F09-T04 | AC01, AC02, AC03 | On each applicable endpoint try a duplicate key, unknown key, bracketed array or object, blank value, and reversed dates. On both lists try an eight-character ID prefix, a free-text value in `orderId`, and a lowercase enum. Also try `paymentStatus` on the customer list, `2026-02-29`, a missing report bound, and `2025-01-01` through `2026-01-02` (367 days). | Invalid list queries return `400 INVALID_ORDER_FILTER`. Invalid report queries return `400 INVALID_REPORT_PERIOD`. No stored records change. |
| S3-F09-T05 | AC02, AC03, AC04 | Seed four completed-and-paid orders at one millisecond before the lower bound, exactly at the lower bound, one millisecond before the upper bound, and exactly at the upper bound in §2. Give each one saved line worth 100 satang. Request the same-day list and report, each one-sided list, and an empty report for `2025-01-01` through `2026-01-01` (366 days). | The same-day list and report include exactly the middle two orders. Report count and amount are 2 and 200. Each one-sided list filters only its specified side. The 366-day report returns `200` with both totals zero and no products. |
| S3-F09-T06 | AC04 | Seed the two qualifying orders from §3 plus in-window `COMPLETED/UNPAID`, `READY/PAID_SIMULATED`, `PENDING/UNPAID`, and `CANCELLED/UNPAID` fixtures. Rename the latte to the sandwich's display name, update the latte's current price, and deactivate it. Run the report. In a separate integration case after F-08 lands, place a completed unpaid fixture within a past window, mark it paid via F-08 after that window, and rerun the report. | The first report keeps the §3 totals and quantities. The two products have distinct IDs and rows even when they share a display name. The separate fixture contributes to its placement period only after payment persists, using its saved line amounts. Covers `S2-F08-T08`. |
| S3-F09-T07 | AC05 | In the browser as A apply and clear a status filter and a full-ID search. Cancel a matching pending order while the pending filter is active. As Operator apply a café filter and run a known in-window and an empty report. Simulate a failed request and delayed out-of-order list responses. | Filtered results respect the active role and query, the cancelled row leaves the pending list, and the latest applied query wins. Reports display the exact label from §3 and the expected totals or empty state. Failed requests show a safe error. |
| S3-F09-T08 | AC06 | For SYS-04, seed a documented local dataset of up to 1,000 orders across dates, owners, and states. Warm the app and DB. Measure 100 sequential requests per selected operation using authenticated sessions and a fixed scenario set covering default lists, filtered lists, and representative report periods. Record commit, environment, fixture distribution, scenario inputs, warm-up, success/failure counts, and elapsed times. | Report the measured per-operation p95 and the share of successful requests within 2 seconds, excluding cold start. Compare with the SRS threshold of at least 95% within 2 seconds and record any errors or failed threshold. |

## 6. Deliverable 2 milestone and F-08 coordination

**Smallest meaningful implementation milestone.** Deliver the owner-scoped `status` filter and exact full-`orderId` search end to end on **My orders**. Use the Customer cases from S3-F09-T01, S3-F09-T02, and S3-F09-T04 for RED-to-GREEN API coverage. Use the status and ID filter checks from S3-F09-T07 to demonstrate Apply, Clear, and empty results. Verify unchanged unfiltered retrieval and order detail. This slice is independently demonstrable while F-08 is in progress. Customer date filters, operator filters, the sales report, and NFR-05 measurement remain for Sprint 3.

F-09 reads F-07's saved `COMPLETED` state and F-08's saved `PAID_SIMULATED` state. Checkout supplies price snapshots; F-06 cancelled orders are excluded. Report and filter development can use isolated seeded states. Record passing evidence for the real mark-paid-to-report flow after F-08 merges. F-09 requires no schema migration, backfill, or payment changes.

| Potential overlap with F-08 | Coordination |
|---|---|
| `backend/src/routes/operatorRoutes.ts` and `backend/src/tests/operatorOrders.test.ts` | F-08 owns the payment write and its tests. F-09 extends the list read and adds reporting coverage. Sync with the integrated F-08 baseline before editing these shared files. |
| `frontend/src/features/operator/OperatorOrdersPage.tsx` and `operatorApi.ts` | Extend the read client and add filters and the report section around the existing payment controls. Preserve the applied query when reconciling a saved payment. |
| `frontend/src/features/orders/OrderPages.tsx` and `ordersApi.ts` | Limit the first slice to Customer list controls and the list fetch. Preserve the order detail and payment fields. |

## 7. Finalized team decisions

- Use `Order.createdAt` for reports. Both Bangkok-local dates are inclusive, and the exclusive UTC upper bound comes from the next local midnight. The maximum window is 366 calendar days.
- Use exact full UUIDs for order search. Keep Customer queries owner-scoped and Operator queries protected by the Operator role.
- Require both saved states for sales qualification. Sum saved order lines and group products by stable `menuItemId`. Show current menu names as display labels.
