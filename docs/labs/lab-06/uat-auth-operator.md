# CampusBite Lab 6 — F-01 Authentication and F-04 Operator UAT Cases

**Author/feature owner:** 67070503481 (Duo L). **Reviewer:** 67070503484.  
**State:** DRAFT EXPECTED TEST CASES, **NOT EXECUTED**. Actual-result fields must be completed by the independent UAT Team.  
**Base URL:** https://campusbite-kpxq63g5va-as.a.run.app  
**Tested commit/revision:** [CONFIRM AT HANDOFF]  
**Accounts:** Customer A (`customer1@campusbite.test`), Customer B (`customer2@campusbite.test`), Operator (`operator@campusbite.test`). Passwords shared privately.

For each case, independent testers must complete **Tester / Date-time UTC+07 / Version / Actual observations / Result PASS-FAIL-BLOCKED / Evidence ID**.

## UAT-CB-01 — Valid login, wrong credentials and logout

- **Requirement / AC:** FR-01, AC-01, AC-02, AC-03, AC-05 (F-01).
- **Category / purpose:** Authentication lifecycle, including negative login and revoked session.
- **Role:** Anonymous visitor, Customer A, Operator (separate sessions).
- **Preconditions / input:** Product URL reachable; Customer A and Operator have working privately provided seeded credentials; a deliberately incorrect password for a seeded account (not a real password).
- **Steps:**
  1. Open a new private/incognito window at `/login`, enter Customer A's valid credentials, and click **Sign In**.
  2. Record the displayed email and `CUSTOMER` role on the home page. In the same browser session visit `/api/v1/auth/me` and confirm the API returns identity/role without password/hash or raw session token.
  3. Return home, click **Sign Out**, then open `/api/v1/auth/me` again in the same browser session.
  4. Return to `/login`, try Customer A's email with an intentionally wrong password. Do not screenshot the password field contents. Check that authentication is not established.
  5. In another clean private session, use the Operator credentials and verify the displayed role is `OPERATOR` and `/api/v1/auth/me` matches.
- **Expected:** Correct credentials log in and show the correct role (200 on `/me`). Logout revokes the old session; `/me` returns HTTP 401. Bad credentials are rejected with generic messaging and produce no authenticated session. Neither user is shown another role's identity.
- **Evidence to capture:** Customer role banner; post-logout `/me` 401 and safe error; wrong-password rejection; Operator role banner. Do not capture actual passwords/cookies.
- **Actual result:** [INDEPENDENT TESTER TO FILL]
- **Outcome/evidence:** [PASS/FAIL/BLOCKED; EVIDENCE ID]

## UAT-CB-06 — Other-customer and anonymous order-detail denial

- **Requirement / AC:** BR-07, NFR-01, AC-03, AC-14 (F-01/F-03).
- **Category / purpose:** Forbidden ownership and anonymous access; verify private details are not disclosed.
- **Role:** Customer A (owner), Customer B (non-owner), anonymous visitor.
- **Preconditions / input:** UAT-CB-03 has created and recorded Customer A's `TEST_ORDER_ID`; Customer A has verified its contents.
- **Steps:**
  1. Record Customer A's order status/total from `/orders/TEST_ORDER_ID` while signed in as Customer A.
  2. Sign in as Customer B in a **different** private browser session and directly visit `/orders/TEST_ORDER_ID`.
  3. Observe the rejection. Open `/api/v1/orders/TEST_ORDER_ID` in that same Customer B session to see the server response and HTTP status (use browser Network tab if needed).
  4. Open a clean *anonymous* private session and visit `/orders/TEST_ORDER_ID` and `/api/v1/orders/TEST_ORDER_ID`.
  5. Return as Customer A; confirm own order details still exist with original item quantities/total/status.
- **Expected:** Customer B: protected API returns **404 `ORDER_NOT_FOUND`**, with no order items, customer identity or prices. Anonymous: protected API returns **401 `UNAUTHORIZED`**, with no private order data. Customer A still has the original order unchanged. The UI may show a friendly denial, but the backend response is the authorization evidence.
- **Evidence to capture:** Owner's permitted order detail, Customer B's denial plus URL/HTTP status, anonymous denial plus URL/HTTP status, and unchanged owner record.
- **Actual result:** [INDEPENDENT TESTER TO FILL]
- **Outcome/evidence:** [PASS/FAIL/BLOCKED; EVIDENCE ID]

## UAT-CB-07 — Customer forbidden from operator list and acceptance

- **Requirement / AC:** BR-08, NFR-01, AC-04, AC-18 (F-01/F-04).
- **Category / purpose:** Wrong-role restriction and verification that rejected operations do not mutate status.
- **Role:** Customer A; optionally anonymous visitor for the operator list.
- **Preconditions / input:** A known `TEST_ORDER_ID` from UAT-CB-03 is still `PENDING`, not yet accepted in UAT-CB-08. Customer A is signed in.
- **Steps:**
  1. As Customer A, directly visit `/operator/orders`. Record the visible role-denial message.
  2. In the same Customer session, visit `/api/v1/operator/orders` and observe **HTTP 403** with no operator order list disclosed.
  3. To verify **operation-level authorization**, open browser Developer Tools → Console on the CampusBite origin and run the following with `TEST_ORDER_ID` replaced by the actual ID (do not paste raw credentials):

     ```javascript
     fetch('/api/v1/operator/orders/TEST_ORDER_ID/accept', {
       method: 'PATCH', credentials: 'include'
     }).then(async r => console.log('HTTP', r.status, await r.json()));
     ```

  4. Verify HTTP 403. As Customer A, open `/orders/TEST_ORDER_ID` again; confirm it remains `PENDING` and retains the original total/items.
  5. Optional anonymous check: from a new private session, open `/api/v1/operator/orders` and verify HTTP 401.
- **Expected:** Customer A's UI displays a forbidden/operator-only message; backend list and acceptance requests return **403** and disclose no protected operator data. The rejected acceptance **does not** change the pending order. Anonymous list access returns **401**.
- **Evidence to capture:** Wrong-role page, API list rejection, Console/Network status 403 for acceptance, and still-`PENDING` order details.
- **Actual result:** [INDEPENDENT TESTER TO FILL]
- **Outcome/evidence:** [PASS/FAIL/BLOCKED; EVIDENCE ID]

## UAT-CB-08 — Operator views orders, accepts once and persists status

- **Requirement / AC:** FR-05, BR-08, AC-15, AC-16, AC-17, AC-19 (F-04).
- **Category / purpose:** Valid domain action, rejection of repeated transition, and state visibility to Customer.
- **Role:** Operator, then Customer A.
- **Preconditions / input:** `TEST_ORDER_ID` from UAT-CB-03 remains `PENDING`. Run this **last**, since accepting changes its status. Operator credentials supplied privately.
- **Steps:**
  1. Sign out of Customer A, sign in as Operator in a separate session, and open `/operator/orders`.
  2. Select the specific `TEST_ORDER_ID`; verify its `PENDING` status, two Iced Lattes and one Chicken Sandwich, and the saved total (normally ฿215.00 under seed prices).
  3. Click **Accept** for this specific order **once**. Record the confirmation and the new status.
  4. Refresh the operator page; verify the order remains `ACCEPTED`, with no second enabled Accept action.
  5. To test server-enforced repeat rejection (not just a hidden button), in the Operator session open browser Developer Tools → Console and run:

     ```javascript
     fetch('/api/v1/operator/orders/TEST_ORDER_ID/accept', {
       method: 'PATCH', credentials: 'include'
     }).then(async r => console.log('HTTP', r.status, await r.json()));
     ```

  6. Verify repeat acceptance returns **HTTP 409**, then refresh; the stored state remains `ACCEPTED`.
  7. As Customer A, revisit `/orders/TEST_ORDER_ID` from a customer session and verify the saved status is `ACCEPTED`, while items/total and `UNPAID` payment state remain unchanged.
- **Expected:** Operator sees the pending café order and can transition it `PENDING → ACCEPTED` once. Repeat acceptance is rejected with **409** and does not alter persisted state. Customer A sees `ACCEPTED` after a fresh request. No payment or later-sprint fulfillment transition is performed.
- **Evidence to capture:** Operator before/after, successful acceptance, repeat 409 and unchanged status, customer detail after acceptance.
- **Actual result:** [INDEPENDENT TESTER TO FILL]
- **Outcome/evidence:** [PASS/FAIL/BLOCKED; EVIDENCE ID]

## Independent tester execution record (to complete after testing)

| Case ID | Tester full name / team | Actual date/time (+07) | Tested commit / revision | Inputs / TEST_ORDER_ID | Actual observations | PASS/FAIL/BLOCKED | Evidence ID |
|---|---|---|---|---|---|---|---|
| UAT-CB-01 | | | | | | | |
| UAT-CB-06 | | | | | | | |
| UAT-CB-07 | | | | | | | |
| UAT-CB-08 | | | | | | | |

**Do not prefill actual results, tester names, timestamps or acceptance.**
