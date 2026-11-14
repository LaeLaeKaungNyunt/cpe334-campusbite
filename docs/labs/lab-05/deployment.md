# CampusBite — Lab 5 Deployment Guide

## 1. Overview

CampusBite is a campus food pre-ordering application with two authenticated roles: CUSTOMER and OPERATOR.

This Lab 5 deployment uses the accepted Sprint 1 application and focuses on Docker packaging, automated CI, Google Cloud deployment, persistent data, and repeatable releases.

**Repository:** https://github.com/LaeLaeKaungNyunt/cpe334-campusbite

**GCP Project ID:** `cpe334-campusbite-3481`

**Deployed region:** `asia-southeast1` (Singapore)

**Deployment status:** Episodes 1–6 completed (cloud readiness, Docker packaging, CI quality gate, initial Cloud Run deployment, and live smoke tests verified). Episode 7 (automated continuous deployment pipeline and planned R2 release verification) is currently in progress on branch `feature/lab5-release-proof`, with automatic GitHub Actions deployment pending end-to-end verification. Episode 8 (persistence and rollback verification) is pending.

## 2. Technology Stack

| Component | Technology | Status |
|---|---|---|
| Frontend | React, TypeScript, Vite | Production build via Vite |
| Backend | Node.js 24, Express, TypeScript | Multi-workspace build with Prisma client |
| ORM | Prisma | PostgreSQL schema and migrations |
| Database | PostgreSQL 16 | Local Docker Compose and Cloud SQL |
| Tests | Vitest and Supertest | 51 automated backend acceptance tests |
| Deploy Tests | Python 3.14 (unittest), Bash stubs | Verification for deployment scripts |
| Containerization | Docker | Multi-stage Node.js 24 Debian Bookworm-slim (Episode 3) |
| Cloud hosting | Google Cloud Run | Unified container service `campusbite` (initial deployment completed) |
| Managed database | Google Cloud SQL | PostgreSQL 16 instance `campusbite-pg` |
| CI | GitHub Actions | Automated checks on PRs (`ci-docker.yml`, branch gate verified) |
| CD / Automated Release | GitHub Actions & Bash | Routine releases via `deploy/release.sh` (pending end-to-end verification) |

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

Cloud SQL persistence across application restart and redeployment will be verified in Episode 8.

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
8. **Automated Continuous Deployment (Pending End-to-End Verification):** Routine deployment executes `deploy/release.sh`:
   - Validates the commit SHA and resolves the immutable `@sha256` image digest in Artifact Registry.
   - Updates and executes Cloud Run migration job `campusbite-migrate` with `--wait`. If the migration fails, deployment stops immediately without affecting the live service.
   - Updates Cloud Run service `campusbite` to the new image digest and restores 100% traffic via `--to-latest`.
   - Runs automated post-deployment smoke tests (`deploy/smoke_test.py`) against the live service URL.
9. **Planned Release Proof (Episode 7 in progress):**
   - The initial release (R1) established the baseline Cloud Run service.
   - The planned second release (R2) introduces a visible release verification banner in the frontend footer:
     `<p>CampusBite Lab 5 — Automated Release Verification: R2</p>`.
   - Automatic GitHub Actions deployment is pending end-to-end verification; upon merging the release PR into `main`, the automated workflow is designed to deploy R2 to demonstrate hands-off continuous deployment.
   - *Note: The R2 release change is prepared on `feature/lab5-release-proof` and is currently in progress; it is not yet verified or deployed to the live environment.*

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
| Automatic GitHub Actions deployment | Pending end-to-end verification | Workflow implementation and live release execution in progress |
| Automatic release proof (R2) | In progress | Planned R2 footer banner prepared on `feature/lab5-release-proof` |
| Cloud persistence and rollback | Pending Episode 8 | Scheduled for post-release verification |

## 10. Team Responsibilities

- **67070503481 — Lae Lae Kaung Nyunt (3481):** Led GCP infrastructure, Workload Identity Federation (WIF), GitHub environment configuration, branch ruleset, initial cloud deployment, R2 application change, and documentation.
- **67070503484 — Naing Zay Linn (3484):** Led CI workflow development, the failing-PR gate demonstration (PR #24), and Episode 7 automatic deployment workflow implementation.

**Reviewer and Approval Convention:**
Both members perform testing, peer reviews, and merges of their teammate's approved PRs. All changes must be submitted via Pull Requests. The designated reviewer inspects the changes, verifies test and CI results, and merges the PR upon approval. Authors never merge their own Pull Requests.

Both members participate in implementation, testing, review, documentation, and cloud operations.
