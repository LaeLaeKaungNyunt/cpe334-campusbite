# F-10 Product Hardening and Final Release Readiness

**Sprint 3 · Deliverable 2 contract baseline · v0.1 draft · Member 3481 · Pending Duo L review**

**Requirements:** NFR-01, NFR-02, NFR-03, NFR-04, NFR-05, NFR-06

**Dependencies:** F-01–F-09, Lab 5 deployment/persistence findings, Lab 6 UAT findings, Lab 7 F-04 change

**Contract status:** Proposed for review. **F-10 acceptance/test status: Designed / Not run.** Existing feature and release regressions are identified separately and do not by themselves complete F-10.

**Sources:** [SRS](../../srs.md) · [Feature inventory](../../features.md) · [System SDS](../../system-sds.md) · [Traceability](../../traceability.md) · [F-09 search and reporting](f09-search-reporting.md)

## 1. Purpose, scope and boundaries

F-10 is the final hardening and release-readiness feature for the existing single-café CampusBite application. It verifies that completed features remain secure, consistent, reproducible, persistent and deployable, and that the user interface handles expected errors and empty states safely. It also provides measured performance evidence for NFR-05 and a documented release decision.

F-10 is primarily a **cross-feature verification and corrective-maintenance effort**, not a new business workflow. It does not introduce real payments, delivery, customer registration, notifications, a second café or a new role. A newly discovered defect must be recorded and resolved through an independently reviewed change with corresponding regression evidence; a green existing suite alone is not proof of every F-10 criterion.

**Deliverable 2 checkpoint:** A reviewed engineering contract and a clearly distinguished inventory of existing evidence, unverified requirements and work remaining for Final Delivery. The complete F-10 implementation/acceptance milestone is targeted for Final Delivery on 13 December 2026, rather than presumed complete on 29 November.

## 2. Software Design Specification (SDS)

### 2.1 Existing architecture and change strategy

Reuse the current React frontend, Express REST API, session/role/ownership controls, Prisma/PostgreSQL persistence, Docker configuration, GitHub Actions pipeline and Google Cloud Run/Cloud SQL deployment. F-10 requires **no new endpoint or database migration by default**. Corrective changes, if necessary, must identify the actual impacted component, affected contract(s), migration implications (if any), tests and reviewed PR.

| Area | Design / verification approach | Requirement |
|---|---|---|
| Security | Apply the existing session middleware and Operator/Customer ownership rules to every protected API; verify safe responses for guests, wrong roles and other customers. Passwords remain salted hashes. | NFR-01 |
| Data integrity | Preserve atomic checkout/stock operations, exactly-once cancellation restoration, saved prices/totals and independent order/payment states during valid and invalid transitions. | NFR-02 |
| Reproducibility | Verify documented setup from a clean **isolated local/test** database, migration, synthetic seed, build and tests on the identified commit. | NFR-03 |
| Persistence | Retrieve existing saved records after controlled application restart and, where safely available, test-database restart; retain data through deployed release checks. | NFR-04 |
| Performance | Benchmark selected authenticated API reads in a seeded demonstration environment of up to 1,000 orders, excluding cold starts; document request volume, timing and environment. | NFR-05 |
| Deployment | Use environment-variable configuration, keep actual secrets out of version control, and verify Docker/GCP release health and persistent database connectivity. | NFR-06 |
| Failure states and usability | Preserve the existing API error envelope and documented error codes; display safe, understandable frontend loading, empty, validation and request-failure states. | NFR-01, NFR-03 |

### 2.2 API error and browser behavior

Continue to use the existing API error structure `{ "error": { "code": "...", "message": "..." } }` for controlled failures. Do not expose credentials, raw database errors, stack traces or another customer's private records. Match the existing feature contracts for HTTP status and error code; F-10 does not invent replacement codes. Invalid JSON (including malformed or unexpected `null` request shapes), missing fields, invalid IDs, unauthorized requests and rejected state transitions must not produce an unhandled server failure.

Frontend pages for public menu, My Orders, Operator Orders, menu administration, payment and F-09 search/reporting should distinguish loading, empty results, invalid input, access errors and unexpected request failures where applicable. A failed mutation must not be displayed as successful; refreshing a page must reflect the persisted backend state.

### 2.3 Verification architecture and controlled environments

- **API/integration:** Vitest and Supertest against isolated PostgreSQL with synthetic guest, Customer A, Customer B and Operator identities. Reuse feature-level tests and add focused hardening regression cases only where gaps exist.
- **UI:** Targeted browser verification or Playwright checks for critical customer/operator journeys and failure states, recording whether each case is manual or automated.
- **Persistence/reproducibility:** Local test-environment setup, idempotent seed checks and non-destructive restart/retrieval checks. Never reset or restart the production database for this purpose.
- **Performance:** Repeatable local or isolated demonstration benchmark; capture commit, hardware/environment, dataset distribution, warm-up, successful and failed requests, and p95 / percentage within threshold.
- **Deployment:** Use existing reviewed CI/CD workflow and record exact commit, image/revision, health, database readiness and tested date. Do not place credentials or real secrets in reports.

## 3. Acceptance criteria

**All S3-F10-AC identifiers below are newly proposed in this draft. They become the team's agreed contract only after 3484's review and the documentation PR is merged.** Each criterion is **Designed / Not run for F-10** until specific evidence is recorded. Earlier passing tests may contribute evidence but must be mapped explicitly.

| ID | Acceptance criterion | Requirements |
|---|---|---|
| S3-F10-AC01 | Every protected API requires an authenticated session; Operator-only and owner-scoped operations deny wrong-role and cross-customer requests without exposing private data. Passwords are salted hashes. | NFR-01 |
| S3-F10-AC02 | Across tested critical workflows, successful transactions retain correct stock, order totals and saved states; invalid or failed operations create no partial checkout, duplicate restock or inconsistent saved state. | NFR-02 |
| S3-F10-AC03 | On the submitted commit, a clean isolated setup using documented migrations and synthetic seed is reproducible, and the documented automated-test and production-build commands finish successfully. | NFR-03 |
| S3-F10-AC04 | Representative saved orders, order states, stock changes and payment states remain retrievable and correct after controlled service restart/retrieval checks; no destructive production restart is required. | NFR-04 |
| S3-F10-AC05 | On a documented seeded demonstration dataset of up to 1,000 orders, at least 95% of successful selected key API requests finish within two seconds, excluding initial cold start; report measured per-operation results and errors. | NFR-05 |
| S3-F10-AC06 | The assessed release uses environment-based configuration, has no committed real secrets, deploys through the reviewed Docker/GCP process and demonstrates working application health and persistent database readiness. | NFR-06 |
| S3-F10-AC07 | Representative API and UI validation, loading, empty and failure cases show controlled errors and safe feedback; no unhandled failures or misleading success states occur in the tested scenarios. | NFR-01, NFR-03 |
| S3-F10-AC08 | A final release record identifies the exact reviewed commit, passing regression/build evidence, deployment revision, mapped AC/test results, open defects and remaining risks; the team explicitly records READY or NOT READY for the assessed scope. | NFR-01–NFR-06 |

## 4. Software Test Specification (STS)

Use synthetic identities and an isolated PostgreSQL test database. Tests are **planned** unless their actual execution is recorded with command, commit and result; a reference to earlier coverage is not itself a new F-10 pass.

| Test ID | AC | Setup and action | Expected outcome | Initial status |
|---|---|---|---|---|
| S3-F10-T01 | AC01 | As guest, Customer A, Customer B and Operator, call representative authentication, menu-admin, order, cancellation, fulfillment, payment and search routes using permitted and forbidden identities; inspect returned data. Review password storage. | Protected calls deny unauthorized access with existing feature-specific 401/403/404 behavior and no private payload; passwords are stored as salted hashes. | Designed / Not run |
| S3-F10-T02 | AC02 | Run checkout and menu-stock tests for competing reservations/edits, failed checkout, price snapshots, numeric limits and rollback. | Only valid transactions persist; stock and totals remain consistent; no partial writes or overflow. | Designed / Not run |
| S3-F10-T03 | AC02 | Run cancellation, fulfillment, acceptance-estimate and simulated-payment tests for valid, invalid, repeated and concurrent transitions; retrieve persisted orders. | Exactly-once stock restoration and valid independent states; rejected operations do not corrupt records. | Designed / Not run |
| S3-F10-T04 | AC03 | From the assessed commit create a clean isolated local/test database, apply documented migrations, run synthetic seed twice, execute documented backend tests and frontend/backend production builds. | Setup succeeds; repeat seed does not incorrectly reset mutable stock; tests and builds pass with recorded commands and commit. | Designed / Not run |
| S3-F10-T05 | AC04 | Save/retrieve representative synthetic menu, order and payment data; restart the local application and (in an isolated test environment) database service; retrieve and compare. | Previously committed records and state are still available and unchanged. | Designed / Not run |
| S3-F10-T06 | AC05 | Coordinate with S3-F09-T08. Seed a documented test dataset containing up to 1,000 orders; warm services; run 100 sequential authenticated requests per selected key operation; log latency and errors. | Report per-operation p95, request counts and successful share within two seconds; record explicit PASS/FAIL against 95% threshold. Do not count cold-start requests. | Designed / Not run |
| S3-F10-T07 | AC06 | Review tracked configuration for exposed real secrets; verify documented environment variables, container/build workflow, deployed commit/revision, health and database readiness. | No committed real secrets found; build/deployment succeeds; live health and persistent database readiness pass with release identifiers. | Designed / Not run |
| S3-F10-T08 | AC07 | Exercise malformed JSON, unexpected `null`, missing and invalid fields/IDs, access denials, invalid state transitions and unavailable resources against applicable APIs. | Controlled feature-specific 4xx/404 responses where expected; safe error envelopes; no leaked internals or uncaught 500 caused by expected bad inputs. | Designed / Not run |
| S3-F10-T09 | AC07 | Exercise public, customer and operator screens with an empty result, validation error, slow/failed request and a rejected mutation. Record manual or Playwright execution. | Understandable loading/empty/error states; no false success or unauthorized data; saved state remains authoritative after refresh. | Designed / Not run |
| S3-F10-T10 | AC08 | Audit release branch/PR, actual CI logs, merged test evidence, AC-to-test matrix, defect register, remaining work and deployed revision; compare tested commit to submitted commit. | A dated, reviewable release record supports an explicit READY/NOT READY decision; missing or failing criteria remain visible. | Designed / Not run |

**Existing evidence available for mapping (not new F-10 test execution):** The 27 November 2026 Deliverable 2 candidate at main commit `68420a4` / Cloud Run revision `campusbite-00009-ghn` recorded 161 passing backend tests across nine files, successful deployment, health/database readiness and selected manual customer/operator workflows. Focused feature evidence includes F-05 `menuAdmin.test.ts` 20/20 PASS. Record actual earlier test IDs/versions in the traceability matrix; do not claim the entire F-10 STS passed from these results.

## 5. Definition of Done

F-10 is **DONE** only when all applicable items below are demonstrated for the assessed final release:

1. The F-10 engineering contract, AC, STS, and requirement mapping are reviewed by the other team member and merged in version control.
2. Every F-10 AC has an actual test/review record, with status PASS, FAIL, BLOCKED or NOT RUN, identifying command or evidence, date and source commit.
3. Relevant security, data-integrity, API failure and UI regression gaps are tested; defects are classified and addressed or explicitly dispositioned with release risk recorded.
4. Reproducible setup, migration, synthetic seed, backend tests and production builds are verified on a known commit.
5. Persistence/retrieval and documented NFR-05 benchmark evidence are included, with the actual threshold result stated even if it fails.
6. The release is integrated by reviewed PR; CI/CD and deployment evidence identify the submitted commit and Cloud Run revision; health/database readiness are checked.
7. The final defect/technical-debt register, traceability matrix and dated remaining-work plan agree with the actual released implementation.
8. Both members cross-review the release evidence and record an explicit READY/NOT READY decision. A failed or unverified blocking criterion prevents an unconditional READY claim.

## 6. Sprint 3 milestone and remaining work

| Stage | Required activity | Responsible | Evidence/status at contract drafting |
|---|---|---|---|
| Deliverable 2 contract | Review this F-10 AC/STS/DoD and reconcile feature inventory/requirements links | 3481 author; 3484 reviewer | Proposed draft; review pending |
| Deliverable 2 checkpoint | Preserve real Sprint 1/2 regression and deployment results, enumerate gaps, record F-09 partial milestone | Both | Existing 27 Nov candidate evidence; F-10 acceptance not yet claimed |
| Sprint 3 implementation | Implement corrective fixes and UI/API hardening where tests uncover gaps | Split by actual affected files, independently reviewed | Planned; do not infer fixes before reproducing defects |
| Sprint 3 performance | Execute/interpret NFR-05 benchmark, coordinating with F-09 S3-F09-T08 | Both | Planned / Not run |
| Final Delivery | Full regression, controlled persistence, reproducibility, deployment, traceability, defect disposition and final decision | Both | Target 13 Dec 2026 |

When coordinating with F-09, avoid duplicating its benchmark or claiming full F-09 operator reporting is implemented merely because customer filtering passed. Reuse measured evidence with clear version and scope.

## 7. Review and change-control decisions

- This document introduces **proposed** S3-F10-AC01–AC08 and S3-F10-T01–T10 identifiers. They are not historical, already-approved IDs. Finalize them only through teammate-reviewed PR.
- Use actual existing endpoint behavior and existing feature contract error codes; no speculative new HTTP route or database migration is authorized by this contract.
- Do not mark F-10 implemented from the integrated 161-test regression alone. Completion requires criterion-level evidence and remaining-work disposition.
- Keep `docs/features.md`, `docs/srs.md`, `docs/traceability.md`, Deliverable 2 Part C.2 and Part D synchronized with the reviewed contract and release status.
- Record future changes as new commits/PRs with verified tests rather than altering historical Sprint 1/2 evidence.
