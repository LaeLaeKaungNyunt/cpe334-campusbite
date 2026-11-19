# CPE334 Lab 6 — Independent UAT Results: Team MT Tests CampusBite

**Status:** NOT EXECUTED — preparation worksheet. No PASS, FAIL, BLOCKED, or acceptance decision is claimed yet.  
**Product Team:** Duo L — Lae Lae Kaung Nyunt (67070503481), Naing Zay Linn (67070503484).  
**Independent UAT Team:** MT — Moe Htet Aung (67070503482), Thu Thu Wai (67070503486).  
**Product:** CampusBite, Sprint 1 only: F-01 authentication; F-02 menu; F-03 customer orders; F-04 operator acceptance.  
**Repository:** https://github.com/LaeLaeKaungNyunt/cpe334-campusbite  
**Application:** https://campusbite-kpxq63g5va-as.a.run.app  
**Test-plan sources:** `uat-handoff.md`, `uat-auth-operator.md`, `uat-menu-orders.md`, `test-data-instructions.md` in this folder.

## 1. Release and session record (Product Team fills before handoff)

| Field | Recorded value |
|---|---|
| Main/Sprint 1 release commit | `1400faa683cff2350169a86f30a25fd46a74a117` (from Lab 5; re-verify at handoff) |
| Cloud Run serving revision | `campusbite-00007-jwv` (read-only status check on 19 Nov 2026; re-verify when testing begins) |
| Revision image digest | `sha256:d7d17465e1ca627f554605d9a5412a2bd942683dc8e30cbc0dc9af1b263d1516` |
| Actual tested commit and revision | [Record at session start; do not infer from staging commit] |
| UAT start and end (+07:00) | [Actual dates/times] |
| Test environment readiness | [Cloud SQL RUNNABLE, /api/ready response, screenshot/evidence IDs] |
| Contact channel for findings | [Agreed private channel / GitHub Issue URL] |
| Credentials | Provided through private channel only; never add them here |
| Data reset / fixture agreement | [Record whether existing stock is sufficient and any safe setup] |

**Release freeze:** Product Team must notify Team MT before a deployment or test-data change. Do not combine results from different revisions into one unexplained acceptance record.

## 2. Planned case division — not evidence of execution

| Case | Scope / expected check | Planned independent tester | AC reference | Actual tester | Actual time (+07:00) | Actual tested revision | Result (PASS / FAIL / BLOCKED) | Evidence ID / issue link |
|---|---|---|---|---|---|---|---|---|
| UAT-CB-01 | Valid/invalid login and logout | 3482 | AC-01–03, AC-05 | | | | | |
| UAT-CB-02 | Menu, prices, sold-out/inactive | 3482 | AC-06–08 | | | | | |
| UAT-CB-03 | Multi-item order and server total | 3482 | AC-09–10 | | | | | |
| UAT-CB-04 | Invalid cart, stock protection | 3482 | AC-10–11 | | | | | |
| UAT-CB-05 | Own history and saved state | 3486 | AC-13 | | | | | |
| UAT-CB-06 | Anonymous/other-customer denial | 3486 | AC-03, AC-14 | | | | | |
| UAT-CB-07 | Customer/operator authorization | 3486 | AC-04, AC-18 | | | | | |
| UAT-CB-08 | Accept once, persist status | 3486 | AC-15–17, AC-19 | | | | | |

**Required ordering:** CB-03 creates the `TEST_ORDER_ID`; CB-05, CB-06, CB-07 and CB-08 reuse it. CB-08 runs *after* the negative authorization checks because acceptance changes its state. Transfer the order ID privately between testers. Preserve the actual stock and order-count baselines for each case.

## 3. Actual case observation record (copy this block for each case)

### Case UAT-CB-[ID] — [case name]

- **Independent tester (name and student ID):** [Actual executor]
- **Date/time with Asia/Bangkok offset:** [YYYY-MM-DD HH:MM +07:00]
- **Tested commit / Cloud Run revision:** [Exact values]
- **Account role and synthetic inputs:** [No password or token]
- **Pre-test state:** [Stock quantities, order count, and relevant existing status]
- **Steps actually performed:** [Numbered actions; any deviations from handoff]
- **Expected result (reference the supplied case):** [Precise relevant acceptance criterion]
- **Actual result:** [Observed page, state, HTTP status, ID, amounts; not a copy of expected]
- **Protected state unchanged?** [Required for negative cases; observations before and after]
- **Result:** [PASS / FAIL / BLOCKED; for BLOCKED, record reason, not PASS]
- **Evidence ID, description and file/page:** [e.g., B-CB03-01, screen of saved order]
- **Reported defect issue (if FAIL):** [Actual issue URL or ID]

## 4. Session and order-data ledger

| Session / timestamp | Tester | Customer label | Test order ID | Items / total | Stock before → after | Initial → observed order status | Notes / intended cleanup |
|---|---|---|---|---|---|---|---|
| [To be filled during test] | | | | | | | |

**No destructive reset by default.** The production seed preserves existing stock/orders. Do not publish or clear private credentials. If stock is insufficient, request a controlled test fixture and record any BLOCKED result honestly.

## 5. Extra controlled criteria — clearly separate from ordinary UAT

| Criterion | Planned safe method | Responsible independent tester | Executed? | Actual result and evidence |
|---|---|---|---|---|
| AC-08 empty-menu/error/retry | Use an agreed isolated fixture or safe browser request-blocking check; never delete the live catalog | [Agree with MT] | [No] | |
| AC-12 final-unit concurrent order | Isolated database/stock-one fixture, simultaneous clients and stock/order-count check | [Agree with MT] | [No] | |
| NFR-04 restart persistence, if agreed | Product Team schedules safe restart; UAT Team checks same order before/after | [Agree with MT] | [No] | |

If a check is not performed, document the reason and remaining coverage gap. Developer automation can support the report but cannot be described as independent execution.

## 6. Incoming findings from Team MT

All actual findings must be reproduced/triaged by Duo L in `defect-register.md`. Link corresponding GitHub issues and retest results here. **No findings have been received or confirmed in this worksheet.**

## 7. Independent retest after any correction

| Original case / Issue ID | Corrected commit & deployed revision | MT retester (full name/ID) | Actual retest date/time (+07) | New actual result | PASS / FAIL / BLOCKED | Evidence ID |
|---|---|---|---|---|---|---|
| [To be filled only after actual retesting] | | | | | | |

## 8. Final CampusBite Sprint 1 acceptance — Team MT ONLY

- **Decision:** [Accepted / Accepted with expressly documented minor limitations / Not Accepted]
- **Reason and conditions:** [State actual outcome; unresolved major/critical or required BLOCKED tests mean Not Accepted]
- **Accepted release commit and deployed revision:** [Exact actual tested version]
- **Independent tester names and IDs:** [3482 and 3486 after real testing]
- **Date/time (+07:00):** [Actual sign-off]
- **Evidence and closure/known-limitation links:** [Actual IDs and pages]
- **Where recorded (e.g., signed PDF, PR comment, course channel):** [Link or embedded screenshot]

**Do not complete this section on behalf of MT.** The Product Team cannot grant its own independent acceptance.
