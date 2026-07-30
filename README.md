# CareerGap AI

CareerGap AI is an AI-powered career gap analysis and roadmap platform. It leverages generative AI (Google Gemini) to analyze your resume, identify skill gaps against current market requirements, and generate actionable roadmaps.

The project is built as a Turborepo monorepo containing:
- **`apps/web`**: Frontend built with Next.js 15, React 19, and Tailwind CSS.
- **`apps/api`**: Backend REST API built with NestJS, Prisma, and PostgreSQL.
- **`packages/shared`**: Shared TypeScript types and Zod schemas.

## Tech Stack & External Packages

### Frontend (`apps/web`)
- **Framework**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS, Framer Motion (animations), Radix UI (accessible components), Lucide React (icons)
- **State & Data Fetching**: Zustand, TanStack React Query (`@tanstack/react-query`)
- **Forms**: React Hook Form, Zod
- **Other**: Recharts (data visualization), Sonner (toast notifications), React Dropzone (file uploads)

### Backend (`apps/api`)
- **Framework**: NestJS 10
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Queue & Background Jobs**: Redis, Bull (`@nestjs/bull`)
- **Authentication**: Passport.js (JWT, Google OAuth, LinkedIn OAuth), Bcrypt
- **AI Integration**: Google Gemini API (`@google/genai`)
- **File Parsing & Storage**: AWS S3 (`aws-sdk`), `pdf-parse`, `mammoth` (for docx)
- **Other**: Nodemailer (emails), Swagger (API documentation)

## Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v20+)
- **pnpm** (v9+)
- **PostgreSQL** (running locally or remotely)
- **Redis** (running locally or remotely)

## Environment Setup

You need to set up environment variables for both the backend and frontend.

### Backend (`apps/api/.env`)
Copy the example environment file:
```bash
cp apps/api/.env.example apps/api/.env
```

**Required Keys to configure in `apps/api/.env`**:
- `DATABASE_URL`: Connection string to your PostgreSQL database.
- `REDIS_URL`: Connection string to your Redis instance.
- `JWT_SECRET` / `JWT_REFRESH_SECRET`: Secure random strings for signing tokens.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google OAuth login.
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`: For LinkedIn OAuth login.
- `OPENAI_API_KEY`: Your Google Gemini API Key (despite the name, it's configured for Gemini).
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: For S3 file uploads.

### Frontend (`apps/web/.env.local`)
Create a `.env.local` file in the web app:
```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" > apps/web/.env.local
```

## Getting Started

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Database Setup**
   Generate the Prisma Client and run migrations:
   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   ```
   *(Optional)* Seed the database with initial data:
   ```bash
   pnpm run db:seed
   ```

3. **Start the Development Servers**
   To start both the frontend and backend simultaneously, run:
   ```bash
   pnpm run dev
   ```

   - Frontend will be available at: `http://localhost:3000`
   - Backend API will be available at: `http://localhost:3001`
   - API Swagger Docs will be available at: `http://localhost:3001/api/docs`

## Available Scripts (Root)

- `pnpm run dev`: Starts all applications in development mode.
- `pnpm run build`: Builds all applications for production.
- `pnpm run lint`: Lints the codebase.
- `pnpm run format`: Formats code using Prettier.
- `pnpm run clean`: Removes build artifacts and `node_modules`.
