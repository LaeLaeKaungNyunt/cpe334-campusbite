# CPE334 Lab 6 — Independent UAT Results: Team MT Tests CampusBite

**Status:** PARTNER-REPORTED UAT RESULTS — Team MT reports UAT-CB-01–08 and MT-IUAT-01–04 as PASS, with zero confirmed defects. These are MT's reported observations and evidence references, not Duo L's own manual tests. Deployment association and formal MT independent acceptance remain unverified/pending. Lab 6 deadline: November 29, 2026.
**Product Team:** Duo L — Lae Lae Kaung Nyunt (67070503481), Naing Zay Linn (67070503484).  
**Independent UAT Team:** MT — Moe Htet Aung (67070503482), Thu Thu Wai (67070503486).  
**Product:** CampusBite, Sprint 1 only: F-01 authentication; F-02 menu; F-03 customer orders; F-04 operator acceptance.  
**Repository:** https://github.com/LaeLaeKaungNyunt/cpe334-campusbite  
**Application:** https://campusbite-kpxq63g5va-as.a.run.app  
**Test-plan sources:** `uat-handoff.md`, `uat-auth-operator.md`, `uat-menu-orders.md`, `test-data-instructions.md` in this folder.

## 1. Release and session record (Product Team fills before handoff)

| Field | Recorded value |
|---|---|
| Main/Sprint 1 release commit | R1 reported tested release: `1400faa683cff2350169a86f30a25fd46a74a117` (reported by Team MT). |
| Cloud Run serving revision | R1 reported tested revision: `campusbite-00007-jwv` (reported by Team MT). |
| Deployment association | MT's record states that the commit-to-deployment association was not independently confirmed. |
| Actual tested commit and revision | R1 values above are partner-reported; deployment association is not independently verified by MT in the record. |
| UAT dates/time (+07:00) | Original cases: November 21, 2026; additional cases: November 22, 2026. Exact execution times were not recorded. |
| Test environment readiness | MT reports all eight original and four additional cases executed; MT's report says supporting screenshots are included in its Lab 6 PDF under the evidence IDs below. PDF is not copied into this repository. |
| Contact channel for findings | Not specified in the received UAT record. |
| Credentials | Provided through private channel only; never add them here |
| Data reset / fixture agreement | MT's reported inputs and observed pre/post state are recorded per case below; no reset is claimed. |

**Release freeze:** Product Team must notify Team MT before a deployment or test-data change. Do not combine results from different revisions into one unexplained acceptance record.

## 2. Original case allocation and partner-reported results

| Case | Requirement / AC references | Actual tester / Team | Date / time (+07:00) | Tested version | Inputs | Actual result | Outcome | Evidence IDs |
|---|---|---|---|---|---|---|---|---|
| UAT-CB-01 | FR-01; AC-01/02/03/05 | Moe Htet Aung (3482) / Team MT | November 21, 2026; time not recorded (+07:00) | R1 (reported) | Customer A and Operator; incorrect password | Both accounts logged in with correct identities/roles. Logout denied protected identity access; incorrect password was rejected. | PASS (MT-reported) | CB-01-E01–E04 |
| UAT-CB-02 | FR-02; AC-06/07 | Moe Htet Aung (3482) / Team MT | November 21, 2026; time not recorded (+07:00) | R1 (reported) | Latte, Sandwich, Croissant; inactive Matcha | Prices were ฿65/฿85/฿45; stock was 9/2/0. Croissant was sold out and unselectable; inactive Matcha was absent. Menu API matched product data. | PASS (MT-reported) | CB-02-E01–E03 |
| UAT-CB-03 | FR-03; BR-03/04/05/06; AC-09/10 | Moe Htet Aung (3482) / Team MT | November 21, 2026; time not recorded (+07:00) | R1 (reported) | Customer A; Latte ×2, Sandwich ×1 | O1 was saved with correct lines, ฿215 total, PENDING and UNPAID. Latte stock changed 9→7; Sandwich 2→1; Croissant stayed 0. | PASS (MT-reported) | CB-03-E01–E03 |
| UAT-CB-04 | FR-03; BR-02/03/04/06; AC-10/11 | Moe Htet Aung (3482) / Team MT | November 21, 2026; time not recorded (+07:00) | R1 (reported) | Quantity 0; `totalSatang: 1`; Latte ×1 plus sold-out Croissant ×1 | Zero quantity returned HTTP 400 `INVALID_ORDER`; forged total returned HTTP 400, but screenshot did not show the exact error code; mixed order returned HTTP 409 `OUT_OF_STOCK`. Order count stayed 4; stock stayed 7/1/0. | PASS (MT-reported; forged-total HTTP rejection observed, exact code unverified) | CB-04-E01–E07 |
| UAT-CB-05 | FR-04; AC-13 (reload/re-login) | Thu Thu Wai (3486) / Team MT | November 21, 2026; time not recorded (+07:00) | R1 (reported) | Customer A; O1 | Same order, items, ฿215 total, PENDING and UNPAID remained accessible after reload and a new login session. | PASS (MT-reported) | CB-05-E01–E03 |
| UAT-CB-06 | FR-04; BR-07; AC-03/14 | Thu Thu Wai (3486) / Team MT | November 21, 2026; time not recorded (+07:00) | R1 (reported) | Customer A, Customer B, anonymous; O1 | B received 404 `ORDER_NOT_FOUND`; anonymous access received 401 `UNAUTHORIZED`. No private order information was disclosed; A's order remained unchanged. | PASS (MT-reported) | CB-06-E01–E03 |
| UAT-CB-07 | BR-08; AC-04/18 | Thu Thu Wai (3486) / Team MT | November 21, 2026; time not recorded (+07:00) | R1 (reported) | Customer A; O1 initially PENDING | Operator page denied access; operator list and acceptance APIs returned 403. O1 remained PENDING with unchanged items, total and payment state. | PASS (MT-reported) | CB-07-E01–E04 |
| UAT-CB-08 | FR-05; BR-08; AC-15/16/17/19 | Thu Thu Wai (3486) / Team MT | November 21, 2026; time not recorded (+07:00) | R1 (reported) | Operator, Customer A; O1 initially PENDING | Operator accepted O1 once; ACCEPTED persisted after refresh. Repeat acceptance returned 409. A saw ACCEPTED with unchanged items, ฿215 total and UNPAID. | PASS (MT-reported) | CB-08-E01–E04 |

**Reported order fixture:** O1 = `56401c7b-3652-44e6-836c-4d5c4b5940f7`, owned by Customer A, two Iced Lattes and one Chicken Sandwich, total ฿215. MT's report says CB-03 created O1 and CB-05–08 reused it; CB-08 followed the negative authorization checks because acceptance changes its state. Observations above are attributed to MT's record, not independently reproduced by Duo L.

## 3. Observation attribution and source

The case observations, inputs, requirement/AC references, tester assignments, dates, outcomes and evidence IDs in Sections 2 and 5 are transcribed from Team MT's completed `campusbite-uat-results.md`. The source identifies `lab6_partb.pdf` as the screenshot collection and says evidence for the cases is included there. Duo L has not independently examined that PDF or rerun these cases; no missing screenshot, exact execution time or additional observation is inferred here.

## 4. Session and order-data ledger

| Session / timestamp | Tester | Customer label | Test order ID | Items / total | Stock before → after | Initial → observed order status | Notes / intended cleanup |
|---|---|---|---|---|---|---|---|
| 21 Nov 2026 (exact event time not reported) | Moe Htet Aung (3482), Team MT; later reuse by Thu Thu Wai (3486), Team MT | Customer A / O1 | `56401c7b-3652-44e6-836c-4d5c4b5940f7` | 2 Iced Lattes + 1 Chicken Sandwich; ฿215 | Latte 9→7; Sandwich 2→1; Croissant stayed 0 (MT-reported) | PENDING/UNPAID after creation; ACCEPTED after operator acceptance and refresh | Partner-reported shared fixture; no cleanup claimed |

**No destructive reset by default.** The production seed preserves existing stock/orders. Do not publish or clear private credentials. If stock is insufficient, request a controlled test fixture and record any BLOCKED result honestly.

## 5. Additional independent UAT cases — partner-reported

| Case | Requirement / AC | Tester / Team | Date / time (ICT) | Tested version | Inputs | Actual result | Outcome | Evidence IDs |
|---|---|---|---|---|---|---|---|---|
| MT-IUAT-01 — Customer Order History Ownership Isolation | FR-04; BR-07; AC-13 (history ownership) | Thu Thu Wai (3486) / Team MT | November 22, 2026; time not recorded | R1 (reported) | Customer B; A's O1 | B's history displayed no orders; API returned `{"data":[]}`. A's order was absent and no private order information was disclosed. | PASS (MT-reported) | MT-IUAT-01-E01–E02 |
| MT-IUAT-02 — Order Quantity Boundary Validation | FR-02/03; BR-02/03; AC-07 (UI only) | Thu Thu Wai (3486) / Team MT | November 22, 2026; time not recorded | R1 (reported) | Customer B; quantities 0 and 7; sold-out Croissant | Quantity remained 0 with decrease disabled; Latte increase disabled at available stock 7; Croissant was unselectable. No order was submitted. | PASS (UI boundaries only) | MT-IUAT-02-E01–E02 |
| MT-IUAT-03 — Menu Error Handling and Recovery | FR-02; AC-08 (error/recovery) | Thu Thu Wai (3486) / Team MT | November 22, 2026; time not recorded | R1 (reported) | Customer B; browser-local menu API blocking, then unblock/retry | Menu displayed “We couldn't load the menu” and Try again. Unblocking and retrying restored products, prices and availability. | PASS (MT-reported) | MT-IUAT-03-E01–E02 |
| MT-IUAT-04 — Duplicate Menu Item Rejection | FR-03; BR-01/06; AC-11 | Thu Thu Wai (3486) / Team MT | November 22, 2026; time not recorded | R1 (reported) | Customer B; duplicate Iced Latte IDs | Request returned 400 `INVALID_ORDER`; B's history remained empty. Stock remained unchanged based on manual verification. | PASS (MT-reported) | MT-IUAT-04-E01 |

MT reports these four cases as additional independent tests. MT-IUAT-02 covered UI quantity boundaries only; no successful order submission was attempted in that case. The source report identifies the supporting screenshot IDs as included in its Lab 6 PDF; the PDF was not copied into this repository.

## 6. Incoming findings from Team MT

Team MT reports zero confirmed defects across the eight original and four additional cases. Duo L records this as a partner-reported status, not an independent finding review or confirmation. UAT-CB-04's forged-total attempt received HTTP 400, but the screenshot did not show the exact `INVALID_ORDER` code; this is a recorded limitation, not a confirmed defect. No defect issue or severity classification is claimed. No correction or controlled-defect exercise has been executed.

## 7. Independent retest after any correction

| Original case / Issue ID | Corrected commit & deployed revision | MT retester (full name/ID) | Actual retest date/time (+07) | New actual result | PASS / FAIL / BLOCKED | Evidence ID |
|---|---|---|---|---|---|---|
| No confirmed correction submitted for independent retest | — | — | — | No independent retest recorded | NOT EXECUTED | — |

## 8. Final CampusBite Sprint 1 acceptance — Team MT ONLY

- **Decision:** PENDING — MT's formal independent acceptance decision has not been supplied.
- **Reason and conditions:** All 12 cases are reported PASS by Team MT, with zero confirmed defects reported. Formal independent acceptance has not been supplied. The UAT-CB-04 forged-total response's exact error code remains unverified; evidence is referenced by IDs in MT's record, but the PDF was not copied into this repository.
- **Accepted release commit and deployed revision:** Pending formal MT decision. Reported R1 values: commit `1400faa683cff2350169a86f30a25fd46a74a117`, revision `campusbite-00007-jwv`; deployment association is explicitly not independently confirmed in MT's record.
- **Independent tester names and IDs:** UAT-CB-01–04: Moe Htet Aung (67070503482); UAT-CB-05–08 and MT-IUAT-01–04: Thu Thu Wai (67070503486).
- **Date/time (+07:00):** Original cases November 21, 2026; additional cases November 22, 2026. Exact execution times were not recorded. Lab 6 deadline is November 29, 2026.
- **Evidence and closure/known-limitation links:** Evidence IDs are recorded in Sections 2 and 5 and refer to MT's Lab 6 PDF; no PDF or image files are added here.
- **Where recorded (e.g., signed PDF, PR comment, course channel):** MT's source record: [campusbite-uat-results.md](https://github.com/thu734/Inventory-and-Borrowing-System/blob/lab6-staging/docs/labs/lab-06/campusbite-uat-results.md). Formal independent decision remains pending.

**Do not complete this section on behalf of MT.** The Product Team cannot grant its own independent acceptance.
