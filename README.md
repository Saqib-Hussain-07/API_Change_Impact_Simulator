# API Change Impact Simulator

> Detect breaking REST API changes before they reach production, know exactly which consumers are affected, and simulate impact with live mock testing.

[![CI](https://github.com/Saqib-Hussain-07/API_Change_Impact_Simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/Saqib-Hussain-07/API_Change_Impact_Simulator/actions/workflows/ci.yml)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development](#local-development)
- [Demo Walkthrough](#demo-walkthrough)
- [API Reference](#api-reference)
- [Classification Rules](#classification-rules)
- [Running Tests](#running-tests)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

The **API Change Impact Simulator** solves a core problem in API-driven organizations: when an API owner modifies an OpenAPI contract, there is currently no automated way to know which downstream consumers will break. This tool closes that gap by combining:

1. **Schema diffing** — structural comparison of two OpenAPI 3.x specs
2. **Change classification** — deterministic BREAKING / WARNING / NON-BREAKING labelling
3. **Consumer Registry** — teams declare which endpoints/fields they depend on
4. **Mock simulation** — Prism + Newman run consumer tests against the proposed new API
5. **Impact reports** — exportable checklists with plain-English explanations

---

## Architecture

```
Client (React + Tailwind)
         │
         ▼
   API Layer (Express.js)
         │
   ┌─────┴──────────────────────────────────────────┐
   │               Modular Monolith                  │
   │                                                 │
   │  auth/         – JWT + RBAC                     │
   │  specs/        – Spec ingestion & versioning    │
   │  diff-engine/  – OpenAPI structural diff        │
   │  classification-rules/ ← SINGLE source of truth │
   │  consumer-registry/  – Team dependency index    │
   │  mock-orchestrator/  – Prism + Newman runner    │
   │  reporting/    – Impact checklist + export      │
   └─────────────────────────────────────────────────┘
         │
   PostgreSQL 15 (jsonb for raw specs)
```

Data flow: `Upload Spec → Diff Engine → Classify → Consumer Cross-ref → Mock Run → Report`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5.x (frontend + backend) |
| Backend | Express.js 4.x |
| Database | PostgreSQL 15 |
| Frontend | React 18 + Tailwind CSS 3 |
| Mock Server | Prism (Stoplight) |
| Test Runner | Newman (Postman CLI) |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Auth | JWT (15 min) + Refresh Tokens (7 days) |
| Logging | pino (structured JSON) |

---

## Prerequisites

- **Docker Desktop** (recommended — one-command startup)  
- OR: Node.js 20+, PostgreSQL 15+

---

## Quick Start (Docker)

```bash
# 1. Clone
git clone https://github.com/Saqib-Hussain-07/API_Change_Impact_Simulator.git
cd API_Change_Impact_Simulator

# 2. Copy environment file
cp .env.example .env

# 3. Start all services
docker compose up -d

# 4. Run migrations + seed demo data
docker compose exec backend node dist/db/migrate.js
docker compose exec backend node dist/db/seed.js

# 5. Open the app
#    Frontend:  http://localhost:5173
#    API:       http://localhost:4000
#    Health:    http://localhost:4000/healthz
```

---

## Local Development

```bash
# Install dependencies
npm install          # root (installs workspaces)

# Set up environment
cp .env.example .env
# Edit .env: set DATABASE_URL to your local PostgreSQL

# Run migrations
npm run db:migrate --workspace=backend

# Seed demo data
npm run db:seed --workspace=backend

# Start both servers (hot reload)
npm run dev
# Backend:  http://localhost:4000
# Frontend: http://localhost:5173
```

---

## Demo Walkthrough

The seed script creates everything needed for a full end-to-end demo:

### Seeded Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@acme.dev` | `Admin@1234` | Admin (API Owner) |
| `mobile-rep@acme.dev` | `Rep@1234` | Consumer Rep (Mobile Team) |
| `analytics-rep@acme.dev` | `Rep@1234` | Consumer Rep (Analytics) |

### Step-by-Step Demo

#### 1. Login
Navigate to `http://localhost:5173` → credentials are pre-filled → click **Sign in**

#### 2. View API Specs
Go to **API Specs** → see `User Service API` and `Payments API`, each with 2 versions (v1.0.0, v2.0.0)

#### 3. Trigger a Diff
Go to **Diff Runs** → click **New Diff** → select `User Service API` → pick `v1.0.0` as old, `v2.0.0` as new → click **Compare**

#### 4. Review Breaking Changes
The diff results show color-coded changes:
- 🔴 **BREAKING**: `DELETE /users/{id}` removed, `name` field became required, auth added to `GET /users`, `legacyId` type changed `integer → string`
- ⚡ **WARNING**: `legacyId` deprecated, enum gained `moderator` value
- ✅ **NON-BREAKING**: New endpoint `/users/{id}/settings`, new `socialLinks` response field

Each breaking change shows which **specific consumer teams** are affected inline.

#### 5. Run Mock Simulation
On the diff results page → click **Run Mock Tests** → Prism starts with the new spec, Newman runs all consumer test collections, pass/fail displayed per team

#### 6. Generate Report
Click **Report** → see the migration checklist:
- Summary: "3 breaking changes, 2 consumers affected, 1 test suite failing"
- Plain-English recommendations
- Admin sign-off: **Approve for Release** or **Block Pending Fixes**

#### 7. Export CSV
Click **CSV** to download the full impact report as a spreadsheet

#### 8. Check Audit Log
Go to **Audit Log** → see every action recorded with user, timestamp, and entity

---

## API Reference

Base path: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Authenticate and get tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/specs` | List all API specs |
| POST | `/specs` | Create a new spec (admin) |
| POST | `/specs/:specId/versions` | Upload + validate a new spec version |
| GET | `/specs/:specId/versions` | List spec versions |
| POST | `/diffs` | Trigger a diff run (idempotent) |
| GET | `/diffs` | List all diff runs |
| GET | `/diffs/:diffId` | Get diff results with classifications |
| POST | `/diffs/:diffId/mock-run` | Trigger Prism + Newman simulation |
| GET | `/diffs/:diffId/report` | Get/generate migration checklist |
| POST | `/diffs/:diffId/acknowledge` | Acknowledge/dispute an impact |
| GET | `/consumers` | List consumer teams |
| POST | `/consumers` | Create a consumer team |
| POST | `/consumers/:id/dependencies` | Register endpoint/field dependency |
| GET | `/reports` | List all migration reports |
| POST | `/reports/:diffId/sign-off` | Approve/block a release |
| GET | `/reports/audit/log` | Retrieve audit log (admin) |
| GET | `/healthz` | Health check |

Error response format:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Spec not found",
    "details": null
  }
}
```

---

## Classification Rules

All rules live in **one isolated module**: [`backend/src/classification-rules/index.ts`](backend/src/classification-rules/index.ts)

| Code | Classification | Condition |
|------|---------------|-----------|
| R01 | 🔴 BREAKING | Endpoint (path + method) removed |
| R02 | 🔴 BREAKING | Optional request field → required |
| R03 | 🔴 BREAKING | Response field removed |
| R04 | 🔴 BREAKING | Field data type changed |
| R05 | 🔴 BREAKING | Response status code removed |
| R06 | 🔴 BREAKING | Auth/security added or tightened |
| W01 | ⚡ WARNING | Field deprecated but still present |
| W02 | ⚡ WARNING | New required field with documented default |
| W03 | ⚡ WARNING | Enum gains new values |
| N01 | ✅ NON-BREAKING | New endpoint added |
| N02 | ✅ NON-BREAKING | New optional response field |
| N03 | ✅ NON-BREAKING | New optional request field |
| N04 | ✅ NON-BREAKING | Description/docs only change |

> **Consumer filtering**: A breaking change only appears as "affects you" to a consumer if they have explicitly registered a dependency on the specific endpoint/field involved. No false positives.

---

## Running Tests

```bash
# All backend tests
npm run test --workspace=backend

# Classification rules only (with coverage)
cd backend && npx jest src/classification-rules/index.test.ts --coverage

# Diff engine regression tests (fixture-based)
cd backend && npx jest src/diff-engine/openapi-differ.test.ts

# Watch mode during development
cd backend && npx jest --watch
```

The CI pipeline runs all tests on every PR — classification rules + diff engine regression tests must pass before merging.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/api_impact_db` |
| `JWT_SECRET` | Secret for access token signing | ⚠️ Change in production |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing | ⚠️ Change in production |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `PORT` | API server port | `4000` |
| `PRISM_PORT` | Prism mock server port | `4010` |
| `SENTRY_DSN` | Sentry DSN (optional) | — |

---

## Deployment

### Render (Free Tier)

1. Create a **PostgreSQL** database on Render
2. Create a **Web Service** for the backend:
   - Build: `cd backend && npm ci && npm run build && node dist/db/migrate.js`
   - Start: `node dist/index.js`
   - Add env vars from `.env.example`
3. Create a **Static Site** for the frontend:
   - Build: `cd frontend && npm ci && npm run build`
   - Publish: `frontend/dist`
4. Set `RENDER_DEPLOY_HOOK_BACKEND` and `RENDER_DEPLOY_HOOK_FRONTEND` as GitHub secrets for automatic CD

---

## Project Structure

```
API Change Impact Simulator/
├── .github/workflows/ci.yml      # GitHub Actions CI/CD
├── .env.example                   # Environment template
├── docker-compose.yml             # Full stack local run
├── package.json                   # Root npm workspace
│
├── backend/
│   ├── src/
│   │   ├── auth/                  # JWT + RBAC
│   │   ├── classification-rules/  # 🔑 ALL classification logic here
│   │   │   ├── index.ts           # Rule implementations (pure functions)
│   │   │   └── index.test.ts      # Unit tests for every rule
│   │   ├── diff-engine/           # OpenAPI structural differ
│   │   │   ├── openapi-differ.ts
│   │   │   ├── openapi-differ.test.ts  # Fixture-based regression tests
│   │   │   ├── diffs.service.ts
│   │   │   ├── diffs.router.ts
│   │   │   └── fixtures/          # 3 spec pairs for demo + testing
│   │   ├── consumer-registry/     # Team/dependency management
│   │   ├── mock-orchestrator/     # Prism + Newman runner
│   │   ├── reporting/             # Migration checklist + export
│   │   ├── specs/                 # Spec ingestion + validation
│   │   ├── db/
│   │   │   ├── client.ts          # PostgreSQL pool
│   │   │   ├── migrate.ts         # Migration runner
│   │   │   ├── seed.ts            # Demo data seeder
│   │   │   └── migrations/        # SQL migration files
│   │   └── utils/                 # Logger, audit helper
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── pages/                 # LoginPage, Dashboard, Specs, Diffs, etc.
    │   ├── components/            # Layout (sidebar)
    │   ├── lib/api.ts             # Axios client with auto-refresh
    │   └── store/auth.store.ts    # Auth state (localStorage-backed)
    └── Dockerfile
```

---

*Built as MCA capstone project — demonstrates end-to-end API governance tooling using open-source components.*
