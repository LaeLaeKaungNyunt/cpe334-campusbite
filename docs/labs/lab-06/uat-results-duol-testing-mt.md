# CPE334 Lab 6 — Independent UAT Results: Duo L Tests Team MT's Product

**Status:** EXECUTED — BB-UAT-06 is BLOCKED pending exact authorization-error verification; BB-EX-03 is PASS; final independent acceptance remains PENDING.
**Independent UAT Team:** Duo L — Lae Lae Kaung Nyunt (67070503481); Naing Zay Linn (67070503484).  
**Product Team:** MT — Moe Htet Aung (67070503482); Thu Thu Wai (67070503486).  
**Important:** This file documents independent tests conducted *by Duo L* on MT's BorrowBase release. It does not describe CampusBite UAT.

## 1. Product Team MT handoff

| Field | Value |
|---|---|
| Product name and theme | BorrowBase — Equipment Inventory and Borrowing System (Theme 2) |
| MT repository URL | https://github.com/thu734/Inventory-and-Borrowing-System |
| MT deployed application URL | https://borrowbase-fniy3qjctq-as.a.run.app |
| Sprint 1 included feature/AC contract | F-01 Authentication and Authorization (FR-01); F-02 Equipment Catalog (FR-02); F-03 Borrowing Requests and Own Records (FR-03–04); F-04 Custodian Checkout (FR-05–06). Key rules: availability requires SERVICEABLE and no active Loan (BR-02); pending requests do not reserve equipment, but same-borrower/asset duplicates are rejected (BR-03); checkout is Custodian-only and creates at most one active Loan per asset (BR-04–06); a competing Borrower's request remains PENDING (BR-10); protected records are owner-scoped (BR-06/NFR-01); protected POSTs require authenticated cookies, exact Origin and CSRF (NFR-02); saved records persist (NFR-03); rejected operations leave no partial state (NFR-08). Returns, due dates/overdue processing, inventory editing, search/filtering, completed-loan history and reporting are outside Sprint 1. Acceptance sources: SRS and F-01–F-04 contracts at the supplied baseline commit. |
| Exact tested commit/tag | Owner-reported source baseline: `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; image-to-source-commit association not independently verified. |
| Exact deployed version/revision | Owner-reported Cloud Run revision: `borrowbase-00007-jck`; serving version/release confirmation for this test session pending. Screenshots show release label “BorrowBase — Release B”. |
| Synthetic roles/account labels | UAT-USER-A / Borrower A — `borrower@example.test`; UAT-USER-B / Borrower B — `uat-borrower-b@example.test`; UAT-CUSTODIAN / Custodian — `custodian@example.test`. No passwords or session secrets included. |
| Test data setup / cleanup | Owner-prepared fixtures: ASSET-A `BB-LAP-UAT6-A-001` serviceable/available; ASSET-B `BB-RPI-001` maintenance/unavailable; ASSET-C `BB-LAP-001` serviceable/unavailable due to A's existing active Loan; ASSET-D `BB-LAP-UAT6-D-001` serviceable with pending D1 (A) and D2 (B); ASSET-E `BB-LAP-UAT6-E-001` serviceable with pending REQ-E (A) and a competing pending E request (B). Preserve all records, generated requests and Loans; do not reset, reseed, delete, reverse fulfillment or alter existing Loans. No return UI exists for resetting checked-out equipment. For reruns MT must supply replacement fixtures. |
| Handoff received at (Asia/Bangkok) | Handoff document states date 19 November 2026; receipt timestamp was not recorded. |
| Defect-reporting contact/method | Report reproducible failures at the repository GitHub Issues page and notify Team MT through the agreed handoff channel; if issue access is unavailable, send privately to the product contact. Include case/AC, tested version, fixture/preconditions, steps, expected/actual result, impact/severity and sanitized evidence. `defect-register.md` is an optional structured template; GitHub Issues are the authoritative disposition record. |
| Any planned independent-test session(s) | Owner handoff testing window was pending confirmation. Actual case execution date: November 21, 2026 (Asia/Bangkok); exact case execution times were not recorded unless an event time is separately noted below. Submission deadline extended by professor to November 29, 2026. |

## 2. Split MT's supplied cases between Duo L members

**Allocation:** Cases were executed in the handoff order 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08. Case dependencies and account context follow MT's A.5/A.6 instructions. Time means case execution time; it was not recorded. The tested revision is owner-reported; release confirmation remains pending.

| MT's original case ID | MT's specified requirement/AC | Assigned Duo L tester (3481 or 3484) | Expected-result reference / inputs | Sequence dependency | Actual tested version | Actual time (+07) | PASS / FAIL / BLOCKED | Evidence ID |
|---|---|---|---|---|---|---|---|---|
| BB-UAT-01 | FR-01; BR-06; AC-F01-01/04 — Borrower authentication and authorized access | 3481 | A account; borrower menus/own records; logout hides protected information; no borrowing state changes | First; sign back in as A for following cases | Owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; revision `borrowbase-00007-jck` (association/release confirmation pending) | 2026-11-21; time not recorded | PASS | BB-UAT-01-A.jpg; BB-UAT-01-B.png |
| BB-UAT-02 | FR-02/03; BR-01/02; AC-F02-01/02, AC-F03-02 — Equipment availability and serviceability | 3484 | A; ASSET-A `BB-LAP-UAT6-A-001`, B `BB-RPI-001`, C `BB-LAP-001`; attempt requests on unavailable B/C | After 01; A signed in; preserve C Loan | Owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; revision `borrowbase-00007-jck` (association/release confirmation pending) | 2026-11-21; time not recorded | PASS | BB-UAT-02-A.png; BB-UAT-02-B.png; BB-UAT-02-C.png |
| BB-UAT-03 | FR-03/04; BR-02/03/06; AC-F02-04, AC-F03-01/03/06 — Create pending request | 3481 | A; ASSET-A; save request once, record UUID/time, verify after reload and no Loan/reservation | After 02; creates REQ-A for 04/05 | Owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; revision `borrowbase-00007-jck` (association/release confirmation pending) | 2026-11-21; time not recorded (request event 9:12:13 PM) | PASS | BB-UAT-03-C.png; BB-UAT-03-D.png |
| BB-UAT-04 | FR-03; BR-03; AC-F03-07; supporting TEST-F03-06 — Reject duplicate pending request | 3484 | A; ASSET-A and REQ-A; repeat once; exactly one pending original remains | After 03; REQ-A remains pending | Owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; revision `borrowbase-00007-jck` (association/release confirmation pending) | 2026-11-21; time not recorded | PASS | BB-UAT-04-A.png |
| BB-UAT-05 | FR-04; BR-06; NFR-01; AC-F01-05, AC-F03-03/04 — Deny access to another borrower's record | 3484 | A's REQ-A and B's own REQ-D2 `645e6f94-cf61-4ccd-99b6-1d9650163a6a`; B opens A's detail address | After 03/04; separate A/B contexts; verify A record unchanged | Owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; revision `borrowbase-00007-jck` (association/release confirmation pending) | 2026-11-21; time not recorded | PASS | BB-UAT-05-A.png; BB-UAT-05-B.png; BB-UAT-05-C.png |
| BB-UAT-06 | FR-05/06 access boundary; BR-05/06; AC-F01-05, AC-F04-02 — Borrower cannot checkout | 3481 | A attempts checkout of REQ-E `52b7588a-07a7-4e9a-bf22-8a665428caed`; expect role-denial HTTP 403 FORBIDDEN; E/request unchanged | After 05, before 07; custodian inspects before/after | Owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; revision `borrowbase-00007-jck` (association/release confirmation pending) | 2026-11-21; time not recorded | BLOCKED — HTTP 403 and unchanged state verified; exact JSON error code not captured, so role denial is unconfirmed | BB-UAT-06-C.png |
| BB-UAT-07 | FR-02/04/05/06; BR-02/04/05; NFR-03; AC-F02-02, AC-F03-03/04/06, AC-F04-01/03 — Custodian checkout and persistence | 3481 | Custodian checks out A's REQ-E; verify FULFILLED, unavailable E, one active A Loan and persisted borrower views | After 06; only if REQ-E unchanged | Owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; revision `borrowbase-00007-jck` (association/release confirmation pending) | 2026-11-21; time not recorded (checkout event 9:59:01 PM) | PASS | BB-UAT-07-B.png; BB-UAT-07-D.png; BB-UAT-07-E.png; BB-UAT-07-F.png |
| BB-UAT-08 | FR-03/04/05/06; BR-02/03/04/05/10; AC-F03-07, AC-F04-01/03/07 — Competing pending requests | 3484 | Custodian checks out D1 for A; verify D2 for B stays pending, unavailable, and exactly one active D Loan | After 07; use original D1/D2 fixtures | Owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; revision `borrowbase-00007-jck` (association/release confirmation pending) | 2026-11-21; time not recorded (checkout event 10:11:41 PM) | PASS | BB-UAT-08-A.png; BB-UAT-08-B.png; BB-UAT-08-C.png; BB-UAT-08-D.png; BB-UAT-08-G1.png; BB-UAT-08-G2.png |

## 3. Actual independent case observations

### BB-UAT-01 — Borrower authentication and authorized access

- **Duo L tester (full name, student ID):** Lae Lae Kaung Nyunt, 67070503481
- **Date/time (+07:00):** November 21, 2026; time not recorded
- **Product name, URL, commit and deployed version:** BorrowBase; https://borrowbase-fniy3qjctq-as.a.run.app; owner-reported baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc` and revision `borrowbase-00007-jck`; image association and current release confirmation pending. Screenshots show “BorrowBase — Release B”.
- **Supplied requirement/AC and exact expected result:** FR-01; BR-06; AC-F01-01/04. A authenticates and accesses borrower functions; logout removes authenticated access; borrowing records unchanged.
- **Synthetic input/account role:** Borrower A `borrower@example.test`.
- **Initial application/data state:** Sign-in page; synthetic A account.
- **User actions taken:** Signed in as A; inspected role, menus and own-record views; signed out and reloaded.
- **Actual visible result:** Login succeeded. Borrower role, Equipment Catalog, My Requests and My Active Loans were visible; Custodian Workspace was absent. After logout and reload, Sign in appeared and protected information was hidden.
- **Protected state remained unchanged on denial?** Not applicable; no denied operation. No borrowing state change observed.
- **Result:** PASS
- **Evidence:** `BB-UAT-01-A.jpg` (login succeeded); `BB-UAT-01-B.png` (Borrower role and menus). The original logout/reload action is tester-confirmed, but no dedicated screenshot of that click was captured. `BB-EX-01-A.png` and `BB-EX-02-A.png` are supplemental evidence of unauthenticated access restrictions; neither directly captures the original BB-UAT-01 logout action. The UAT-01 images were extracted from the verified member 3481 ZIP and opened successfully.
- **Finding reported to MT:** None confirmed.

### BB-UAT-02 — Equipment availability and serviceability

- **Duo L tester (full name, student ID):** Naing Zay Linn, 67070503484
- **Date/time (+07:00):** November 21, 2026; time not recorded
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; release confirmation pending.
- **Supplied requirement/AC and exact expected result:** FR-02/03; BR-01/02; AC-F02-01/02, AC-F03-02. Serviceability and active Loan determine availability; unavailable assets cannot receive requests.
- **Synthetic input/account role:** Borrower A; ASSET-A/B/C as named in Section 2.
- **Initial application/data state:** ASSET-A serviceable and available; B maintenance and unavailable; C serviceable but already loaned.
- **User actions taken:** Inspected catalog/details, then directly attempted requests for B and C; checked resulting records/state.
- **Actual visible result:** ASSET-A `BB-LAP-UAT6-A-001` was SERVICEABLE/Available. ASSET-B `BB-RPI-001` was MAINTENANCE/Unavailable. ASSET-C `BB-LAP-001` was SERVICEABLE/Unavailable because loaned. Direct attempts for B and C each displayed “This asset is not available for a new request.” Original requests and existing active Loan remained unchanged.
- **Protected state remained unchanged on denial?** Yes; no B/C request was added and existing C Loan remained unchanged.
- **Result:** PASS
- **Evidence:** `BB-UAT-02-A.png` shows the catalog asset states; `BB-UAT-02-B.png` shows the ASSET-B request rejection; `BB-UAT-02-C.png` shows the ASSET-C request rejection. Copies are in `Documents\Lab6_BorrowBase_Evidence\3484`.
- **Finding reported to MT:** None confirmed.

### BB-UAT-03 — Borrower creates a pending request

- **Duo L tester (full name, student ID):** Lae Lae Kaung Nyunt, 67070503481
- **Date/time (+07:00):** November 21, 2026; time not recorded (request event timestamp below)
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; release confirmation pending.
- **Supplied requirement/AC and exact expected result:** FR-03/04; BR-02/03/06; AC-F02-04, AC-F03-01/03/06. Exactly one pending request belongs to A, persists after reload, and creates no Loan or asset reservation.
- **Synthetic input/account role:** Borrower A; ASSET-A `BB-LAP-UAT6-A-001`.
- **Initial application/data state:** ASSET-A serviceable, no active Loan and no existing A pending request.
- **User actions taken:** Submitted one request, opened the saved record, then reloaded and checked My Requests, My Active Loans and equipment availability.
- **Actual visible result:** A PENDING request was created, UUID `cce4aa1b-7861-4468-b8b7-5fd71926ce19`. Requested timestamp: November 21, 2026, 9:12:13 PM (+07:00). The same UUID and status survived reload. ASSET-A remained available and no new Loan was created.
- **Protected state remained unchanged on denial?** Not applicable; request was authorized.
- **Result:** PASS
- **Evidence:** `BB-UAT-03-C.png` (REQ-A PENDING, UUID and timestamp); `BB-UAT-03-D.png` (same request persisted). Both images were extracted from the verified member 3481 ZIP and opened successfully.
- **Finding reported to MT:** None confirmed.

### BB-UAT-04 — Duplicate pending request rejected

- **Duo L tester (full name, student ID):** Naing Zay Linn, 67070503484
- **Date/time (+07:00):** November 21, 2026; time not recorded
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; release confirmation pending.
- **Supplied requirement/AC and exact expected result:** FR-03; BR-03; AC-F03-07; supporting TEST-F03-06. Duplicate is rejected; no extra request or Loan is created.
- **Synthetic input/account role:** Borrower A; ASSET-A and REQ-A `cce4aa1b-7861-4468-b8b7-5fd71926ce19`.
- **Initial application/data state:** Original REQ-A pending; ASSET-A has no active Loan.
- **User actions taken:** Submitted a second request for ASSET-A once and checked My Requests.
- **Actual visible result:** “You already have a pending request for this asset.” Only one pending REQ-A remained.
- **Protected state remained unchanged on denial?** Yes; no additional request or Loan was created.
- **Result:** PASS
- **Evidence:** `BB-UAT-04-A.png` shows the duplicate-pending-request rejection. Copy is in `Documents\Lab6_BorrowBase_Evidence\3484`.
- **Finding reported to MT:** None confirmed.

### BB-UAT-05 — Borrower cannot access another Borrower's record

- **Duo L tester (full name, student ID):** Naing Zay Linn, 67070503484
- **Date/time (+07:00):** November 21, 2026; time not recorded
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; release confirmation pending.
- **Supplied requirement/AC and exact expected result:** FR-04; BR-06; NFR-01; AC-F01-05, AC-F03-03/04. B can read own request but cannot retrieve A's protected request; A's record remains unchanged.
- **Synthetic input/account role:** Borrower B `uat-borrower-b@example.test`; B's REQ-D2 `645e6f94-cf61-4ccd-99b6-1d9650163a6a`; A's REQ-A `cce4aa1b-7861-4468-b8b7-5fd71926ce19`.
- **Initial application/data state:** Separate A/B contexts; REQ-A pending and REQ-D2 pending.
- **User actions taken:** B opened own D2 record, then attempted A's saved request detail address; checked signed-in state and A's request afterward.
- **Actual visible result:** B could access own D2 request. B's attempt to view A's REQ-A displayed “Resource not found.” B remained signed in and REQ-A was unchanged.
- **Protected state remained unchanged on denial?** Yes; A's request remained unchanged and its details were not shown to B.
- **Result:** PASS
- **Evidence:** `BB-UAT-05-A.png` shows B's own D2 detail; `BB-UAT-05-B.png` shows “Resource not found” for the REQ-A detail URL; `BB-UAT-05-C.png` shows the signed-in Borrower B context at that URL. Copies are in `Documents\Lab6_BorrowBase_Evidence\3484`.
- **Finding reported to MT:** None confirmed.

### BB-UAT-06 — Borrower cannot perform Custodian checkout

- **Duo L tester (full name, student ID):** Lae Lae Kaung Nyunt, 67070503481
- **Date/time (+07:00):** November 21, 2026; time not recorded
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; release confirmation pending.
- **Supplied requirement/AC and exact expected result:** FR-05/06 access boundary; BR-05/06; AC-F01-05, AC-F04-02. Borrower checkout attempt must return HTTP 403 FORBIDDEN without changing domain state.
- **Synthetic input/account role:** Borrower A; REQ-E `52b7588a-07a7-4e9a-bf22-8a665428caed` for ASSET-E.
- **Initial application/data state:** REQ-E PENDING; E available; no E Loan.
- **User actions taken:** Submitted the authorized negative checkout attempt as A; inspected response status and before/after state.
- **Actual visible result:** HTTP 403 observed. Before/after verification confirmed REQ-E remained PENDING, ASSET-E remained available and no E Loan was created. The exact JSON error code was not captured; the response could not be distinguished as `FORBIDDEN` versus `ORIGIN_FORBIDDEN` or `CSRF_FORBIDDEN`.
- **Protected state remained unchanged on denial?** Yes; before/after verification found the request and asset state unchanged and no Loan created.
- **Result:** BLOCKED — HTTP 403 and no state mutation are verified, but the exact code is missing. Team MT's handoff requires `403 FORBIDDEN`; an Origin/CSRF rejection does not establish role-based denial. This is not recorded as PASS or FAIL.
- **Evidence:** `BB-UAT-06-C.png` was extracted from the verified member 3481 ZIP and opened successfully; it shows HTTP 403, but the exact JSON error code is not visible. The before/after state check is verified separately from this screenshot. Do not include CSRF/session data.
- **Finding reported to MT:** None confirmed; classification remains open pending verification.

### BB-UAT-07 — Custodian checkout and persistence

- **Duo L tester (full name, student ID):** Lae Lae Kaung Nyunt, 67070503481
- **Date/time (+07:00):** November 21, 2026; case time not recorded (checkout event 9:59:01 PM +07:00)
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; release confirmation pending.
- **Supplied requirement/AC and exact expected result:** FR-02/04/05/06; BR-02/04/05; NFR-03; AC-F02-02, AC-F03-03/04/06, AC-F04-01/03. Correct request fulfilled, exactly one active Loan created, and borrower view persists after reload.
- **Synthetic input/account role:** Custodian checked out Demo Borrower A's REQ-E `52b7588a-07a7-4e9a-bf22-8a665428caed`; Borrower A verified own views.
- **Initial application/data state:** REQ-E PENDING; E available; no E Loan; Borrower B's competing E request pending.
- **User actions taken:** Custodian checked out REQ-E; Borrower A refreshed My Requests and My Active Loans.
- **Actual visible result:** Checkout succeeded November 21, 2026, at 9:59:01 PM. REQ-E became FULFILLED, equipment became Unavailable and one new active E Loan belonged to A. Borrower A's My Requests and My Active Loans showed these results after refresh. Borrower B's competing E request remained PENDING.
- **Protected state remained unchanged on denial?** Not applicable; authorized checkout. Competing B request remained unchanged.
- **Result:** PASS
- **Evidence:** `BB-UAT-07-B.png` and `BB-UAT-07-D.png` show Custodian checkout/state; `BB-UAT-07-E.png` shows A's fulfilled request; `BB-UAT-07-F.png` shows A's active E Loan. All four were extracted from the verified member 3481 ZIP and opened successfully. B's competing request remaining pending is verbal confirmation.
- **Finding reported to MT:** None confirmed.

### BB-UAT-08 — Competing pending requests

- **Duo L tester (full name, student ID):** Naing Zay Linn, 67070503484
- **Date/time (+07:00):** November 21, 2026; case time not recorded (checkout event 10:11:41 PM +07:00)
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; release confirmation pending.
- **Supplied requirement/AC and exact expected result:** FR-03/04/05/06; BR-02/03/04/05/10; AC-F03-07, AC-F04-01/03/07. Only D1 is fulfilled; D2 remains pending and unavailable for checkout; exactly one active D Loan exists.
- **Synthetic input/account role:** Custodian; D1 for A `a8f615c3-65cd-4715-9924-da4110c5731b`; D2 for B `645e6f94-cf61-4ccd-99b6-1d9650163a6a`; Borrowers A and B for refresh checks.
- **Initial application/data state:** ASSET-D available with D1 and D2 both PENDING; no active D Loan.
- **User actions taken:** Custodian checked out D1; both borrowers refreshed their own request/loan views; custodian verified request and active-loan state.
- **Actual visible result:** Checkout succeeded November 21, 2026, at 10:11:41 PM. D1 became FULFILLED, D2 remained PENDING, ASSET-D became Unavailable, and exactly one active D Loan existed: `46c1b61d-6807-4e82-be69-bf948124fd6f`. Borrower A saw the active loan; Borrower B had no active loans. Both members confirmed the refresh checks.
- **Protected state remained unchanged on denial?** Not applicable; authorized checkout. B's competing request remained pending.
- **Result:** PASS
- **Evidence:** `BB-UAT-08-A.png` shows successful D1 checkout and the new Loan ID; `BB-UAT-08-B.png` and `BB-UAT-08-D.png` show D2 pending with checkout unavailable and D1 fulfilled; `BB-UAT-08-C.png` shows the active D loan. Member 3481's `BB-UAT-08-G1.png` and `BB-UAT-08-G2.png` cross-verify A's fulfilled request and active loan; both teammate images were extracted and opened successfully. These copies are in the 3484/3481 evidence folders. Borrower B's absence of active loans remains a verbal confirmation; no B-side loan screenshot was found.
- **Finding reported to MT:** None confirmed.

### Additional testing — BB-EX-01: Signed-out private request detail

- **Duo L tester (full name, student ID):** Lae Lae Kaung Nyunt, 67070503481
- **Date/time (+07:00):** November 21, 2026; time not recorded
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; release confirmation pending.
- **Supplied requirement/AC and exact expected result:** Related logout/protected-access check (FR-01; BR-06; AC-F01-04). Reopening a private request detail after sign-out must show Sign in without exposing the request.
- **Synthetic input/account role:** Borrower A; A's private request-detail URL (no URL/token value recorded here).
- **Initial application/data state:** A signed in and then signed out.
- **User actions taken:** Signed out, reopened A's private request-detail URL.
- **Actual visible result:** Sign in page appeared without exposing the request.
- **Protected state remained unchanged on denial?** Yes; protected information was hidden.
- **Result:** PASS
- **Evidence:** `BB-EX-01-A.png` shows the Sign in screen after reopening the private request deep link post-logout. It was extracted from the verified member 3481 ZIP and opened successfully.
- **Finding reported to MT:** None confirmed.

### Additional testing — BB-EX-02: Incognito access to private REQ-A

- **Duo L tester (full name, student ID):** Lae Lae Kaung Nyunt, 67070503481
- **Date/time (+07:00):** Test execution time not recorded; screenshot capture time was November 21, 2026, 11:43:09 PM (+07:00).
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; image association and session release confirmation remain pending.
- **Supplied requirement/AC and exact expected result:** FR-01; BR-06; AC-F01-04. A fresh unauthenticated browser session opening a private request URL must show Sign in without exposing the request.
- **Synthetic input/account role:** Private URL for A's REQ-A `cce4aa1b-7861-4468-b8b7-5fd71926ce19`; no URL or session data reproduced.
- **Initial application/data state:** Fresh Incognito session with no authenticated Borrower A session.
- **User actions taken:** Opened the private REQ-A URL in the fresh Incognito session.
- **Actual visible result:** Sign in screen appeared; request details were not exposed.
- **Protected state remained unchanged on denial?** Yes; no request data was exposed and no state-changing action was taken.
- **Result:** PASS
- **Evidence:** `BB-EX-02-A.png` shows the Sign in screen for the fresh Incognito request. Its original filename was `Screenshot 2569-11-21 at 11.43.09 PM.png`; capture time was November 21, 2026, 11:43:09 PM (+07:00). This is the screenshot capture time, not a verified test execution time. The image was extracted from the verified member 3481 ZIP and opened successfully.
- **Finding reported to MT:** None confirmed.

### Additional testing — BB-EX-03: Invalid request UUID

- **Duo L tester (full name, student ID):** Naing Zay Linn, 67070503484
- **Date/time (+07:00):** November 21, 2026; time not recorded
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; image association and session release confirmation remain pending.
- **Supplied requirement/AC and exact expected result:** FR-04; BR-06; NFR-01. An invalid request identifier must not disclose private request information; the tester's own valid request must remain accessible.
- **Synthetic input/account role:** Invalid UUID `00000000-0000-4000-8000-000000000000`; borrower account used for the attempt.
- **Initial application/data state:** Borrower B's original ASSET-D request `645e6f94-cf61-4ccd-99b6-1d9650163a6a` was PENDING.
- **User actions taken:** Opened the request detail for the invalid UUID, then reopened B's original ASSET-D request.
- **Actual visible result:** The invalid UUID displayed “Resource not found” without private details. Afterward, B could still open the original request for `BB-LAP-UAT6-D-001`; it remained PENDING with its original timestamp unchanged.
- **Protected state remained unchanged on denial?** Yes; no private record was disclosed for the invalid UUID, and B's own request remained accessible and unchanged.
- **Result:** PASS — invalid identifier did not disclose a private record, and Borrower B retained access to the original request.
- **Evidence:** `BB-EX-03-A.png` shows the invalid UUID and “Resource not found”; it is in `Documents\Lab6_BorrowBase_Evidence\3484`. The follow-up screenshot is described by member 3484, but is not yet present in the organized folder; its filename and image extension have not been verified and are not cited as an existing file.
- **Finding reported to MT:** None confirmed.

### Additional testing — BB-EX-04: Repeat-checkout UI restriction

- **Duo L tester (full name, student ID):** Naing Zay Linn, 67070503484
- **Date/time (+07:00):** Screenshot captures dated November 21–22, 2026; exact execution time not recorded
- **Product name, URL, commit and deployed version:** BorrowBase; deployed URL above; owner-reported baseline/revision as recorded in Section 1; image association and session release confirmation remain pending.
- **Supplied requirement/AC and exact expected result:** FR-05/06; BR-04/06/10; AC-F04-03/07. Using the normal Custodian interface, D1 remains FULFILLED, D2 remains PENDING with checkout unavailable, and exactly one active ASSET-D loan exists.
- **Synthetic input/account role:** Custodian UI; fulfilled D1 `a8f615c3-65cd-4715-9924-da4110c5731b`; competing pending D2 `645e6f94-cf61-4ccd-99b6-1d9650163a6a`.
- **Initial application/data state:** Following BB-UAT-08, D1 `a8f615c3-65cd-4715-9924-da4110c5731b` was FULFILLED and D2 `645e6f94-cf61-4ccd-99b6-1d9650163a6a` remained PENDING.
- **User actions taken:** Inspected the normal Custodian UI state for D1 and D2, refreshed Custodian records, and checked Active Loans; no repeat checkout was attempted. This is a UI-level restriction check, not an API-level replay test.
- **Actual visible result:** D1 was FULFILLED with no repeat-checkout action shown. D2 remained PENDING with Checkout unavailable. Asset D was Unavailable. The Custodian Active Loans view shows one active ASSET-D loan, ID `46c1b61d-6807-4e82-be69-bf948124fd6f`, consistent with the exactly-one-loan result already verified in BB-UAT-08. The final screenshot is also the Custodian Active Loans view; it is not a Borrower Active Loans screenshot.
- **Protected state remained unchanged on denial?** No checkout action was available for D1 or D2; no repeat checkout occurred and the single active D loan remained visible.
- **Result:** PASS — observed UI restriction and refreshed loan state match expectations.
- **Evidence:** `BB-EX-04-A.png` shows D1 fulfilled and D2 pending/checkout unavailable; `BB-EX-04-B.png` shows the active D loan; `BB-EX-04-C.png` is the final Custodian Active Loans screenshot showing the same D loan ID. All three copied PNGs opened successfully in `Documents\Lab6_BorrowBase_Evidence\3484`. The specified `photo_2026-11-21_23-59-04.jpg` and `photo_2026-11-21_23-59-11.jpg` source files were not found; the evidence uses visually inspected PNG screenshots with their actual extensions.
- **Finding reported to MT:** None; no defect finding is made.

### Sprint 1 coverage gaps — not executed in this independent UAT

This assessment compares the recorded manual cases with MT's [SRS](https://github.com/thu734/Inventory-and-Borrowing-System/blob/6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc/docs/srs.md) and [F-01](https://github.com/thu734/Inventory-and-Borrowing-System/blob/6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc/docs/sprints/sprint-1/contracts/F-01-authentication.md), [F-02](https://github.com/thu734/Inventory-and-Borrowing-System/blob/6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc/docs/sprints/sprint-1/contracts/F-02-equipment-catalog.md), [F-03](https://github.com/thu734/Inventory-and-Borrowing-System/blob/6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc/docs/sprints/sprint-1/contracts/F-03-borrowing-requests.md) and [F-04](https://github.com/thu734/Inventory-and-Borrowing-System/blob/6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc/docs/sprints/sprint-1/contracts/F-04-custodian-checkout.md) contracts at the owner-reported baseline. These are independent UAT gaps, not claims about MT's separate automated checks.

- **Authentication inputs (FR-01/F-01):** Invalid login inputs, malformed or missing fields, unknown/inactive accounts, wrong passwords and rate-limit behavior were not exercised; BB-UAT-01 records a successful login only.
- **Server-side authorization (BR-05/06, NFR-01; F-01/F-04):** BB-UAT-06 remains BLOCKED because its HTTP 403 code is unknown. Unauthenticated and inactive/revoked-session access across Custodian list, detail and checkout routes was not independently tested. The EX-04 UI check does not test server authorization.
- **API and transaction boundaries (F-02/F-03/F-04; NFR-08):** Invalid or forged request/asset inputs, Origin/CSRF error paths, API-level repeat checkout, concurrent checkout conflicts and rollback/no-partial-write behavior were not covered by these manual UAT cases. EX-04 checks only the normal Custodian UI.
- **UI states and accessibility (NFR-06; AC-F02-06, AC-F03-08, AC-F04-09):** Comprehensive loading, empty, error/recovery, keyboard/focus and responsive-layout checks remain unexecuted.

## 4. Outgoing defects we reported to Team MT

No genuine outgoing defect is confirmed from the tests recorded so far. BB-UAT-06 is BLOCKED: HTTP 403 and no state mutation are verified, but the missing exact code prevents confirmation of role-based denial under MT's handoff. BB-EX-03 passed based on the confirmed before/after behavior; its follow-up screenshot remains to be copied and verified. No defect issue or fix is claimed.

## 5. Independent retest of MT's corrected release

Independent defect retesting is **NOT EXECUTED**. No correction or retest is claimed.

| MT issue / original case | New tested commit/revision | Duo L retester | Retest timestamp (+07) | Observed actual outcome | Result | Evidence |
|---|---|---|---|---|---|---|
| No confirmed correction available for retest | — | — | — | No independent retest performed | NOT EXECUTED | — |

## 6. Final independent Sprint 1 decision for Team MT — Duo L ONLY

- **Product and Sprint 1 scope:** BorrowBase — Equipment Inventory and Borrowing System (Theme 2); Sprint 1 scope F-01 through F-04 as recorded in Section 1.
- **Final decision:** PENDING — no acceptance decision made.
- **Reasons / conditions / unresolved cases:** Pending evidence review; confirmation of the deployed version/release for this session; BB-UAT-06 exact authorization-error verification; and completion/review of the remaining Sprint 1 coverage gaps listed in Section 3. The BB-EX-03 follow-up screenshot also remains to be copied and its actual filename/extension verified. Current case execution and observations do not constitute approval.
- **Exact tested MT commit/revision:** Owner-reported source baseline `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc`; owner-reported revision `borrowbase-00007-jck`; image-to-commit association and session release confirmation pending.
- **Independent testers:** Lae Lae Kaung Nyunt (67070503481), Naing Zay Linn (67070503484), according to case assignments above.
- **Decision date/time (+07:00):** Pending; no final decision made.
- **Evidence IDs and record of delivered decision:** Member 3481's 13 images from `Lab6_BorrowBase_Evidence_3481_v2.zip` are extracted to `Documents\Lab6_BorrowBase_Evidence\3481`; member 3484's 15 case-labeled screenshots are copied to `Documents\Lab6_BorrowBase_Evidence\3484`. The teammate ZIP and individual images remain outside the repository. BB-EX-03's post-attempt own-request access was confirmed by member 3484; its follow-up screenshot is not yet present and its filename/extension remain unverified. No decision delivered.

This is Duo L's independent decision about MT's application. MT must separately decide acceptance of CampusBite.
