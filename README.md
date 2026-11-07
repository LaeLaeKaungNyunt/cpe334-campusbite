# CampusBite — Campus Food Pre-Ordering and Pickup Management System

> **CPE334 Introduction to Software Engineering in the Age of AI Agents**<br>
> **Theme 4:** E-Commerce / Ordering System<br>
> **Current Sprint:** Sprint 1 — Small Complete Ordering Slice (Foundation Milestone: CHORE-01)

---

## 1. Project Overview

CampusBite is a pickup-only campus food and drink pre-ordering web application designed for a single campus café. It enables campus customers to authenticate, browse published café menus with real-time stock levels, place multi-item orders with atomic stock reservations, and track order progress. Café operators can view incoming orders and accept pending orders.

This repository implements a full-stack modular monolith:
- **Browser UI:** React + TypeScript + Vite
- **API / Application:** Node.js 24 + Express + TypeScript
- **Relational Database:** PostgreSQL 16 with Prisma ORM v6
- **Test Automation:** Vitest + Supertest (unit and API integration tests), Playwright (E2E browser tests planned)

---

## 2. Team Members

| Student ID | Name | GitHub Username | Primary IDE | Assigned Sprint 1 Leads |
|---|---|---|---|---|
| **67070503481** | Lae Lae Kaung Nyunt | [`LaeLaeKaungNyunt`](https://github.com/LaeLaeKaungNyunt) | Google Antigravity | F-01 (Auth), F-04 (Operator) |
| **67070503484** | Naing Zay Linn | [`naingzaylinn`](https://github.com/naingzaylinn) | Visual Studio Code | F-02 (Menu), F-03 (Orders) |

Both team members collaborate on the shared repository, architecture decisions, database migrations, cross-peer pull request reviews, and integration verification.

---

## 3. Technology Stack

- **Runtime & Package Management:** Node.js 24 LTS (`.nvmrc`), npm 11+ with npm workspaces
- **Frontend (`frontend/`):** React 18, TypeScript, Vite, responsive vanilla CSS
- **Backend (`backend/`):** Express 4, TypeScript, Prisma ORM v6 (`6.4.1`), `bcryptjs`, `dotenv`
- **Database (`compose.yaml`):** PostgreSQL 16 Alpine Docker containers:
  - Development database on host port **5433** (`campusbite_dev`)
  - Test database on host port **5434** (`campusbite_test`)
- **Automated Testing:** Vitest 3, Supertest 7
- **Database Modeling:** Prisma Schema with custom SQL migration enforcement for numeric `CHECK` constraints

---

## 4. Prerequisites

Before setting up the project, ensure the following software is installed on your workstation:
1. **Node.js 24 LTS:** Verify with `node -v` (e.g. `v24.14.0`).
2. **npm 11+:** Verify with `npm -v` (e.g. `11.9.0`).
3. **Docker Desktop:** Required for running local PostgreSQL 16 services. Verify with `docker --version` and `docker compose version`.
4. **Git:** Verify with `git --version`.

---

## 5. Repository Structure

```
cpe334-campusbite/
├── .gitignore                    # Excludes node_modules, .env, build/dist, coverage, OS clutter
├── .nvmrc                        # Pinned Node.js 24 runtime
├── compose.yaml                  # Local PostgreSQL 16 development (5433) and test (5434) containers
├── package.json                  # Root npm workspace configuration & coordinated scripts
├── package-lock.json             # Pinned reproducible dependency lockfile
├── README.md                     # Comprehensive setup, run, and handoff instructions
├── backend/
│   ├── .env.example              # Safe example configuration for local database URLs and ports
│   ├── package.json              # Express, Prisma v6, TypeScript, Vitest, Supertest
│   ├── tsconfig.json             # Strict TypeScript configuration (NodeNext ESM)
│   ├── prisma/
│   │   ├── schema.prisma         # Data model: User, Session, MenuItem, Order, OrderItem
│   │   ├── migrations/           # Versioned SQL migrations with check constraints
│   │   └── seed.ts               # Idempotent synthetic demo data seed script
│   └── src/
│       ├── app.ts                # Configured Express application (exported without listener)
│       ├── server.ts             # Server entry point listening on PORT (default 4000)
│       ├── lib/
│       │   └── prisma.ts         # Singleton Prisma client instance
│       ├── scripts/
│       │   └── db-check.ts       # Database connectivity check script (exits nonzero on error)
│       └── tests/
│           └── health.test.ts    # Vitest + Supertest API health endpoint tests
├── frontend/
│   ├── index.html                # Application HTML entry point
│   ├── package.json              # React 18, Vite, TypeScript
│   ├── tsconfig.json             # Frontend TypeScript configuration
│   ├── vite.config.ts            # Vite config with proxy: /api -> http://localhost:4000
│   └── src/
│       ├── App.tsx               # CampusBite shell with live API connectivity indicator
│       ├── index.css             # Base responsive application styling
│       └── main.tsx              # React DOM mounting
└── docs/                         # Approved requirements, SDS, sprint plans, and test specs
    ├── srs.md                    # Software Requirements Specification
    ├── system-sds.md             # System-Level Software Design Specification
    ├── features.md               # Feature inventory (F-01 through F-10)
    ├── traceability.md           # Requirements-to-feature traceability matrix
    └── sprints/
        ├── plan.md               # Three-sprint delivery roadmap
        └── sprint-1/
            ├── f01-auth.md       # F-01 Feature Contract & STS
            ├── f02-menu.md       # F-02 Feature Contract & STS
            ├── f03-orders.md     # F-03 Feature Contract & STS
            ├── f04-operator.md   # F-04 Feature Contract & STS
            └── test-specification.md # Software Test Specification (TEST-01 to TEST-19)
```

---

## 6. Fresh Setup Guide

Follow these commands in order. Commands are provided for both **macOS / Linux** and **Windows PowerShell**.

### Step 1: Clone and Checkout Branch

```bash
# macOS / Linux / Windows
git clone https://github.com/LaeLaeKaungNyunt/cpe334-campusbite.git
cd cpe334-campusbite
git checkout chore/sprint1-foundation
```

### Step 2: Use Node.js 24

```bash
# macOS / Linux (using nvm)
nvm use

# Windows (ensure Node 24 is active)
node -v
```

### Step 3: Install Dependencies

Install all root, backend, and frontend packages with the reproducible lockfile:

```bash
# macOS / Linux / Windows
npm install
```

### Step 4: Start Local PostgreSQL Containers

Ensure Docker Desktop is running, then start the development and test databases:

```bash
# macOS / Linux / Windows
docker compose up -d
```

Verify that both containers are running and healthy:
```bash
docker ps
```
You should see `campusbite-db-dev` listening on port `5433` and `campusbite-db-test` on `5434`.

### Step 5: Configure Environment Variables

Create your local backend environment configuration from the safe example file:

**macOS / Linux:**
```bash
cp backend/.env.example backend/.env
```

**Windows PowerShell:**
```powershell
Copy-Item backend/.env.example backend/.env
```

> **Note:** `.env` is ignored by Git and must never be committed.

### Step 6: Apply Database Migrations

Apply the existing schema migrations (including SQL check constraints) to your local development database and generate the Prisma Client:

```bash
# macOS / Linux / Windows
npm run db:migrate
```

### Step 7: Seed Synthetic Demonstration Data

Populate the database with synthetic accounts and menu items:

```bash
# macOS / Linux / Windows
npm run db:seed
```

### Step 8: Verify Database Connection

Verify that the application can query the PostgreSQL database through Prisma:

```bash
# macOS / Linux / Windows
npm run db:check
```
*Expected output:* `[db:check] Connection successful. Database status: Users in DB = 3, MenuItems in DB = 4`.

---

## 7. Running the Application

### Development Mode

Start both the backend API and frontend Vite development server concurrently:

```bash
# macOS / Linux / Windows
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:4000](http://localhost:4000)
- **Backend Health Check:** [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

Vite is pre-configured with a development proxy: requests from the browser to `/api/*` on port `5173` are automatically forwarded to `http://localhost:4000/api/*`.

---

## 8. Building and Testing

### Build for Production

Compile backend TypeScript and produce the optimized frontend distribution:

```bash
# macOS / Linux / Windows
npm run build
```

### Run Automated Tests

Execute the Vitest test suite using Supertest against the exported Express application:

```bash
# macOS / Linux / Windows
npm test
```

*Expected output:*
```
✓ src/tests/health.test.ts (2 tests)
  ✓ GET /api/v1/health > returns HTTP 200 with status ok
  ✓ GET /api/v1/health > does not leak internal headers, secrets, database info, or sensitive config
```

---

## 9. Synthetic Demonstration Accounts

All accounts use synthetic demonstration data with passwords securely hashed with `bcryptjs` (salt rounds: 10). Plaintext passwords are never stored in the database.

| Account Type | Email | Default Seed Password | Role |
|---|---|---|---|
| **Customer A** | `customer1@campusbite.test` | `DemoPassword123!` | `CUSTOMER` |
| **Customer B** | `customer2@campusbite.test` | `DemoPassword123!` | `CUSTOMER` |
| **Operator** | `operator@campusbite.test` | `DemoPassword123!` | `OPERATOR` |

### Seeded Menu Items

| Item Name | Price in Satang | Price in THB | Stock Quantity | Status | Note |
|---|---|---|---|---|---|
| **Iced Latte** | 6500 | ฿65.00 | 10 | Active | Available |
| **Chicken Sandwich** | 8500 | ฿85.00 | 5 | Active | Available |
| **Croissant** | 4500 | ฿45.00 | 0 | Active | Displays "Sold Out" |
| **Seasonal Matcha Latte** | 7500 | ฿75.00 | 15 | Inactive | Omitted from customer view |

*(Note: Two Iced Lattes [13,000 satang] + one Chicken Sandwich [8,500 satang] totals 21,500 satang or ฿215.00).*

---

## 10. Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| `failed to connect to the docker API` | Docker Desktop daemon is not running | Launch Docker Desktop (`open -a Docker` on macOS or start Docker Desktop on Windows) and wait for the engine to initialize. |
| `Can't reach database server at localhost:5433` | PostgreSQL container is stopped or still starting | Run `docker compose up -d` and check container status with `docker ps`. Wait until the status shows `(healthy)`. |
| Port `5433` or `5434` already in use | Local PostgreSQL or another service is listening on those ports | Check active listeners (`lsof -i :5433` on macOS or `Get-NetTCPConnection -LocalPort 5433` in PowerShell). Stop conflicting processes or adjust host port mappings in `compose.yaml`. |
| `P2023: Error creating UUID` | Non-hex characters used in manually specified UUIDs | Ensure all seed UUIDs conform to RFC 4122 using only hexadecimal digits `[0-9a-fA-F]`. |
| `EADDRINUSE: address already in use :::4000` | Another backend process is holding port 4000 | Terminate the existing process listening on port 4000 before running `npm run dev`. |
| `connect EPERM 127.0.0.1` during `npm test` | Sandbox isolation blocking TCP loopback sockets | Run the tests in an environment where local loopback connections are permitted (`npm test`). |

---

## 11. Current Limitations and Upcoming Features

This milestone (**CHORE-01**) establishes the shared foundation and infrastructure only:
- Relational schema, migrations, and SQL check constraints
- Express backend application shell with health endpoint
- Vite + React frontend placeholder with live backend connectivity indicator
- Automated test runner configuration (Vitest + Supertest)
- Containerized development and test databases

**Features scheduled for implementation in subsequent Sprint 1 issues:**
- **Issue #1 (F-01 Authentication):** Customer & Operator login, session cookies, `/auth/me`, logout, role authorization guards.
- **Issue #2 (F-02 Menu Browsing):** Customer menu browsing, stock display, sold-out indicators, and error feedback.
- **Issue #3 (F-03 Customer Orders):** Multi-item order creation, server-authoritative satang calculations, atomic stock decrement transactions, and own-order history.
- **Issue #4 (F-04 Operator Order Management):** Operator incoming order feed and atomic `PENDING → ACCEPTED` state transition.

*No business logic endpoints or mock data exist for unfinished features; mock responses are strictly prohibited until the corresponding feature contracts and tests are merged.*
