# CampusBite — Lab 5 Deployment Guide

## 1. Overview

CampusBite is a campus food pre-ordering application with two authenticated roles: CUSTOMER and OPERATOR.

This Lab 5 deployment uses the accepted Sprint 1 application and focuses on Docker packaging, automated CI, Google Cloud deployment, persistent data, and repeatable releases.

**Repository:** https://github.com/LaeLaeKaungNyunt/cpe334-campusbite

**GCP Project ID:** `cpe334-campusbite-3481`

**Deployed region:** `asia-southeast1` (Singapore)

**Deployment status:** Episodes 1–8 completed. Episode 7 automated continuous deployment and visible R2 release proof verified. Episode 8 persistence across application redeployment, safe manual rollback (reverting to previous release image `ed4bc61` without migration/seed via Cloud Run revision `campusbite-00006-nk9`, with CI skipped and image verification passing), and roll-forward recovery (restoring latest release `1400faa` with R2 banner via revision `campusbite-00007-jwv`) are fully completed and verified, with customer order data surviving redeployment and restoration intact.

## 2. Technology Stack

| Component | Technology | Status |
|---|---|---|
| Frontend | React, TypeScript, Vite | Production build via Vite (R2 release banner verified) |
| Backend | Node.js 24, Express, TypeScript | Multi-workspace build with Prisma client |
| ORM | Prisma | PostgreSQL schema and migrations |
| Database | PostgreSQL 16 | Local Docker Compose and Cloud SQL (`campusbite-pg`) |
| Tests | Vitest and Supertest | 51 automated backend acceptance tests |
| Deploy Tests | Python 3.14 (unittest), Bash stubs | Verification for deployment scripts |
| Containerization | Docker | Multi-stage Node.js 24 Debian Bookworm-slim (Episode 3) |
| Cloud hosting | Google Cloud Run | Unified container service `campusbite` (revisions verified) |
| Managed database | Google Cloud SQL | PostgreSQL 16 instance `campusbite-pg` (data persistence verified) |
| CI | GitHub Actions | Automated checks on PRs (`ci-docker.yml`, branch gate verified) |
| CD / Automated Release & Rollback | GitHub Actions & Bash | Routine releases & manual rollback/recovery via `.github/workflows/deploy.yml` and `deploy/release.sh` (Episode 7 & 8 verified) |

The production architecture packages the frontend static assets and backend Express API into a single unified container on Cloud Run, with PostgreSQL hosted separately in Cloud SQL. The frontend communicates with the backend via relative `/api` requests.

## 3. Environment Variables

| Variable | Purpose | Secret? | Source |
|---|---|---|---|
| `DATABASE_URL` | Prisma PostgreSQL connection | Yes, in production | Local `.env`; Secret Manager secret `campusbite-database-url` |
| `TEST_DATABASE_URL` | Isolated automated-test database | Test credential | Local `.env` or CI PostgreSQL service container |
| `SEED_DEMO_PASSWORD` | Password for synthetic seeded accounts | Yes | Private local `.env`; Secret Manager secret `campusbite-demo-password` |
| `PORT` | Express HTTP listening port | No | Local environment (4000) or Cloud Run (8080) |
| `NODE_ENV` | Runtime mode | No | Local environment (`development`/`test`) or Cloud Run (`production`) |
| `COOKIE_SECURE` | Enables HTTPS-only session cookies | No | Local (`false`) or Cloud Run deployment (`true`) |

The repository defines a GitHub Actions `demo` environment utilizing configuration variables for deployment targets (`PROJECT_ID`, `REGION`, etc.). Production secrets (`campusbite-database-url` and `campusbite-demo-password`) are managed exclusively in Google Cloud Secret Manager and injected into Cloud Run and Cloud Run migration jobs at runtime.

Real production passwords and connection strings must never be committed to GitHub, stored in container images, or shown in screenshots.

## 4. Local Setup and Verification

Prerequisites: Node.js 24, npm, Docker, and Docker Compose.

From the repository root:

1. Install dependencies: `npm ci`
2. Start databases: `docker compose up -d db-dev db-test`
3. Create a private `backend/.env` from `backend/.env.example` if needed.
4. Configure private local values, including `SEED_DEMO_PASSWORD`.
5. Apply database migrations: `npm run db:migrate`
6. Seed demonstration data: `npm run db:seed`
7. Verify database connectivity: `npm run db:check`
8. Run automated tests: `npm test` (51 passing tests)
9. Build frontend and backend: `npm run build`
10. Start development servers: `npm run dev`

Local development endpoints:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

Health and readiness endpoints:
- Application health: `/api/v1/health` (HTTP 200, `{"status":"ok"}`)
- Database readiness: `/api/ready` (HTTP 200, `{"db":"connected"}`)

The readiness endpoint returns HTTP 200 when PostgreSQL is reachable and HTTP 503 when it is unavailable.

Local production container verification (Episode 3):
- Build image: `docker build -t campusbite:lab5 .`
- Run production container with local database: `docker compose -f compose.yaml -f compose.lab5.yaml up --build -d`
- Test deploy script stubs:
  ```bash
  bash deploy/tests/test_deploy_stub.sh
  bash deploy/tests/test_release_stub.sh
  python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'
  ```

## 5. Data Persistence

CampusBite stores users, sessions, menu items, orders, and order items in PostgreSQL through Prisma.

No essential application data is stored in container-local files; Cloud Run containers remain completely stateless.

The database seed preserves existing users and menu-item records when rerun. In particular, it does not reset existing stock quantities or delete orders created by customers.

Database schema migrations (`prisma migrate deploy`) and optional seeding are executed via a dedicated Cloud Run Job (`campusbite-migrate`) prior to updating the live service container, ensuring schema compatibility before new code receives traffic.

### Episode 8 Persistence Baseline & Verification

Data persistence was verified against Google Cloud SQL (`campusbite-pg`) across application redeployment, rollback, and roll-forward recovery:

**Customer Order Persistence Baseline:**
- **Order ID:** `7d08127f-5c5b-44ba-b885-e82aa46c3b54`
- **Customer:** Seeded authenticated customer (`customer1@campusbite.test`)
- **Ordered Item:** Chicken Sandwich × 1
- **Order Total:** THB 85
- **Order Status:** `PENDING`
- **Payment Status:** `UNPAID`

**Verification Across Application Lifecycle:**
1. **Before Redeployment:** The order was created via the live frontend while R2 revision `campusbite-00004-4dj` was active.
2. **After Automatic Redeployment (PR #34):** After merging the rollback workflow (PR #34), automatic deployment created revision `campusbite-00005-vtt`. The order and its status remained fully intact and queryable in PostgreSQL.
3. **During Rollback (Run #5):** Rolling back to release `ed4bc6118e724a887cb49efacff0c84dd3efab67` deployed revision `campusbite-00006-nk9`, safely bypassing migrations and seeding so the database state was preserved.
4. **After Restoration (Run #6):** Rolling forward to latest `main` (commit `1400faa...`, revision `campusbite-00007-jwv`) confirmed that the original Chicken Sandwich order remained completely unchanged.

**Evidence Accuracy Notes:**
- Photographs specifically document the Chicken Sandwich order at three verified points: before redeployment, after redeployment (revision `campusbite-00005-vtt`), and after restoration (revision `campusbite-00007-jwv`).
- No separate screenshot has been confirmed showing the order while revision `campusbite-00006-nk9` was active.
- Verification confirmed data persistence across application redeployment and Cloud Run revision switches; no standalone manual application restart test was conducted.

## 6. Deployed GCP Resources

The following resources are provisioned in GCP project `cpe334-campusbite-3481`, region `asia-southeast1`, using `deploy/deploy.sh`:

| Resource | Resource Name / Identifier | Description |
|---|---|---|
| Cloud Run service | `campusbite` | Unified web service running frontend and backend |
| Cloud Run migration job | `campusbite-migrate` | Pre-deployment schema migration job |
| Artifact Registry repository | `campusbite` | Docker repository storing commit-tagged images |
| Cloud SQL instance | `campusbite-pg` | PostgreSQL 16 database instance (`db-f1-micro`) |
| Cloud SQL database | `campusbite` | Application database |
| Cloud SQL user | `campusbite` | Application database user |
| Runtime service account | `campusbite-runner` | `campusbite-runner@cpe334-campusbite-3481.iam.gserviceaccount.com` |
| Deployment service account | `campusbite-deployer` | Service account used by CI/CD workflows |
| Secret Manager DB secret | `campusbite-database-url` | PostgreSQL connection string |
| Secret Manager demo secret | `campusbite-demo-password` | Seed demo account password |

## 7. CI and Release Procedure

The team enforces a strict two-person review and deployment procedure:

1. **Feature Branching:** Developers create a feature branch (e.g., `feat/*`, `chore/*`, `fix/*`) from `sprint-1-staging`.
2. **Implementation & Testing:** Code, tests, and documentation are developed and verified locally.
3. **Pull Request to Staging:** A Pull Request is opened targeting `sprint-1-staging`.
4. **Automated CI Quality Gate:** GitHub Actions (`ci-docker.yml`) automatically runs dependency installation, Prisma migrations, database connectivity checks, Vitest backend tests (51 tests), multi-workspace build, deploy-script stub tests, and a production Docker build verification.
5. **Peer Review Protocol:** Both members perform testing, peer reviews, and merges of their teammate's approved PRs. The author never merges their own PR.
6. **Release Pull Request:** Approved changes in `sprint-1-staging` are submitted to `main` via a release PR.
7. **Release Gate:** All automated CI checks must pass, and the reviewer approves and merges into `main`.
8. **Automated Continuous Deployment Pipeline (Verified):** The workflow `.github/workflows/deploy.yml` triggers on pushes to `main` and executes:
   - Verification of the release via reusable workflow `.github/workflows/ci-docker.yml` (all 51 automated tests passing).
   - Authentication to Google Cloud via Workload Identity Federation (WIF).
   - Building and pushing the release image tagged by commit SHA to Artifact Registry.
   - Executing `deploy/release.sh`, which runs database migrations via Cloud Run Job `campusbite-migrate` with `--wait`, updates Cloud Run service `campusbite`, and routes 100% of traffic to the latest revision.
   - Running live automated smoke tests (`deploy/smoke_test.py`) against `SERVICE_URL`.
   - Verifying and recording the deployed Cloud Run revision and platform image digest.

   **Pipeline Verification and Corrective Iteration:**
   - **PR #27:** First automatic deployment release merged to `main`. The workflow successfully built, migrated the database, deployed the Cloud Run revision, and passed live smoke tests. However, the final post-deployment verification step failed because `gcloud run revisions describe` reported the resolved platform manifest digest (`linux/amd64`) while the release script tracked the multi-arch OCI image index digest.
   - **PR #28:** Fixed the OCI image index versus `linux/amd64` manifest verification in `.github/workflows/deploy.yml` by inspecting the OCI manifest with `docker buildx imagetools inspect` to resolve the matching platform architecture digest.
   - **PR #29:** Reviewed corrective release merged into `main`. The corrected GitHub Actions workflow completed with green status across all steps, with all 51 automated backend tests passing.
   - **Live Cloud Run Status:** Deployed revision `campusbite-00003-vqm` successfully received 100% of traffic, and the live `/api/ready` health endpoint returned HTTP 200 with `{"db":"connected"}`.

9. **Release Proof (R2 Verified):**
   - The initial release (R1) established the baseline Cloud Run service.
   - The second release (R2) introduced a visible release verification banner in the frontend footer:
     `<p>CampusBite Lab 5 — Automated Release Verification: R2</p>`.
   - The release proof was merged via PR #30 into `sprint-1-staging` and deployed to `main` via PR #31, successfully verifying automated continuous deployment without manual intervention.

10. **Rollback and Recovery Verification (Episode 8 Verified):**
   - **Rollback Workflow Implementation (PR #33 & PR #34):**
     - PR #33 added manual `workflow_dispatch` support to `.github/workflows/deploy.yml` with an optional `image_tag` input (40-character lowercase hexadecimal SHA), conditional CI execution, and safe `needs.ci` dependency handling.
     - PR #34 reviewed and merged the rollback workflow into `main`. The post-merge automatic deployment passed all 51 automated tests and deployed revision `campusbite-00005-vtt` with 100% traffic. Baseline customer order `7d08127f-5c5b-44ba-b885-e82aa46c3b54` survived this redeployment.
   - **Rollback Execution (GitHub Actions Run #5):**
     - **Trigger:** Manual `workflow_dispatch` on `main` with `image_tag: ed4bc6118e724a887cb49efacff0c84dd3efab67` (pre-R2 release commit from PR #29).
     - **Mode:** Rollback.
     - **CI Job:** Intentionally skipped (`needs.ci.result == 'skipped'`); existing Artifact Registry image reused without rebuilding.
     - **Database Migration:** Bypassed (`ROLLBACK=true` passed to `deploy/release.sh`, skipping migration job execution and seeding).
     - **Deployed Revision:** `campusbite-00006-nk9` received 100% traffic.
     - **Verification:** Deployment image verification reported `PASS`, and live smoke tests confirmed service health. (No photograph or direct visual observation of the R1 footer during rollback was confirmed; this step was verified via Cloud Run revision deployment, image digest matching, and automated smoke test execution).
   - **Recovery Roll-Forward Execution (GitHub Actions Run #6):**
     - **Trigger:** Manual `workflow_dispatch` on `main` leaving `image_tag` empty.
     - **Mode:** Release (re-deploying latest `main`, commit begins `1400faa`).
     - **CI Job:** Executed full verification; all 51 backend tests passed.
     - **Build & Migration:** Built and pushed the release image, executed database migration job with `--wait`.
     - **Deployed Revision:** `campusbite-00007-jwv` received 100% traffic.
     - **Verification:** Deployment image verification reported `PASS`, live `/api/ready` endpoint returned HTTP 200 with `{"db":"connected"}`, the R2 footer banner was visible again on the live frontend, and the original Chicken Sandwich order remained completely unchanged after restoration (confirmed by photograph).

## 8. Cost Control

The team uses a Google Cloud Free Trial account.

An alerts-only budget named `CPE334-CampusBite-Alert` was created with a THB 1,500 target and notification thresholds of 50%, 75%, and 90%.

Cost-control measures in effect:
- Cloud SQL instance sized to `db-f1-micro` tier with 10 GB storage.
- Cloud Run instance scaling configured to scale to zero when idle (`--min-instances=0`, `--max-instances=2`).
- Budget notifications do not automatically stop spending. Cloud SQL and other resources are monitored actively.
- Teardown automation (`deploy/teardown.sh`) is maintained to destroy initial application resources (Cloud Run services, jobs, Cloud SQL, Artifact Registry repositories, secrets, and the runtime service account) upon lab completion to stop billing. Additional IAM bindings, Workload Identity Federation (WIF) configurations, and GitHub environment settings may require separate cleanup.

## 9. Verification Status

| Check | Status | Evidence / Notes |
|---|---|---|
| GCP project and access | Completed | Project `cpe334-campusbite-3481` in `asia-southeast1` |
| Billing and budget | Completed | `CPE334-CampusBite-Alert` active (THB 1,500 budget) |
| Cloud-ready backend | Completed | Episode 2 merged (PR #15 / commit `b9b92dc`) |
| Docker production image | Completed | Episode 3 merged (PR #17 / commit `d1ffc9f`, Dockerfile & compose) |
| CI and required quality gate | Completed | Episode 4 & 6 merged (PR #19 / commit `6e31504`, PR #22 / commit `8afa33d`) |
| Failing-PR branch protection gate | Blocked (Demonstrated) | PR #24 correctly blocked by failing automated CI checks as required |
| Automated backend tests | 51 passed | Auth, menu, orders, operator, and health acceptance tests pass |
| Deployment script validation | Passed | `test_deploy_stub.sh`, `test_release_stub.sh`, `test_smoke.py` pass |
| GCP deployment scripts | Completed | Episode 5 merged (PR #21 / commit `e5801f1`, `deploy/deploy.sh`, `release.sh`) |
| Initial Cloud Run deployment | Completed | Deployed baseline service on Cloud Run via `deploy/deploy.sh` |
| Live smoke tests | Completed | Successful execution against live Cloud Run URL (`deploy/smoke_test.py`) |
| Automatic GitHub Actions deployment | Completed / Verified | PR #27 merged, manifest verification fixed in PR #28, corrective PR #29 merged; 51 tests passed, revision `campusbite-00003-vqm` serving 100% traffic, `/api/ready` HTTP 200 db connected |
| Automatic release proof (R2) | Completed / Verified | Merged in PR #31; R2 footer banner verified live on Cloud Run |
| Rollback workflow implementation | Completed / Verified | PR #33 merged via PR #34; manual dispatch with SHA validation, conditional CI skip, and migration bypass |
| Data persistence across redeployment | Completed / Verified | Order `7d08127f-5c5b-44ba-b885-e82aa46c3b54` (Chicken Sandwich × 1, THB 85) photographed before redeployment, after redeployment (`campusbite-00005-vtt`), and after restoration (`campusbite-00007-jwv`) |
| Safe manual rollback | Completed / Verified | Actions Run #5 deployed previous release `ed4bc61` to revision `campusbite-00006-nk9`; CI skipped, image verification passed, migrations bypassed |
| Recovery roll-forward | Completed / Verified | Actions Run #6 restored latest main (`1400faa`, revision `campusbite-00007-jwv`); 51 tests passed, 100% traffic routed, live R2 footer banner restored, order persisted unchanged |

## 10. Team Responsibilities

- **67070503481 — Lae Lae Kaung Nyunt (3481):** Led GCP infrastructure, Workload Identity Federation (WIF), branch protection, initial deployment, R2 frontend change, Episode 8 rollback workflow implementation, Cloud Run rollback/recovery operations, documentation, and peer reviews.
- **67070503484 — Naing Zay Linn (3484):** Led CI workflow development, failing-PR gate demonstration, Episode 7 automated deployment workflow, Episode 8 customer-order persistence testing and evidence, and peer reviews.

**Reviewer and Approval Convention:**
Both members perform testing, peer reviews, and merges of their teammate's approved PRs. All changes must be submitted via Pull Requests. The designated reviewer inspects the changes, verifies test and CI results, and merges the PR upon approval. Authors never merge their own Pull Requests.

Both members participate in implementation, testing, review, documentation, and cloud operations.
