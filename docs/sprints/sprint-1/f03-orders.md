# F-03 — Customer Order Creation and Retrieval Contract

**Contract version:** v0.1 proposed, 7 November 2026  
**GitHub Issue:** #3  
**Lead / reviewer:** 67070503484 / 67070503481  
**Requirements:** FR-03, FR-04, BR-01–BR-07, NFR-01, NFR-02, NFR-04  
**Dependencies:** F-01 sessions, F-02 menu, Order/OrderItem schema  
**Status:** Designed before implementation; not yet verified

## Feature-level SDS and workflow

A logged-in Customer chooses one or more published menu items and positive integer quantities. The cart displays an estimate, but the server re-reads current menu prices and stock. In one atomic database transaction the server validates all lines, conditionally reserves stock, stores `Order` plus `OrderItem` price snapshots, and returns the authoritative total and order ID. An order begins `PENDING` and `UNPAID`. Customer order list/detail endpoints return only orders owned by the authenticated Customer.

The server rejects an empty cart, repeated product ID, invalid quantity, inactive/nonexistent product, sold-out or insufficient stock, and does not commit partial changes. During simultaneous competing requests for the final unit, no more stock can be reserved than exists.

## API specification

| Method/path | Request | Success | Failure |
|---|---|---|---|
| `POST /api/v1/orders` | `{ "items": [{ "menuItemId": "uuid", "quantity": 2 }] }` | `201`, `{ "data": { "id": "...", "status": "PENDING", "totalSatang": 13000, "items": [...] } }` | `400` malformed/empty/duplicate/invalid quantity; `401` no session; `403` wrong role; `409` unavailable/insufficient stock |
| `GET /api/v1/orders` | Customer session | `200`, list of only own orders (newest first) | `401`, `403` |
| `GET /api/v1/orders/:id` | Customer session | `200`, saved owned order, item snapshots and status | `401`, `403`, `404` absent or another customer's ID |

Never accept client-supplied `customerId`, role, `unitPriceSatang`, `totalSatang` or `status` as authoritative. Validate shape and quantity on the server. Return stable safe error codes (`INVALID_ORDER`, `OUT_OF_STOCK`, `ORDER_NOT_FOUND`) with no internal stack trace. `409` for unavailable stock is a chosen contract convention.

## UI and data specification

- **UI:** `/cart` quantity inputs and estimated total; submit shows pending/disabled state, then success navigation to `/orders/:id`. Display validation and stock conflict feedback. `/orders` shows own persisted orders; `/orders/:id` shows saved item/quantity/snapshot price/total/status. Loading, empty, and error states apply.
- **Data:** `Order(id,customerId,status,paymentStatus,totalSatang,createdAt,updatedAt)` and `OrderItem(id,orderId,menuItemId,quantity,unitPriceSatang,lineTotalSatang)` with FK relationships, positive quantity, nonnegative price, unique `(orderId,menuItemId)`, customer index.
- **Atomicity:** Begin transaction; for items in stable ID order, use a conditional stock decrement (`stockQuantity >= quantity`, active item). Check affected row count; rollback everything on one failure. Calculate using integer satang and write order/items within the same transaction. Handle conflict/retry safely when two requests compete. Do not leave stock negative.
- **Persistence:** After a successful POST, a fresh GET and a local application restart must retrieve the same order and price snapshots.

## Acceptance criteria and STS

| AC | Observable criterion | Test ID / level | Preconditions, action, expected outcome |
|---|---|---|---|
| AC-09 | Valid multi-item order is persisted. | TEST-09 / API+DB + selected E2E | Auth Customer, stocked menu; POST two items; verify `201`, `PENDING`, rows in Order/OrderItem and UI success. |
| AC-10 | Authoritative total and historical unit prices are preserved. | TEST-10 / unit+API+DB | Send manipulated total/price; server ignores or rejects it by documented policy, calculates DB prices; later menu-price edit does not alter stored order. |
| AC-11 | Invalid orders fail without partial state change. | TEST-11 / API+DB | Empty/duplicate/zero/negative/fractional qty, inactive, nonexistent or insufficient item; expect `400`/`409`, no new order and no stock loss. |
| AC-12 | Atomic reservations prevent overselling. | TEST-12 / API+DB concurrency | One unit available; fire two competing order POSTs; at most one succeeds and final stock remains nonnegative. |
| AC-13 | Customer retrieves correct persisted own order. | TEST-13 / API+DB | Create order; GET list and detail (including after application restart check); verify items, total, status and owner. |
| AC-14 | Another Customer cannot read private order details. | TEST-14 / API+DB | Customer A order; Customer B GET its ID; return `404` with no protected data; anonymous `401`. |

## Important error cases

No partial success is allowed. If any line fails, return an actionable safe error and leave all other stock and order records unchanged. Repeated submissions are separate orders in Sprint 1; duplicate-click prevention is a UI safeguard, not a claim of network-level idempotency. Cross-owner access must be checked using the authenticated session, not a client-provided ID.

## Definition of Done

- [ ] Contract/STS committed before implementation; relevant failing test recorded before rule implementation.
- [ ] Order transaction, schema constraints, UI and owned retrieval work.
- [ ] TEST-09–TEST-14 executed on a real test database; failed/skipped results disclosed.
- [ ] One end-to-end customer ordering journey verified.
- [ ] Reviewer checks stock, price authority, ownership, transaction boundaries and assertions.
- [ ] PR merged into staging after review/integration; evidence linked to tested commit.

