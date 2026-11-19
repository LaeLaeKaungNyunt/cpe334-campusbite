# CPE334 Lab 6 — Duo L Defect Register, Triage and Resolution Trace

**Status:** PREPARATION ONLY; actual independent UAT and findings are not yet recorded.  
**Duo L (CampusBite Product Team and MT independent UAT Team):** 3481 Lae Lae Kaung Nyunt; 3484 Naing Zay Linn.  
**Partner:** Team MT — 3482 Moe Htet Aung; 3486 Thu Thu Wai.  
**Purpose:** Keep incoming CampusBite findings separate from outgoing MT findings. Record every genuine report, even if the result is duplicate, not-defect or enhancement.

## 1. Incoming findings — MT reports against CampusBite

**Present state:** Not yet tested / no findings recorded as of document preparation; do not describe this as `0 defects found` until execution is complete.

| Finding ID / Issue URL | Reporter (MT tester) | CampusBite case/AC | Tested commit/revision | Actual vs expected (brief) | Impact-based severity | Triage classification + reason | Assigned Duo L owner | Fix / disposition status | MT retest / closure evidence |
|---|---|---|---|---|---|---|---|---|---|
| [Add a row per actual finding] | | | | | | | | | |

**Triage classifications:** accepted defect; duplicate (link original issue); not-defect (cite requirement/observations); enhancement (outside Sprint 1 scope). Reproduce ambiguous reports before dismissing them. For accepted defects, severity is Critical / Major / Minor and must be justified by user impact. Critical or Major blocks acceptance until corrected and independently retested. Minor must be fixed or expressly accepted by MT as a known limitation. Features outside Sprint 1 do not become defects merely for being absent.

## 2. Outgoing findings — Duo L reports against Team MT's product

**Present state:** MT handoff and independent execution pending; no outgoing findings recorded yet.

| Finding ID / MT Issue URL | Duo L reporter (3481/3484) | MT case/requirement | Tested MT version | Actual vs expected (brief) | Severity + user impact | Evidence IDs | Date reported / method | MT disposition & issue/PR link | Duo L retest outcome |
|---|---|---|---|---|---|---|---|---|---|
| [Add a row per actual finding] | | | | | | | | | |

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

- [ ] Confirm MT actually executed all agreed cases; record its signed/recorded independent acceptance decision for the healthy release.
- [ ] Contact instructor/TA for a **controlled defect exercise** on an isolated version or branch, separately from the accepted live Sprint 1 release.
- [ ] Record request, approval/instructions, exercise version, RED/GREEN proof, review, release mechanism and independent retest as the instructor directs.
- [ ] If instructor/TA does not provide the exercise despite timely request, record the unresolved dependency honestly. Never manufacture a failure or deliberately break the live assessed release.

## 6. Resolution / acceptance register (fill only with real decisions)

| Product | Independent deciding team | Exact release accepted/tested | All required cases executed? | Critical/Major resolved and independently retested? | Minor limitations explicitly accepted? | Final decision | Actual sign-off date/time and evidence |
|---|---|---|---|---|---|---|---|
| CampusBite | Team MT | | | | | | |
| Team MT product | Duo L | | | | | | |

**Decision options:** Accepted; Accepted with explicitly documented minor limitations; Not Accepted. Unresolved critical/major or required BLOCKED testing prevents a supported acceptance sign-off.

## 7. Evidence/version index for final PDF

| Evidence ID | Event / screenshot or excerpt | Date/time (+07:00) | Tested commit / deployed revision | Actual finding/result | PDF page (after assembly) |
|---|---|---|---|---|---|
| [e.g., B-CB03-01] | [Describe actual capture, do not invent] | | | | |

In the PDF, embed legible test steps, actual observations, issue/PR review text, RED/GREEN command output, deployment verification, and the independent acceptance record; GitHub hyperlinks alone are insufficient.
