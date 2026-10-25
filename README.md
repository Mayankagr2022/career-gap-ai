# CareerGap AI

AI-powered career gap analysis and roadmap platform. Upload a resume, pair it with a target job description, and CareerGap AI uses Google Gemini to score the match, pinpoint skill gaps, suggest courses/certifications/projects, and generate a milestone-based learning roadmap. An AI career coach and a skill-market explorer round out the product.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Repository Layout](#repository-layout)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Getting Started](#getting-started)
7. [Configuration](#configuration)
8. [Scripts](#scripts)
9. [How It Works](#how-it-works)
10. [Data Model](#data-model)
11. [API Reference](#api-reference)
12. [Frontend Overview](#frontend-overview)
13. [Authentication & Security](#authentication--security)
14. [Testing](#testing)
15. [Deployment Notes](#deployment-notes)
16. [Troubleshooting](#troubleshooting)

---

## Features

- **Resume ingestion** – upload PDF/DOCX (max 10 MB); text is extracted, parsed into structured data by AI, embedded for RAG, and given a heuristic ATS score.
- **Job targets** – save job descriptions; an AI parser extracts required/preferred skills, level, industry, etc.
- **Gap analysis** – match score, ATS score, skill gaps (with severity), strengths, weaknesses, ATS improvement suggestions and an executive summary.
- **Recommendations** – prioritised courses, certifications and projects with provider, cost, difficulty and duration; mark items complete/incomplete.
- **Roadmaps** – AI-generated milestone plans per analysis, with task-level progress tracking and completion percentage.
- **AI career coach** – persistent chat sessions (optionally grounded in an analysis) and interview-question generation for a given job.
- **Market insights** – skill demand scores, trends, average salaries and related skills; public trending/search endpoints.
- **Notifications** – in-app notifications when analyses finish or fail.
- **Auth** – email/password, Google OAuth, LinkedIn OAuth, JWT access + refresh tokens, password reset.
- **Admin area** – user list, platform stats, role and active-status management.
- **Dark/light theme**, responsive dashboard UI.

## Architecture

```
┌──────────────────┐    REST (axios, cookies/JWT)    ┌───────────────────────────┐
│  apps/web        │ ──────────────────────────────▶ │  apps/api (NestJS)         │
│  Next.js 15 / 19 │ ◀────────────────────────────── │  /api/v1/*                 │
└──────────────────┘                                 │                            │
                                                     │  Controllers → Services    │
                                                     │        │            │      │
                                                     │        ▼            ▼      │
                                                     │  Prisma ORM    Bull queues │
                                                     └────┬──────────────┬────────┘
                                                          │              │
                                          ┌───────────────▼───┐   ┌──────▼────────────┐
                                          │ PostgreSQL        │   │ Redis             │
                                          │ + pgvector        │   │ (job queues)      │
                                          └───────────────────┘   └──────┬────────────┘
                                                                         │ workers
                                        ┌────────────────┐        ┌──────▼────────────┐
                                        │ AWS S3 / MinIO │◀───────│ Processors + AI   │──▶ Google Gemini
                                        │ (resume files) │        │ agents            │
                                        └────────────────┘        └───────────────────┘
```

Long-running AI work never blocks a request: uploading a resume or creating an analysis enqueues a Bull job, and the client polls status / receives a notification when done.

## Repository Layout

pnpm workspace + Turborepo monorepo.

```
career-gap-ai/
├── apps/
│   ├── api/                      # NestJS backend
│   │   ├── prisma/               # schema.prisma, seed.ts
│   │   ├── src/
│   │   │   ├── main.ts           # bootstrap: helmet, CORS, validation, Swagger
│   │   │   ├── app.module.ts     # config, throttler, Bull, mailer, feature modules
│   │   │   ├── config/           # registerAs() configs (app, db, jwt, redis, openai, aws, oauth, email)
│   │   │   ├── common/           # decorators, guards, filters, interceptors, prisma, storage (S3)
│   │   │   └── modules/
│   │   │       ├── auth/ users/ resumes/ jobs/ analyses/
│   │   │       ├── recommendations/ roadmaps/ coaching/ market/ notifications/
│   │   │       └── ai/           # AiService, EmbeddingService, agents/
│   │   └── test/                 # e2e specs
│   └── web/                      # Next.js frontend
│       └── src/
│           ├── app/              # App Router: landing, auth, dashboard, admin, market
│           ├── components/       # landing, market, theme, notifications, auth guards
│           ├── hooks/            # React Query hooks per domain
│           ├── stores/           # Zustand auth store
│           └── lib/              # axios api-client (with token refresh), utils
├── packages/
│   └── shared/                   # Zod schemas + shared TS types
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 3, Radix UI, Framer Motion, Recharts, Lucide, Sonner |
| Frontend state/data | TanStack React Query 5, Zustand 5, React Hook Form + Zod, axios, next-themes |
| Backend | NestJS 10, Passport (local, JWT, JWT-refresh, Google, LinkedIn), class-validator, Swagger, Throttler, Helmet |
| Database | PostgreSQL 13+ with the `pgvector` extension, Prisma 5 |
| Queue | Redis + Bull (`@nestjs/bull`) |
| AI | Google Gemini via `@google/genai` (chat/JSON generation and `gemini-embedding-001` embeddings) |
| Files | AWS S3 (or any S3-compatible store such as MinIO), `pdf-parse`, `mammoth` |
| Email | Nodemailer via `@nestjs-modules/mailer` |
| Tooling | Turborepo, pnpm 9, TypeScript 5.7, ESLint, Prettier, Jest, Supertest |

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`packageManager` is pinned to `pnpm@9.15.0`)
- **PostgreSQL** 14+ with the **pgvector** extension available (the initial migration runs `CREATE EXTENSION vector`; your DB user needs permission to create extensions)
- **Redis** 6+
- A **Google Gemini API key**
- An **S3 bucket** (or MinIO) for resume storage
- *(Optional)* Google / LinkedIn OAuth apps and an SMTP server

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the backend
cp apps/api/.env.example apps/api/.env      # then edit values (see Configuration)

# 3. Configure the frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" > apps/web/.env.local

# 4. Prepare the database
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed          # optional: demo/admin users + market data

# 5. Run everything
pnpm run dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Swagger UI (non-production only) | http://localhost:3001/docs |

> Swagger is registered at `/docs` and is **not** under the `api/v1` prefix.

### Seeded accounts

`pnpm run db:seed` creates (idempotently):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@careergap.ai` | `Admin@123` |
| Demo user | `demo@careergap.ai` | `Demo@123` |

It also inserts a catalogue of skills into `skill_market_data`. **Change or remove these accounts in any shared/production environment.**

## Configuration

### Backend – `apps/api/.env`

The API loads `.env.local` then `.env` in development and `.env.production` when `NODE_ENV=production`.

| Variable | Purpose | Default / example |
|----------|---------|-------------------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API port | `3001` |
| `API_PREFIX` | Global route prefix | `api/v1` |
| `FRONTEND_URL` | Allowed CORS origin / OAuth redirects | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/career_gap_ai?schema=public` |
| `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` | Redis connection | `localhost:6379` |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Access-token signing / TTL | TTL `7d` |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Refresh-token signing / TTL | TTL `30d` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth | callback `…/api/v1/auth/google/callback` |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_CALLBACK_URL` | LinkedIn OAuth | callback `…/api/v1/auth/linkedin/callback` |
| `OPENAI_API_KEY` | **Gemini API key** (legacy variable name) | – |
| `OPENAI_MODEL` | Gemini model for generation | see `.env.example` |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `gemini-embedding-001` |
| `OPENAI_BASE_URL`, `OPENAI_MAX_TOKENS`, `OPENAI_TEMPERATURE` | Optional tuning | temperature `0.3` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | S3 storage | region `us-east-1` |
| `AWS_S3_ENDPOINT` | Optional – set for MinIO / S3-compatible stores (enables path-style) | – |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | Rate limiting window (ms) / max requests | `60000` / `100` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Outgoing email (password reset) | – |

> The `OPENAI_*` names are historical. The code uses `@google/genai`, so `OPENAI_API_KEY` must contain a **Gemini** key.

### Frontend – `apps/web/.env.local`

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL of the API (e.g. `http://localhost:3001/api/v1`). If unset, falls back to `http(s)://<current-host>:3001/api/v1` in the browser. |

## Scripts

### Root (via Turborepo)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run web and API in watch mode |
| `pnpm build` | Build all packages (shared → api/web) |
| `pnpm lint` | Lint all workspaces |
| `pnpm test` | Run tests in all workspaces |
| `pnpm format` | Prettier over `ts, tsx, md, json` |
| `pnpm db:generate` / `db:migrate` / `db:seed` | Prisma client generation, dev migrations, seeding |
| `pnpm clean` | Remove build output and `node_modules` |

### `apps/api`

`dev`, `build`, `start` (runs `dist/main`), `lint`, `test`, `test:watch`, `test:cov`, `test:e2e`, `db:generate`, `db:migrate`, `db:migrate:prod` (`prisma migrate deploy`), `db:seed`, `db:studio` (Prisma Studio).

### `apps/web`

`dev` (port 3000), `build`, `start`, `lint`.

## How It Works

### Resume pipeline (`resume-processing` queue)

1. `POST /resumes/upload` validates the file, stores it in S3, creates a `Resume` row (`PENDING`) and enqueues `process-resume`.
2. `ResumeProcessor` sets `PROCESSING`, downloads the file, extracts text (`pdf-parse` / `mammoth`).
3. `ResumeParserAgent` converts the text to structured JSON (contact, skills, experience, education, certifications…).
4. `EmbeddingService` chunks the text and stores vectors in `resume_embeddings` (pgvector) for RAG.
5. A heuristic ATS score is computed and the resume becomes `ANALYZED` (or `FAILED`).

### Analysis pipeline (`analysis-processing` queue)

1. `POST /analyses` (resume + job) creates an `Analysis` (`PENDING`) and enqueues `process-analysis`.
2. `AnalysisProcessor` runs three agents in sequence:
   - `GapAnalysisAgent` → match score, ATS score, skill gaps, strengths/weaknesses, ATS suggestions
   - `RecommendationAgent` → courses / certifications / projects
   - `RoadmapAgent` → milestones
3. Results are written in a single DB transaction, together with a success notification. On error, the analysis is marked `FAILED` and an error notification is created.

### AI layer (`modules/ai`)

| Component | Role |
|-----------|------|
| `AiService` | Wraps Gemini: message mapping, JSON/text modes, retry with exponential backoff on 429/503 |
| `EmbeddingService` | Embedding generation and raw-SQL writes to vector columns |
| `resume-parser.agent` | Resume text → structured data |
| `job-parser.agent` | Job description → structured job data (used when creating jobs) |
| `gap-analysis.agent` | Resume vs. job comparison |
| `recommendation.agent` | Learning recommendations |
| `roadmap.agent` | Milestone roadmap |
| `career-coach.agent` | Conversational coaching and interview questions |

## Data Model

Defined in [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma). All primary keys are UUIDs; user-owned rows cascade-delete with the user.

| Model (table) | Description |
|---------------|-------------|
| `User` (`users`) | Account, role (`USER`/`ADMIN`), signup provider, soft-delete marker |
| `OAuthAccount` (`oauth_accounts`) | Linked Google/LinkedIn logins — one user can have several |
| `AuthToken` (`auth_tokens`) | Single-use password-reset / email-verify tokens (sha256 hash only) |
| `UserSession` (`user_sessions`) | Refresh sessions (token stored as sha256 hash) with user agent / IP / expiry |
| `Skill` / `SkillAlias` / `SkillRelation` | Canonical skills catalog ("Next.js" = "NextJS"), aliases and related skills |
| `SkillMarketStat` / `SkillMarketSnapshot` | Current demand/salary/trend per skill, plus history for trend charts |
| `Resume` (`resumes`) | File metadata, status, `parsedData` JSON, `rawText`, `atsScore` |
| `ResumeSkill` (`resume_skills`) | Catalog skills found on a resume |
| `ResumeEmbedding` (`resume_embeddings`) | Text chunks + `vector(768)` embeddings (HNSW cosine index) |
| `Job` / `JobSkill` | Target job; skills are catalog rows marked `REQUIRED` or `PREFERRED` |
| `JobEmbedding` (`job_embeddings`) | Job chunk embeddings |
| `Analysis` (`analyses`) | Resume↔job result: scores, fit, summary, strengths/weaknesses, raw AI output |
| `AnalysisSkillGap` / `AnalysisAtsSuggestion` | Skill gaps (linked to the catalog) and ATS suggestions, one row each |
| `Recommendation` (`recommendations`) | `PROJECT`/`CERTIFICATION`/`COURSE`, difficulty, priority, completion |
| `Roadmap` / `RoadmapMilestone` / `RoadmapTask` | Learning plan as real rows; task completion drives `completionPct` |
| `CoachingSession` / `CoachingMessage` | Chat sessions (optionally tied to an analysis) and their messages |
| `Notification` (`notifications`) | In-app notifications (`INFO`/`SUCCESS`/`WARNING`/`ERROR`) |
| `AuditLog` / `AiUsageLog` | Auth/admin audit trail; per-call AI model, tokens, latency, errors |

Primary keys are generated by Postgres (`gen_random_uuid()`, PG 13+). Embeddings use pgvector with `outputDimensionality: 768`. Migrations live in [apps/api/prisma/migrations](apps/api/prisma/migrations) and are versioned; the API still returns `requiredSkills`, `skillGaps`, `milestones`, `messages` etc. in the same shapes as before.

## API Reference

Base URL: `http://localhost:3001/api/v1`. All routes require authentication (Bearer JWT or the `accessToken` cookie) unless marked **public**. Responses are wrapped by a global response interceptor; errors by a global exception filter. Interactive docs: `/docs` (non-production).

| Area | Endpoints |
|------|-----------|
| **auth** | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/user` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `GET /auth/google` (+ `/callback`) · `GET /auth/linkedin` (+ `/callback`) — all public except `logout` and `user` |
| **users** | `GET /users/profile` · `PUT /users/profile` · `GET /users/stats` · `POST /users/avatar` · `GET /users/:id/avatar` (public) · `PUT /users/change-password` · `DELETE /users/account` |
| **users (admin)** | `GET /users/all` · `GET /users/admin/stats` · `PUT /users/admin/:id/role` · `PUT /users/admin/:id/status` — `ADMIN` role required |
| **resumes** | `POST /resumes/upload` · `GET /resumes` · `GET /resumes/:id` · `GET /resumes/:id/download` · `DELETE /resumes/:id` |
| **jobs** | `POST /jobs` · `GET /jobs` · `GET /jobs/:id` · `PUT /jobs/:id` · `DELETE /jobs/:id` |
| **analyses** | `POST /analyses` · `GET /analyses` · `GET /analyses/latest` · `GET /analyses/:id` · `DELETE /analyses/:id` |
| **recommendations** | `GET /recommendations` · `GET /recommendations/stats` · `GET /recommendations/:id` · `PATCH /recommendations/:id/complete` · `PATCH /recommendations/:id/incomplete` |
| **roadmaps** | `GET /roadmaps` · `GET /roadmaps/:id` · `PATCH /roadmaps/:id/task` · `DELETE /roadmaps/:id` |
| **coaching** | `POST /coaching/sessions` · `POST /coaching/sessions/:id/messages` · `GET /coaching/sessions` · `GET /coaching/sessions/:id` · `DELETE /coaching/sessions/:id` · `GET /coaching/interview-questions` |
| **market** | `GET /market/skills` · `GET /market/trending` · `GET /market/search` (all public) · `GET /market/resume-skills` · `GET /market/analyze` |
| **notifications** | `GET /notifications` · `PATCH /notifications/read-all` · `PATCH /notifications/:id/read` |

## Frontend Overview

Routes in `apps/web/src/app`:

| Route | Purpose |
|-------|---------|
| `/` | Landing page (hero, features, how it works, testimonials, CTA) |
| `/market` | Public skill-market trends |
| `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/callback` | Authentication and OAuth return |
| `/dashboard` | Stats, latest analysis, recent analyses, trending skills, quick actions |
| `/dashboard/resumes` | Upload (drag-and-drop), list, detail modal |
| `/dashboard/jobs` | Manage target jobs |
| `/dashboard/analyses`, `/dashboard/analyses/[id]` | Analysis list and detailed report (score rings, skill gaps, ATS suggestions) |
| `/dashboard/recommendations` | Courses/certifications/projects with completion tracking |
| `/dashboard/roadmaps` | Milestone roadmaps and progress |
| `/dashboard/coach` | AI chat with session sidebar |
| `/dashboard/market` | Authenticated market analysis for your skills |
| `/dashboard/settings` | Profile, security, notification tabs |
| `/admin`, `/admin/users`, `/admin/settings` | Admin dashboard (role-guarded via `RequireRole`) |

Data access is organised as one React Query hook per domain in `src/hooks/`. `src/lib/api-client.ts` is an axios instance with `withCredentials` and an interceptor that refreshes the session on `401` and replays queued requests.

## Authentication & Security

- Passwords hashed with bcrypt; JWT access + refresh tokens (refresh sessions stored in `user_sessions`), set as cookies and accepted as Bearer tokens.
- Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) – unknown fields are rejected.
- Helmet, compression, cookie-parser, CORS restricted to `FRONTEND_URL` / `localhost:3000` with credentials.
- Rate limiting via `@nestjs/throttler` (default 100 req / 60 s).
- Role-based access via `@Roles()` + `RolesGuard`; `@Public()` opts routes out of auth.
- Uploads limited to 10 MB and kept in memory before being pushed to S3.
- **Never commit real secrets.** `.gitignore` excludes `*.env`, but `apps/api/.env.production` and `apps/web/.env.production` are currently tracked in git – verify they contain only placeholders (or untrack them) and rotate any real credentials that were ever committed.

## Testing

```bash
pnpm test                          # all workspaces
pnpm --filter @career-gap-ai/api test        # unit tests (src/**/*.spec.ts)
pnpm --filter @career-gap-ai/api test:e2e    # e2e (apps/api/test/*.e2e-spec.ts)
```

E2E specs currently cover the app bootstrap and resume endpoints and need a reachable database/Redis. The repo has no frontend tests yet.

## Deployment Notes

1. Set `NODE_ENV=production` and provide `apps/api/.env.production` (or real environment variables).
2. Build: `pnpm build` (the shared package builds first).
3. Apply migrations: `pnpm --filter @career-gap-ai/api db:migrate:prod`.
4. Start the API: `pnpm --filter @career-gap-ai/api start`; start the web app with `pnpm --filter @career-gap-ai/web start` (or deploy to Vercel).
5. Ensure PostgreSQL has the `vector` extension, Redis is reachable by the API, and the S3 bucket exists.
6. Set `FRONTEND_URL` (CORS), OAuth callback URLs and `NEXT_PUBLIC_API_URL` to your public domains.
7. Swagger is disabled when `NODE_ENV=production`.

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `type "vector" does not exist` / extension errors on migrate | Install pgvector and ensure the DB user can `CREATE EXTENSION` |
| Resume/analysis stuck in `PENDING` | Redis not running or unreachable – the Bull workers can't pick up jobs |
| Resume status `FAILED` | Check API logs: S3 credentials/bucket, unsupported/corrupt file, or Gemini errors |
| AI calls failing with 429/503 | Gemini rate limit/overload; `AiService` retries with backoff up to 3 times |
| `Last message must be from user` | The AI chat payload must end with a user message |
| Browser CORS/cookie errors | `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` must match your actual origins |
| Swagger 404 at `/api/docs` | Swagger lives at `/docs`; disabled in production |
| Dev scripts `check.js`, `list-models.js`, `test-chat.js` in `apps/api` | Ad-hoc helpers for checking Gemini access/models; not part of the app runtime |

## License

Private project – no license specified.
