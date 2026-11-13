# CampusBite — Lab 5 Deployment Guide

## 1. Overview

CampusBite is a campus food pre-ordering application with two authenticated roles: CUSTOMER and OPERATOR.

This Lab 5 deployment uses the accepted Sprint 1 application and focuses on Docker packaging, automated CI, Google Cloud deployment, persistent data, and repeatable releases.

**Repository:** https://github.com/LaeLaeKaungNyunt/cpe334-campusbite

**GCP Project ID:** `cpe334-campusbite-3481`

**Planned region:** `asia-southeast1` (Singapore)

**Deployment status:** Not deployed yet — Episodes 3–8 pending.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Tests | Vitest and Supertest |
| Containerization | Docker — Episode 3 |
| Cloud hosting | Google Cloud Run — planned |
| Managed database | Google Cloud SQL — planned |
| CI/CD | GitHub Actions — planned |

The production plan is to package the frontend and backend into one Cloud Run container, with PostgreSQL hosted separately in Cloud SQL. The frontend uses relative `/api` requests.

## 3. Environment Variables

| Variable | Purpose | Secret? | Source |
|---|---|---|---|
| `DATABASE_URL` | Prisma PostgreSQL connection | Yes, in production | Local `.env`; planned Secret Manager |
| `TEST_DATABASE_URL` | Isolated automated-test database | Test credential | Local or CI test environment |
| `SEED_DEMO_PASSWORD` | Password for synthetic seeded accounts | Yes | Private local `.env`; planned Secret Manager |
| `PORT` | Express HTTP listening port | No | Local environment or Cloud Run |
| `NODE_ENV` | Runtime mode | No | Local environment or deployment |
| `COOKIE_SECURE` | Enables HTTPS-only session cookies | No | Local environment or deployment |

`FRONTEND_ORIGIN` is present in the existing development example but is not currently read by the application source. Production deployment is planned to use same-origin frontend and API requests.

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
8. Run tests: `npm test`
9. Build frontend and backend: `npm run build`
10. Start development servers: `npm run dev`

Local frontend: `http://localhost:5173`

Local backend: `http://localhost:4000`

Application health: `/api/v1/health`

Database readiness: `/api/ready`

The readiness endpoint returns HTTP 200 when PostgreSQL is reachable and HTTP 503 when it is unavailable.

## 5. Data Persistence

CampusBite stores users, sessions, menu items, orders, and order items in PostgreSQL through Prisma.

No essential application data is stored only in container-local files.

The seed preserves existing users and menu-item records when rerun. In particular, it does not reset existing stock quantities.

Cloud SQL persistence across application restart and redeployment will be verified in Episode 8.

## 6. Planned GCP Resources

The following names are provisional and must be confirmed against the actual deployment scripts.

| Resource | Planned name |
|---|---|
| Cloud Run service | `campusbite` |
| Artifact Registry repository | `campusbite` |
| Cloud SQL instance | `campusbite-pg` |
| PostgreSQL database | `campusbite` |
| Cloud Run migration job | `campusbite-migrate` |
| Runtime service account | `campusbite-runner` |
| Deployment service account | `campusbite-deployer` |

Secret Manager names and other required resources will be documented after the deployment scripts are adapted.

## 7. CI and Release Procedure

Planned release procedure:

1. Create a GitHub Issue and a feature branch from `sprint-1-staging`.
2. Make and test the changes.
3. Open a Pull Request into `sprint-1-staging`.
4. Run the automated build and test checks.
5. Obtain a specific teammate review and approval.
6. Merge the approved change into staging.
7. Open a release Pull Request from staging into `main`.
8. Merge only after required checks pass.
9. Deploy the release from `main` through GitHub Actions.
10. Verify the live application and identify the deployed commit SHA.

The automated workflow, required checks, release commands, live service URL, and revision verification will be recorded after Episodes 4–7.

## 8. Cost Control

The team uses a Google Cloud Free Trial account.

An alerts-only budget named `CPE334-CampusBite-Alert` was created with a THB 1,500 target and notification thresholds of 50%, 75%, and 90%.

Budget notifications do not automatically stop spending. Cloud SQL and other resources must be monitored and managed according to the course's cost-control instructions.

## 9. Verification Status

| Check | Status |
|---|---|
| GCP project and access | Completed |
| Billing and budget | Completed |
| Cloud-ready backend | Local verification completed |
| Automated tests | 51 passed |
| Frontend and backend build | Passed |
| Database readiness | Verified locally |
| Docker production image | Pending Episode 3 |
| CI and required quality gate | Pending Episodes 4 and 6 |
| Public GCP deployment | Pending Episode 5 |
| Automatic release | Pending Episode 7 |
| Cloud persistence and rollback | Pending Episode 8 |

## 10. Team Responsibilities

**3481:** GCP setup lead, Docker lead, initial deployment lead, release pipeline lead, and teammate reviews.

**3484:** Cloud-readiness lead, CI lead, merge-gate lead, persistence verification lead, and teammate reviews.

Both members participate in implementation, testing, review, documentation, and deployment.

This document will be updated as each Lab 5 episode is completed.