# F-04 — Operator Order Management Contract

**Contract version:** v0.1 proposed, 7 November 2026  
**GitHub Issue:** #4  
**Lead / reviewer:** 67070503481 / 67070503484  
**Requirements:** FR-05, BR-08, NFR-01, NFR-04  
**Dependencies:** F-01 authenticated role, F-03 persisted orders  
**Status:** Designed before implementation; not yet verified

## Feature-level SDS and behavior

An authenticated `OPERATOR` can inspect orders in the single café and accept a `PENDING` order. Acceptance is a server-enforced state transition `PENDING → ACCEPTED`, persisted once. A repeated acceptance or a transition from another state must return a conflict without modifying the record. Customers and anonymous visitors cannot use operator operations even through direct API calls.

## API specification

| Method/path | Request | Success | Failure |
|---|---|---|---|
| `GET /api/v1/operator/orders` | Operator session | `200`, ordered list of café orders with customer-safe identifying fields, items, totals and statuses | `401` anonymous, `403` wrong role |
| `PATCH /api/v1/operator/orders/:id/accept` | Operator session, no client status override | `200`, saved order ID and `ACCEPTED` status | `401`, `403`, `404` nonexistent, `409` not pending |

The backend must update conditionally where `status=PENDING` and check affected rows. This prevents two requests from both recording a valid transition. No acceptance by customer role; no client-supplied arbitrary status. Future fulfillment transitions are separate Sprint 2 contracts.

## UI and data specification

- **UI:** `/operator/orders` shows incoming order cards/table with ID, date, customer identity appropriate for staff, items, totals and status; `Accept` button only for pending orders. Show loading, empty, errors, and confirmation. Role-aware navigation is supplemental to server checks.
- **Data:** Uses existing `Order`, `OrderItem`, `User`. No new entity needed in Sprint 1; status is stored in `Order`. Later sprints may add explicit audit/status history, which must be designed before implementation.
- **Permissions:** Only `OPERATOR` can read all café orders or accept; Customer may inspect their own order via F-03 but not this endpoint.

## Acceptance criteria and STS

| AC | Observable criterion | Test ID / level | Preconditions, action, expected outcome |
|---|---|---|---|
| AC-15 | Operator can retrieve incoming orders. | TEST-15 / API+DB + selected UI | Seed two Customer orders; Operator GET; verify list/details and dashboard display. |
| AC-16 | Operator accepts a pending order and persists status. | TEST-16 / API+DB | Order initially `PENDING`; PATCH; verify `200`, database `ACCEPTED`. |
| AC-17 | Invalid/repeated transitions do not alter an order. | TEST-17 / unit+API+DB | Accept once, repeat; expect `409` and unchanged status; unsupported transition rejected. |
| AC-18 | Customer/anonymous access is denied. | TEST-18 / API+DB | No session → `401`; Customer session → `403` for list and acceptance; no status change. |
| AC-19 | Customer later reads the accepted persisted status. | TEST-19 / API+DB | Operator accepts; owning Customer GET via F-03; verify `ACCEPTED` even after new request/restart. |

## Definition of Done

- [ ] Contract/STS saved before code and meaningful state rule test shown failing before implementation.
- [ ] Protected API and operator UI implemented; persisted transition checked.
- [ ] TEST-15–TEST-19 executed; actual results mapped to criteria.
- [ ] Reviewer inspects role checks, status update condition and negative tests.
- [ ] Reviewed feature PR merged to staging; integrated release checks and evidence updated.

