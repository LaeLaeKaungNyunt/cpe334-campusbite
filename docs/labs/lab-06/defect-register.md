# CPE334 Lab 6 — Duo L Defect Register, Triage and Resolution Trace

**Status:** PRELIMINARY EXECUTION STATUS — Team MT reports CampusBite CB-01–CB-08 as 8/8 PASS with no defects; Duo L reports BorrowBase BB-UAT-01–08 as 7 PASS and 1 BLOCKED, plus BB-EX-01–04 as PASS. No genuine incoming or outgoing defect is confirmed. Detailed MT evidence and formal acceptance remain outstanding. Updated Lab 6 deadline: November 29, 2026.
**Duo L (CampusBite Product Team and MT independent UAT Team):** 3481 Lae Lae Kaung Nyunt; 3484 Naing Zay Linn.  
**Partner:** Team MT — 3482 Moe Htet Aung; 3486 Thu Thu Wai.  
**Purpose:** Keep incoming CampusBite findings separate from outgoing MT findings. Record every genuine report, even if the result is duplicate, not-defect or enhancement.

## 1. Incoming findings — MT reports against CampusBite

**Present state:** Team MT reports that it independently executed CampusBite cases CB-01–CB-08 with 8/8 PASS and no defects. This is partner-reported status, not independently verified case evidence. The detailed PDF, case-by-case observations, exact tested release and formal independent acceptance remain outstanding. Duo L has no confirmed incoming finding to record at this time; the findings table remains empty.

| Finding ID / Issue URL | Reporter (MT tester) | CampusBite case/AC | Tested commit/revision | Actual vs expected (brief) | Impact-based severity | Triage classification + reason | Assigned Duo L owner | Fix / disposition status | MT retest / closure evidence |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

**Triage classifications:** accepted defect; duplicate (link original issue); not-defect (cite requirement/observations); enhancement (outside Sprint 1 scope). Reproduce ambiguous reports before dismissing them. For accepted defects, severity is Critical / Major / Minor and must be justified by user impact. Critical or Major blocks acceptance until corrected and independently retested. Minor must be fixed or expressly accepted by MT as a known limitation. Features outside Sprint 1 do not become defects merely for being absent.

## 2. Outgoing findings — Duo L reports against Team MT's product

**Present state:** Duo L completed BorrowBase UAT on November 21, 2026: BB-UAT-01–08 resulted in 7 PASS and 1 BLOCKED; BB-EX-01–04 were recorded PASS. BB-UAT-06 remains BLOCKED because HTTP 403 and unchanged state do not establish the required exact `FORBIDDEN` authorization error. This is a test limitation, not an accepted defect. No genuine outgoing defect has been confirmed. BorrowBase results are documented and merged through PR #40; the tested release association remains unconfirmed.

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
| CampusBite | Team MT | Exact tested release pending MT confirmation | Partner-reported 8/8 PASS; detailed evidence pending | No confirmed defects | Pending formal decision | PENDING | Formal acceptance not supplied; deadline November 29, 2026 |
| Team MT product | Duo L | BorrowBase release association pending confirmation | 7 PASS, 1 BLOCKED; four additional tests PASS | No confirmed defects; BB-UAT-06 remains BLOCKED | Pending final decision | PENDING | Acceptance not established; results merged through PR #40 |

**Decision options:** Accepted; Accepted with explicitly documented minor limitations; Not Accepted. Unresolved critical/major or required BLOCKED testing prevents a supported acceptance sign-off.

## 7. Evidence/version index for final PDF

| Evidence ID | Event / screenshot or excerpt | Date/time (+07:00) | Tested commit / deployed revision | Actual finding/result | PDF page (after assembly) |
|---|---|---|---|---|---|
| [e.g., B-CB03-01] | [Describe actual capture, do not invent] | | | | |

In the PDF, embed legible test steps, actual observations, issue/PR review text, RED/GREEN command output, deployment verification, and the independent acceptance record; GitHub hyperlinks alone are insufficient.
