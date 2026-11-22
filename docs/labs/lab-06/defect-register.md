# CPE334 Lab 6 — Duo L Defect Register, Triage and Resolution Trace

**Status:** RECONCILED PARTNER AND INDEPENDENT UAT — Team MT's published CampusBite report records 12/12 PASS and zero confirmed defects; formal MT acceptance remains PENDING. Duo L's BorrowBase BB-UAT-01–08 are 8/8 PASS after additional BB-UAT-06 verification; BB-EX-01–04 are PASS. No genuine incoming or outgoing defect is confirmed. BorrowBase acceptance remains PENDING. Updated Lab 6 deadline: November 29, 2026.
**Duo L (CampusBite Product Team and MT independent UAT Team):** 3481 Lae Lae Kaung Nyunt; 3484 Naing Zay Linn.  
**Partner:** Team MT — 3482 Moe Htet Aung; 3486 Thu Thu Wai.  
**Purpose:** Keep incoming CampusBite findings separate from outgoing MT findings. Record every genuine report, even if the result is duplicate, not-defect or enhancement.

## 1. Incoming findings — MT reports against CampusBite

**Present state:** Team MT's published CampusBite UAT report records 12/12 PASS (eight original and four additional cases) and zero confirmed defects. This remains partner-reported, not Duo L's independently verified case evidence. MT reports R1 commit `1400faa683cff2350169a86f30a25fd46a74a117` and Cloud Run revision `campusbite-00007-jwv`; the report says their deployment association was not independently confirmed. The evidence is referenced by IDs in MT's report/PDF and has not been independently reviewed here. UAT-CB-04's forged-total input returned HTTP 400, but its screenshot did not show the exact `INVALID_ORDER` code; this is a limitation, not a confirmed defect. MT's formal independent acceptance remains PENDING. Duo L has no confirmed incoming finding; the findings table remains empty.

| Finding ID / Issue URL | Reporter (MT tester) | CampusBite case/AC | Tested commit/revision | Actual vs expected (brief) | Impact-based severity | Triage classification + reason | Assigned Duo L owner | Fix / disposition status | MT retest / closure evidence |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

**Triage classifications:** accepted defect; duplicate (link original issue); not-defect (cite requirement/observations); enhancement (outside Sprint 1 scope). Reproduce ambiguous reports before dismissing them. For accepted defects, severity is Critical / Major / Minor and must be justified by user impact. Critical or Major blocks acceptance until corrected and independently retested. Minor must be fixed or expressly accepted by MT as a known limitation. Features outside Sprint 1 do not become defects merely for being absent.

## 2. Outgoing findings — Duo L reports against Team MT's product

**Present state:** Duo L's original BorrowBase BB-UAT-01–08 execution on November 21, 2026 had 7 PASS and 1 BLOCKED; BB-EX-01–04 are PASS. Member 3481 independently repeated BB-UAT-06 on November 22 using a fresh PENDING request fixture. Authenticated Borrower B sent one `POST /api/v1/custodian/borrow-requests/{requestId}/checkout` with a valid session and CSRF token; response was HTTP 403, `error.code` `FORBIDDEN`, message “You do not have permission for this operation.” The request remained PENDING, asset AVAILABLE, and the same three active loans remained. This additional verification resolves the BLOCKED classification without a code fix: original-case status is now 8/8 PASS after verification. No genuine outgoing defect is confirmed. BorrowBase results are documented and merged through PR #40; the owner-reported source baseline/revision remain `6a0e29154c2b2165c486b0bc8d18e3fd2475b2fc` / `borrowbase-00007-jck`, with image-to-commit and session release association unverified.

**BB-UAT-06 verification evidence:** `BB-UAT-06-R2-BEFORE-REQUEST.png`, `BB-UAT-06-R2-BEFORE-LOANS.png`, `BB-UAT-06-R2-RESPONSE.png`, `BB-UAT-06-R2-AFTER-REQUEST.png`, and `BB-UAT-06-R2-AFTER-LOANS.png`. The November 21 response screenshot `BB-UAT-06-C.png` remains the original BLOCKED-run evidence; it did not show the exact code. No defect issue or code correction is recorded for this resolved verification gap.

| Finding ID / MT Issue URL | Duo L reporter (3481/3484) | MT case/requirement | Tested MT version | Actual vs expected (brief) | Severity + user impact | Evidence IDs | Date reported / method | MT disposition & issue/PR link | Duo L retest outcome |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

## 3. Detailed reproducible finding report (duplicate per actual finding)

### Finding [ID] — [short neutral title]

- **Product Owner / Product Team:** [Duo L for CampusBite; MT for MT product]
- **Reported by (name, ID):** [Actual independent tester]
- **Report timestamp (+07:00):** [Actual]
- **Product URL, tested commit and revision:** [Exact]
- **Related UAT case and requirement/AC:** [Actual]
- **Preconditions and synthetic test data:** [State and test account label; no secrets]
- **Reproduction steps:** 1. [action] 2. [action] 3. [action]
- **Expected result:** [Quoted/briefly restated from Sprint 1 contract]
- **Actual result:** [Specific user-observed deviation, errors, data before/after]
- **Security/state impact:** [Unauthorized data disclosed? Unwanted stock/order state changed?]
- **Suggested severity with rationale:** [Critical / Major / Minor, and why]
- **Evidence IDs and screenshots/logs:** [Identifiers]
- **Notification channel and date:** [Actual]
- **Product Team's triage classification / reason:** [Actual decision with AC]
- **Assigned owner / issue link:** [Actual]
- **Disposition / retest / closure:** [Actual]

## 4. CampusBite accepted-defect correction chain (repeat for each corrected defect)

| Required evidence | Actual record |
|---|---|
| Finding and accepted defect GitHub issue | [Issue ID/link] |
| Defective source commit/revision and exact reproduction | [Actual] |
| Fix branch from `sprint-1-staging` and assigned owner | [Actual] |
| Regression test file/name and meaningful assertion | [Actual] |
| RED test command, tested commit, failing counts/output/evidence | [Actual] |
| Fix commit/diff and reason for change | [Actual] |
| GREEN test same name/assertion, command and passing counts/output | [Actual] |
| Broader relevant regression test results | [Actual] |
| Teammate substantive PR review, approval and CI checks | [Actual PR/run/IDs] |
| Reviewed release to `main`, Cloud Run revision and smoke check | [Actual; migration checks if applicable] |
| Partner MT independent retester, timestamp, observed actual result | [Actual; no Duo L self-signoff] |
| Final status and known minor limitations, if any | [Actual] |

**Sequence:** Reproduce real behavior → add failing meaningful automated regression test (RED) against defective implementation → fix code → same test passes (GREEN) → relevant regression tests → teammate PR review + CI → reviewed integration and deployment → MT independently retests on recorded corrected release. A test with a syntax/fixture failure or one that always passes is not valid RED/GREEN evidence.

## 5. If no genuine CampusBite defect is discovered

The professor clarified that the controlled no-defect exercise must use a real, independently reportable defect. If ordinary UAT confirms no defect, use one of these controlled options in a new Sprint staging commit: reintroduce a previously corrected defect, or, if no suitable historical fix exists, disable a required-field validation. Keep the exercise separate from the accepted release; do not claim it has started until the change and independent report actually exist.

Required exercise sequence: MT independently discovers and reports the defect; Duo L records and reproduces it; a meaningful regression test demonstrates RED against the exercise commit; the correction makes the same test GREEN; relevant regression checks run; a teammate reviews the change; the reviewed release is integrated and deployed; and MT independently retests the exact deployed correction. Record actual commits, results, review, release, deployment and retest evidence. Do not invent a failure, issue, approval or completed step.

## 6. Resolution / acceptance register (fill only with real decisions)

| Product | Independent deciding team | Exact release accepted/tested | All required cases executed? | Critical/Major resolved and independently retested? | Minor limitations explicitly accepted? | Final decision | Actual sign-off date/time and evidence |
|---|---|---|---|---|---|---|---|
| CampusBite | Team MT | R1 commit and revision are partner-reported; deployment association unverified | Partner-reported 12/12 PASS; evidence IDs reported, not independently reviewed | Zero confirmed defects reported | Pending formal decision | PENDING | Formal acceptance not supplied; deadline November 29, 2026; UAT-CB-04 forged-total error code not visible |
| Team MT product | Duo L | BorrowBase owner-reported baseline/revision; image association and session release confirmation pending | 8/8 original cases PASS after BB-UAT-06 additional verification; four additional tests PASS | No genuine defects confirmed; BB-UAT-06 resolved by verification, not code fix | Pending final decision | PENDING | Acceptance not established; results merged through PR #40; BB-EX-03 follow-up image filename remains unverified |

**Decision options:** Accepted; Accepted with explicitly documented minor limitations; Not Accepted. Unresolved critical/major or required BLOCKED testing prevents a supported acceptance sign-off.

## 7. Evidence/version index for final PDF

| Evidence ID | Event / screenshot or excerpt | Date/time (+07:00) | Tested commit / deployed revision | Actual finding/result | PDF page (after assembly) |
|---|---|---|---|---|---|
| BB-UAT-06-R2-BEFORE-REQUEST.png | Borrower B fixture request state before unauthorized checkout | November 22, 2026; time not recorded | Owner-reported BorrowBase baseline/revision; association unverified | Request `8d13c6b4-1ae4-4410-aa85-110cca365193` PENDING; ASSET-A AVAILABLE | |
| BB-UAT-06-R2-BEFORE-LOANS.png | Active loans before checkout attempt | November 22, 2026; time not recorded | Owner-reported BorrowBase baseline/revision; association unverified | Three existing active loans | |
| BB-UAT-06-R2-RESPONSE.png | Authenticated Borrower B checkout POST response | November 22, 2026; time not recorded | Owner-reported BorrowBase baseline/revision; association unverified | HTTP 403 `FORBIDDEN`; “You do not have permission for this operation.” | |
| BB-UAT-06-R2-AFTER-REQUEST.png | Fixture request state after checkout attempt | November 22, 2026; time not recorded | Owner-reported BorrowBase baseline/revision; association unverified | Request remained PENDING; asset remained AVAILABLE | |
| BB-UAT-06-R2-AFTER-LOANS.png | Active loans after checkout attempt | November 22, 2026; time not recorded | Owner-reported BorrowBase baseline/revision; association unverified | Same three active loans; no unauthorized checkout | |
| [e.g., B-CB03-01] | [Describe actual capture, do not invent] | | | | |

In the PDF, embed legible test steps, actual observations, issue/PR review text, RED/GREEN command output, deployment verification, and the independent acceptance record; GitHub hyperlinks alone are insufficient.
