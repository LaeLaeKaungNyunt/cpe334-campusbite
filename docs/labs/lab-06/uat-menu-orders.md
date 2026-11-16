# CampusBite Lab 6 — F-02 Menu and F-03 Customer Orders UAT Cases

**Author/feature owner:** 67070503484 (Duo L). **Reviewer:** 67070503481.  
**State:** DRAFT EXPECTED TEST CASES, **NOT EXECUTED**. Actual-result fields must be completed by the independent UAT Team.  
**Base URL:** https://campusbite-kpxq63g5va-as.a.run.app  
**Tested commit/revision:** [CONFIRM AT HANDOFF]  
**Accounts:** Customer A (`customer1@campusbite.test`); Customer B (`customer2@campusbite.test`). Passwords privately shared.  
**Execution:** CB-03 creates `TEST_ORDER_ID` for later CB-05, CB-06, CB-07, CB-08. Do not repeat successful orders unnecessarily.

For each case, independent testers must fill **Tester / Date-time UTC+07 / Version / Actual observations / Result PASS-FAIL-BLOCKED / Evidence ID**.

## UAT-CB-02 — Active menu, correct prices and sold-out behavior

- **Requirement / AC:** FR-02, AC-06, AC-07, AC-08 (F-02).
- **Category / purpose:** Menu read and business-rule/availability boundary; additional controlled UI states noted below.
- **Role:** Anonymous visitor or Customer A; no login needed to read menu.
- **Preconditions / input:** Product URL and database responsive; seed records exist. Reference seed: Iced Latte 6500 satang (฿65.00; initial stock 10), Chicken Sandwich 8500 (฿85.00; initial stock 5), Croissant 4500 (฿45.00; initial stock 0, active), Seasonal Matcha Latte 7500 (inactive).
- **Steps:**
  1. Open `/menu` in a clean browser session. Observe the loading state if visible.
  2. Confirm Iced Latte, Chicken Sandwich and Croissant appear with THB prices ฿65.00, ฿85.00, ฿45.00 respectively (unless the Product Team has documented an approved price change in the tested release).
  3. Confirm Croissant displays **Sold Out**, and its selection button is disabled.
  4. Confirm inactive **Seasonal Matcha Latte** is absent.
  5. Open `/api/v1/menu-items` in a separate tab. Confirm the returned `data` includes active items only, shows live `stockQuantity` and `isAvailable`, and records Croissant as unavailable.
  6. Capture the **actual current** stock of Iced Latte and Chicken Sandwich; they may be lower than their original seed quantities after previous test orders.
- **Expected:** Database-backed active items and correct prices appear. A stock-zero active item is visible but cannot be added to cart. Inactive item is hidden. Public read returns HTTP 200. Live stock should be recorded, not assumed to equal initial seed values.
- **AC-08 special controlled checks:** The UI contains loading, empty-menu and request-error states. If approved, test a failing menu request using browser request blocking on `/api/v1/menu-items`, record safe error with **Try again**, then unblock and retry; do not shut down the shared database. Empty-menu state needs an isolated fixture with zero active items, not destructive changes to the shared release. Clearly label any unperformed controlled state checks rather than marking them PASS.
- **Evidence:** Menu cards/prices, sold-out disabled button, inactive item not present, API response/current stock, any controlled error/retry checks actually executed.
- **Actual result:** [INDEPENDENT TESTER TO FILL]
- **Outcome/evidence:** [PASS/FAIL/BLOCKED; EVIDENCE ID]

## UAT-CB-03 — Place a valid multi-item order with server-calculated total

- **Requirement / AC:** FR-03, BR-04, AC-09, AC-10 (F-03).
- **Category / purpose:** Normal end-to-end customer purchase request, saved item snapshots, authoritative amount.
- **Role:** Customer A.
- **Preconditions / input:** Customer A can log in. Confirm current Iced Latte stock **at least 2** and Chicken Sandwich stock **at least 1**; if unavailable, stop and ask Product Team for controlled UAT fixture. Empty cart at start. Proposed inputs: Iced Latte ×2, Chicken Sandwich ×1.
- **Steps:**
  1. Record current stock for both items at `/api/v1/menu-items`; also note Customer A's current count of saved orders at `/orders`.
  2. Sign in as Customer A via `/login`.
  3. From `/menu`, use `+` controls to choose **Iced Latte ×2** and **Chicken Sandwich ×1**; click **Review your order** or navigate to `/cart`.
  4. Check cart lines and estimated amounts before submitting: Iced Latte 2 × ฿65.00 = ฿130.00; Chicken Sandwich 1 × ฿85.00 = ฿85.00; total ฿215.00.
  5. Click **Place order exactly once**. Capture the success confirmation and the generated **TEST_ORDER_ID**. Select **View order details**.
  6. Verify saved order lines, stored total, `PENDING` order status, `UNPAID` payment status, and Customer A ownership. Confirm the current stock decreased by 2 lattes and 1 sandwich compared with Step 1.
- **Expected:** New saved order exists with the specified two distinct items, quantities and price snapshots, **฿215.00** total from database prices, initial `PENDING` and `UNPAID`; only Customer A owns it. No client-supplied total is needed. Exact historic prices must agree with the tested contract/seed; if they differ without an agreed change, record a finding rather than silently changing the expected result.
- **Evidence:** Before/after menu stock, cart contents, successful order confirmation with ID, saved detail with status/total and time.
- **Actual result / TEST_ORDER_ID:** [INDEPENDENT TESTER TO FILL]
- **Outcome/evidence:** [PASS/FAIL/BLOCKED; EVIDENCE ID]

## UAT-CB-04 — Invalid order and stock conflict leave no partial change

- **Requirement / AC:** BR-01, BR-02, BR-03, BR-04, BR-06; AC-10, AC-11 (F-03).
- **Category / purpose:** Business-rule and boundary rejection; database must not create a partial order or reserve other stock on a failed cart.
- **Role:** Customer A.
- **Preconditions / input:** Customer A session active. Note the present Customer A order count and **current** Iced Latte stock from `/api/v1/menu-items`. Croissant is active, stock 0. These probes are intentionally invalid and should never create an order.
- **Steps:**
  1. From a CampusBite tab signed in as Customer A, open browser Developer Tools → Console. Define this local helper (does not expose a password):

     ```javascript
     async function probeOrder(body) {
       const r = await fetch('/api/v1/orders', {
         method: 'POST', credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(body)
       });
       console.log('HTTP', r.status, await r.json());
     }
     ```

  2. Submit a zero-quantity request (must reject):

     ```javascript
     await probeOrder({items:[{menuItemId:'a1111111-1111-1111-1111-111111111111',quantity:0}]});
     ```

  3. Submit a forged client total (must reject; authoritative fields are not accepted):

     ```javascript
     await probeOrder({items:[{menuItemId:'a1111111-1111-1111-1111-111111111111',quantity:1}], totalSatang:1});
     ```

  4. Submit a mixed cart that includes an available item followed by a sold-out item (whole transaction must roll back):

     ```javascript
     await probeOrder({items:[
       {menuItemId:'a1111111-1111-1111-1111-111111111111',quantity:1},
       {menuItemId:'a3333333-3333-3333-3333-333333333333',quantity:1}
     ]});
     ```

  5. Refresh Customer A's `/orders` and `/api/v1/menu-items`. Compare own order count and Iced Latte stock with pre-test observations. Verify no new order was created and no stock disappeared.
- **Expected:** Step 2 **HTTP 400 `INVALID_ORDER`**; Step 3 **HTTP 400 `INVALID_ORDER`**; Step 4 **HTTP 409 `OUT_OF_STOCK`**. After all three rejected operations, no new order exists and Iced Latte stock is unchanged. No internal details or other customers' data disclosed.
- **Evidence:** Request/response statuses and safe errors, before/after order count and stock, tested commit/revision. Capture Console or Network screenshots without cookies or secrets.
- **Actual result:** [INDEPENDENT TESTER TO FILL]
- **Outcome/evidence:** [PASS/FAIL/BLOCKED; EVIDENCE ID]

## UAT-CB-05 — Own order history, detail and persistence after re-entry

- **Requirement / AC:** FR-04, NFR-04, AC-13 (F-03).
- **Category / purpose:** Saved history/state retrieval using a fresh request and session; optional coordinated restart check for NFR-04.
- **Role:** Customer A.
- **Preconditions / input:** UAT-CB-03 created `TEST_ORDER_ID`. Execute before UAT-CB-08 changes status, unless recorded otherwise.
- **Steps:**
  1. As Customer A, visit `/orders`; locate `TEST_ORDER_ID` (list may display a shortened ID) and open its details.
  2. Verify original item snapshots, quantities, total, status `PENDING`, and payment `UNPAID`.
  3. Reload the page; confirm the same `TEST_ORDER_ID` and stored values return from the backend.
  4. Sign out. In a new browser session, sign in as Customer A and revisit `/orders/TEST_ORDER_ID`.
  5. Confirm the same saved record and that only Customer A's history is displayed.
  6. **If Product Team schedules a safe restart/redeployment:** save evidence before; Product Team performs it; UAT Team independently refreshes *after* service recovery and verifies same order ID/details. Record both actual deployed revisions and timestamps. Never restart Cloud Run or Cloud SQL without explicit coordination.
- **Expected:** Saved order, unit-price snapshots, total and status persist across page reload and customer re-login. A coordinated restart/redeployment, if performed, must not remove the record. For a missing restart check, report that limitation explicitly; do not claim it happened.
- **Evidence:** History, detail, new-session detail, and any separately coordinated before/after restart evidence.
- **Actual result:** [INDEPENDENT TESTER TO FILL]
- **Outcome/evidence:** [PASS/FAIL/BLOCKED; EVIDENCE ID]

## Independent tester execution record (to complete after testing)

| Case ID | Tester full name / team | Actual date/time (+07) | Tested commit / revision | Inputs / stock / TEST_ORDER_ID | Actual observations | PASS/FAIL/BLOCKED | Evidence ID |
|---|---|---|---|---|---|---|---|
| UAT-CB-02 | | | | | | | |
| UAT-CB-03 | | | | | | | |
| UAT-CB-04 | | | | | | | |
| UAT-CB-05 | | | | | | | |

**Additional important coverage to coordinate:** AC-12 requires simultaneous requests against a controlled **one-unit** fixture and independent observation or a separate test run; do not force this against shared Cloud SQL stock. AC-08 empty/error states require controlled setup. Existing automation can provide supporting evidence, not substitute for partner testing. No execution or result is claimed by this document.
