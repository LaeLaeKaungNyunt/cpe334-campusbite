# CampusBite — Lab 6 UAT Test Data, Preparation and Cleanup

**Author:** 67070503484 (Duo L). **Reviewer:** 67070503481.  
**State:** DRAFT; verify the currently deployed release and data before independent testing.  
**Base URL:** https://campusbite-kpxq63g5va-as.a.run.app

## 1. Safe synthetic accounts

| Label | Email | Application role | Credential handoff |
|---|---|---|---|
| Customer A | `customer1@campusbite.test` | CUSTOMER | Product Team provides password privately |
| Customer B | `customer2@campusbite.test` | CUSTOMER | Product Team provides password privately |
| Operator | `operator@campusbite.test` | OPERATOR | Product Team provides password privately |

Never print passwords, session cookies, SEED_DEMO_PASSWORD, OAuth tokens or database credentials in documentation/screenshots. Use separate private/incognito browser sessions for Customer A, Customer B and Operator where helpful.

## 2. Original seed fixtures — not current live stock

| Product | Stable seed menu ID | Price | Initially seeded stock | Active? | UI expectation |
|---|---|---:|---:|---|---|
| Iced Latte | `a1111111-1111-1111-1111-111111111111` | ฿65.00 | 10 | Yes | Purchase allowed if stock > 0 |
| Chicken Sandwich | `a2222222-2222-2222-2222-222222222222` | ฿85.00 | 5 | Yes | Purchase allowed if stock > 0 |
| Croissant | `a3333333-3333-3333-3333-333333333333` | ฿45.00 | 0 | Yes | Sold Out; cannot purchase |
| Seasonal Matcha Latte | `a4444444-4444-4444-4444-444444444444` | ฿75.00 | 15 | No | Hidden from public menu |

The Prisma seed script uses **create-if-missing**. It preserves existing users, orders, prices and **current stock**. It is therefore NOT a reset mechanism. Some live stock may already be lower because of Lab 5 or other tests. Confirm live response at `/api/v1/menu-items` before UAT.

## 3. Preconditions, version and non-destructive data check

1. Product Team and partner agree the exact tested **main commit**, **Cloud Run revision**, URL, test dates and who may deploy during the session. Record these in `uat-handoff.md`.
2. Confirm `/api/ready` returns HTTP 200 and JSON `status: ready`, `db: connected`.
3. Open `/api/v1/menu-items` and record Iced Latte and Chicken Sandwich **current** stock; do not assume original seed quantities.
4. Confirm available Iced Latte >= 2, Chicken Sandwich >= 1 before UAT-CB-03. If not, do NOT secretly change stock or create a fake PASS; coordinate an isolated data fixture or mark BLOCKED with reason.
5. Log in with the appropriate seeded role; share passwords only in approved private channel.
6. Run cases in sequence: CB-01, CB-02, CB-03, CB-04, CB-05, CB-06, CB-07, CB-08. CB-03 creates the single `TEST_ORDER_ID` used by CB-05–08.
7. Record any planned deployment or restart and inform the partner in advance; acceptance applies only to the exact tested revision.

## 4. Planned valid-order test data and calculation

- Customer A places one order: **Iced Latte ×2 + Chicken Sandwich ×1**.
- Latte subtotal: 2 × 6500 satang = 13000 satang = ฿130.00.
- Sandwich subtotal: 1 × 8500 satang = 8500 satang = ฿85.00.
- **Expected authoritative order total: 21500 satang = ฿215.00.**
- Initial order status: `PENDING`; initial payment status: `UNPAID`.
- After success, expected stock change from **pretest live values**: Latte −2, Sandwich −1. Example: if live stock was 7 and 3, expect 5 and 2 afterwards (not necessarily 8 and 4).
- Record generated `TEST_ORDER_ID`, actual creation timestamp, and item/total snapshots. Do not use a previously accepted order for operator-acceptance testing.

## 5. Negative test data (no successful order expected)

Use the exact rejected probes described in `uat-menu-orders.md` UAT-CB-04:

- Iced Latte quantity **0** → 400 `INVALID_ORDER`.
- Add a forged `totalSatang` field to an otherwise valid order → 400 `INVALID_ORDER`.
- Mixed request for one Iced Latte + one sold-out Croissant → 409 `OUT_OF_STOCK`.

Expected **post-rejection** invariants: Customer A order count unchanged and all relevant stock unchanged. The tests must be run in a synthetic UAT session. If an attempted forbidden mutation succeeds, stop further dependent tests, preserve evidence and notify Product Team promptly.

## 6. Ownership and operator state test

- From Customer A, save and note `TEST_ORDER_ID` status `PENDING`.
- Customer B and a clean anonymous browser each attempt to open this order; expected backend 404 and 401 respectively, with no protected order content.
- Customer A attempts the operator list and acceptance endpoint; both must reject with 403, and the order must stay `PENDING`.
- Operator views the same pending order and accepts it once. The first valid acceptance succeeds; a second PATCH request is rejected with 409; Customer A subsequently sees `ACCEPTED`.
- Only `PENDING → ACCEPTED` is within Sprint 1. No cancellations, completion, payment changes or stock edits should be attempted.

## 7. Cleanup and repeat-test policy

- **Do not** run destructive SQL, truncate/reset Cloud SQL, delete users/orders or change production stock without a Product Team-approved fixture plan. Do not run `npm run db:seed` expecting a reset.
- Test orders can remain in the shared database as clearly identified **synthetic UAT records**. Maintain an order-ID log and note that stock was consumed; do not misreport it as restored.
- Browser-only cart cleanup: remove items using menu/cart `−` controls, or use a new private session. This does not restore stock already reserved by successful orders.
- Do not repeatedly press **Place order** on refresh; additional successful requests can produce additional orders and reduce stock again.
- Avoid testing the AC-12 one-unit concurrency boundary or AC-08 empty-menu fixture on shared Cloud SQL unless a safe isolated setup is expressly agreed. State such controlled-test dependencies clearly in the report.
- When a fix is deployed, record the corrected commit and Cloud Run revision, notify partner, and repeat affected tests on that revision. A successful test on the old revision is not evidence for the new one.

## 8. Worksheet — completed by independent testers after execution

| Recorded item | Before test | After test | Tester / time | Evidence |
|---|---|---|---|---|
| Main commit / Cloud Run revision | | | | |
| Iced Latte stock | | | | |
| Chicken Sandwich stock | | | | |
| Customer A total order count | | | | |
| UAT order ID / Customer A | N/A | | | |
| UAT order status | N/A | PENDING then ACCEPTED if tests pass | | |
| Partner notification / any cleanup decision | | | | |

**No actual results should be filled in before live independent execution.**
