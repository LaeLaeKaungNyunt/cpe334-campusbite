# CampusBite — Three-Sprint Development Plan

**Version:** v0.1 proposed, 7 November 2026  
**Primary assessment:** Deliverable 1 Part D (5 points)

The team develops one continuous full-stack application using the same repository and two students. Every sprint uses feature contracts, Issues, feature branches from sprint staging, teammate-reviewed PRs, integration testing, a reviewed release to `main`, and version/tag evidence. A feature is not complete merely because its UI exists.

## Sprint 1 — Small complete ordering slice

**Deadline:** 8 November 2026, 23:59 (Deliverable 1)  
**Goal:** Locally runnable release with authentication, two roles, a real order transaction, persistence, operator acceptance, negative rules and access checks.

| Feature | Scope | Dependency / criterion |
|---|---|---|
| F-01 | Login, logout, current identity, Customer/Operator backend authorization | User/session schema and seed; AC-01–AC-05 |
| F-02 | Customer menu and availability states | MenuItem schema and seed; AC-06–AC-08 |
| F-03 | Multi-item order, validated quantities/stock, server totals, own-order retrieval | F-01, F-02 and transactional database; AC-09–AC-14 |
| F-04 | Operator incoming orders and pending-to-accepted transition | F-01 and F-03; AC-15–AC-19 |

**Definition of sprint outcome:** Complete UI → API → PostgreSQL journey; normal accepted order, invalid order rejection, wrong-role/ownership rejection; automated unit/API/db tests and selected UI tests. Reproducible README, release on `main`, tag/commit, team-reviewed Issues/PRs and evidence PDF Parts A–F. Docker/CI/GCP are **not** due yet.

**Suggested release tag:** `v0.1.0-sprint1` (actual tag and SHA recorded only after release).

## Sprint 2 — Café operations expansion

**Deadline:** 29 November 2026 (Deliverable 2)  
**Goal:** Complete the remaining core operational workflows with contracts and tested integration.

| Feature | Scope | Dependencies |
|---|---|---|
| F-05 | Operator menu creation/editing, activation, prices, stock adjustments | F-01, F-02 and shared schema |
| F-06 | Cancel pending order and restore stock exactly once | F-03 transaction + order state |
| F-07 | ACCEPTED → PREPARING → READY → COMPLETED, customer status view | F-04 and state validation |
| F-08 | Record and view synthetic payment state | F-04, F-07 |

**Definition of sprint outcome:** All F-05–F-08 features implemented under pre-implementation contracts with tests and reviewed PRs. New workflows integrated with Sprint 1; cloud-deployed release candidate with CI and regression results. Updated requirements/test mapping and defect status. Work on Sprint 3 contracts and bounded implementation progress before 29 November; disclose remaining work.

**Suggested release tag:** `v0.2.0-sprint2` (provisional).

## Sprint 3 — Reporting, resilience and release

**Progress checkpoint:** 29 November 2026  
**Final deadline:** 13 December 2026  
**Goal:** Finish remaining planned features and harden a verified product.

| Feature | Scope | Dependencies |
|---|---|---|
| F-09 | Own-order and operator search/filtering; completed-and-simulated-paid sales summary | F-05–F-08; stable order/payment states |
| F-10 | Error and empty states, usability, security/regression, final QA and release | All features; Lab 5–7 results |

**Definition of final outcome:** Full product and deployed release, regression/UAT/re-test evidence, complete FR/BR/NFR→feature→AC→test→result traceability, known limitations/defect status, reproducible setup, one-page release summary and a demo video (at most 10 minutes) involving both students.

**Suggested release tag:** `v1.0.0` (provisional).

## Interleaved group labs on the same application

| Date due | Lab | How it uses the evolving release |
|---|---|---|
| 15 Nov | Lab 5 | Docker, build/test CI, enforced failing check, GCP deployment, repeatable main release. |
| 22 Nov | Lab 6 | Exchange UAT with another team; classify findings, regression-test/fix a real accepted defect, independent retest. |
| 29 Nov | Lab 7 | Instructor/TA-approved *change to existing behavior* (not merely backlog work), impact analysis, test-first change, regression, metrics, release readiness. |

## Team participation and delivery dependencies

- **3481:** F-01 and F-04 lead in Sprint 1; review F-02 and F-03.
- **3484:** F-02 and F-03 lead in Sprint 1; review F-01 and F-04.
- **Both:** SRS/SDS decisions, test design, integration, PR review, release and evidence. Rotate leads in later sprints.
- **Local tools:** 3481 develops in Antigravity; 3484 develops in VS Code. Each uses their own GitHub identity and local repository clone.
- Initial shared data/API contracts should merge before parallel feature work that depends on them; avoid incompatible schema migrations.
- Keep the final assessed release immutable by recording the tag/commit. Later fixes use new commits/releases, not silent replacement of history.

## Schedule risk and contingency

The 8 November checkpoint is close. Prioritize the tested complete Sprint 1 journey, contracts and credible execution evidence; defer optional UI polish and later-sprint features. If a planned item is incomplete, disclose it with remaining-work scope and do not claim that a screenshot or a mock replaces a passing real API/database test. Changes to the three-sprint allocation need an explicit reviewed decision and updated traceability.
