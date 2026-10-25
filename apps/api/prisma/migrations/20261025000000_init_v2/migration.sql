-- CareerGap AI schema v2 — initial migration
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFY');

-- CreateEnum
CREATE TYPE "ResumeStatus" AS ENUM ('PENDING', 'PROCESSING', 'ANALYZED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FitAssessment" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('PROJECT', 'CERTIFICATION', 'COURSE');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('TECHNICAL', 'SOFT', 'DOMAIN', 'TOOL', 'CERTIFICATION');

-- CreateEnum
CREATE TYPE "SkillTrend" AS ENUM ('RISING', 'STABLE', 'DECLINING');

-- CreateEnum
CREATE TYPE "JobSkillImportance" AS ENUM ('REQUIRED', 'PREFERRED');

-- CreateEnum
CREATE TYPE "GapImportance" AS ENUM ('CRITICAL', 'IMPORTANT', 'NICE_TO_HAVE');

-- CreateEnum
CREATE TYPE "AtsIssueType" AS ENUM ('KEYWORD_MISSING', 'FORMAT_ISSUE', 'LENGTH_ISSUE', 'SECTION_MISSING', 'QUANTIFICATION_MISSING');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL DEFAULT 'TECHNICAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "skillId" UUID NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "skill_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_relations" (
    "skillId" UUID NOT NULL,
    "relatedSkillId" UUID NOT NULL,

    CONSTRAINT "skill_relations_pkey" PRIMARY KEY ("skillId","relatedSkillId")
);

-- CreateTable
CREATE TABLE "skill_market_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "skillId" UUID NOT NULL,
    "demandScore" DOUBLE PRECISION NOT NULL,
    "trend" "SkillTrend" NOT NULL DEFAULT 'STABLE',
    "averageSalary" DOUBLE PRECISION,
    "jobCount" INTEGER NOT NULL DEFAULT 0,
    "topCompanies" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'seed',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_market_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_market_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "skillId" UUID NOT NULL,
    "demandScore" DOUBLE PRECISION NOT NULL,
    "averageSalary" DOUBLE PRECISION,
    "jobCount" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "ResumeStatus" NOT NULL DEFAULT 'PENDING',
    "parsedData" JSONB,
    "rawText" TEXT,
    "atsScore" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_skills" (
    "resumeId" UUID NOT NULL,
    "skillId" UUID NOT NULL,

    CONSTRAINT "resume_skills_pkey" PRIMARY KEY ("resumeId","skillId")
);

-- CreateTable
CREATE TABLE "resume_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resumeId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "salaryCurrency" TEXT DEFAULT 'USD',
    "experienceLevel" TEXT,
    "education" TEXT,
    "jobType" TEXT,
    "industry" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "jobId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "importance" "JobSkillImportance" NOT NULL DEFAULT 'REQUIRED',

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("jobId","skillId")
);

-- CreateTable
CREATE TABLE "job_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "matchScore" DOUBLE PRECISION,
    "atsScore" DOUBLE PRECISION,
    "fitAssessment" "FitAssessment",
    "executiveSummary" TEXT,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "recommendations" TEXT[],
    "rawAnalysis" JSONB,
    "processingTime" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_skill_gaps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysisId" UUID NOT NULL,
    "skillId" UUID,
    "skillName" TEXT NOT NULL,
    "importance" "GapImportance" NOT NULL,
    "category" "SkillCategory" NOT NULL DEFAULT 'TECHNICAL',
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "requiredLevel" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analysis_skill_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_ats_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysisId" UUID NOT NULL,
    "type" "AtsIssueType" NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,

    CONSTRAINT "analysis_ats_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "duration" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "skills" TEXT[],
    "provider" TEXT,
    "cost" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "roadmapId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weekNumber" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roadmap_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "milestoneId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "RecommendationType" NOT NULL DEFAULT 'COURSE',
    "url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "roadmap_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "analysisId" UUID,
    "title" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaching_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coaching_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "feature" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "oauth_accounts_userId_idx" ON "oauth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_providerId_key" ON "oauth_accounts"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_type_idx" ON "auth_tokens"("userId", "type");

-- CreateIndex
CREATE INDEX "auth_tokens_expiresAt_idx" ON "auth_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshTokenHash_key" ON "user_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE UNIQUE INDEX "skill_aliases_alias_key" ON "skill_aliases"("alias");

-- CreateIndex
CREATE INDEX "skill_aliases_skillId_idx" ON "skill_aliases"("skillId");

-- CreateIndex
CREATE INDEX "skill_relations_relatedSkillId_idx" ON "skill_relations"("relatedSkillId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_market_stats_skillId_key" ON "skill_market_stats"("skillId");

-- CreateIndex
CREATE INDEX "skill_market_stats_demandScore_idx" ON "skill_market_stats"("demandScore");

-- CreateIndex
CREATE INDEX "skill_market_stats_trend_idx" ON "skill_market_stats"("trend");

-- CreateIndex
CREATE INDEX "skill_market_snapshots_skillId_capturedAt_idx" ON "skill_market_snapshots"("skillId", "capturedAt");

-- CreateIndex
CREATE INDEX "resumes_userId_createdAt_idx" ON "resumes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "resumes_status_idx" ON "resumes"("status");

-- CreateIndex
CREATE INDEX "resume_skills_skillId_idx" ON "resume_skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "resume_embeddings_resumeId_chunkIndex_key" ON "resume_embeddings"("resumeId", "chunkIndex");

-- CreateIndex
CREATE INDEX "jobs_userId_isActive_createdAt_idx" ON "jobs"("userId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "job_skills_skillId_idx" ON "job_skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "job_embeddings_jobId_chunkIndex_key" ON "job_embeddings"("jobId", "chunkIndex");

-- CreateIndex
CREATE INDEX "analyses_userId_createdAt_idx" ON "analyses"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "analyses_resumeId_idx" ON "analyses"("resumeId");

-- CreateIndex
CREATE INDEX "analyses_jobId_idx" ON "analyses"("jobId");

-- CreateIndex
CREATE INDEX "analyses_status_idx" ON "analyses"("status");

-- CreateIndex
CREATE INDEX "analysis_skill_gaps_analysisId_idx" ON "analysis_skill_gaps"("analysisId");

-- CreateIndex
CREATE INDEX "analysis_skill_gaps_skillId_idx" ON "analysis_skill_gaps"("skillId");

-- CreateIndex
CREATE INDEX "analysis_ats_suggestions_analysisId_idx" ON "analysis_ats_suggestions"("analysisId");

-- CreateIndex
CREATE INDEX "recommendations_userId_isCompleted_idx" ON "recommendations"("userId", "isCompleted");

-- CreateIndex
CREATE INDEX "recommendations_analysisId_priority_idx" ON "recommendations"("analysisId", "priority");

-- CreateIndex
CREATE INDEX "recommendations_type_idx" ON "recommendations"("type");

-- CreateIndex
CREATE INDEX "roadmaps_userId_isActive_createdAt_idx" ON "roadmaps"("userId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "roadmaps_analysisId_idx" ON "roadmaps"("analysisId");

-- CreateIndex
CREATE INDEX "roadmap_milestones_roadmapId_position_idx" ON "roadmap_milestones"("roadmapId", "position");

-- CreateIndex
CREATE INDEX "roadmap_tasks_milestoneId_position_idx" ON "roadmap_tasks"("milestoneId", "position");

-- CreateIndex
CREATE INDEX "coaching_sessions_userId_updatedAt_idx" ON "coaching_sessions"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "coaching_messages_sessionId_createdAt_idx" ON "coaching_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_userId_createdAt_idx" ON "ai_usage_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_aliases" ADD CONSTRAINT "skill_aliases_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_relations" ADD CONSTRAINT "skill_relations_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_relations" ADD CONSTRAINT "skill_relations_relatedSkillId_fkey" FOREIGN KEY ("relatedSkillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_market_stats" ADD CONSTRAINT "skill_market_stats_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_market_snapshots" ADD CONSTRAINT "skill_market_snapshots_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_embeddings" ADD CONSTRAINT "resume_embeddings_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_embeddings" ADD CONSTRAINT "job_embeddings_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_skill_gaps" ADD CONSTRAINT "analysis_skill_gaps_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_skill_gaps" ADD CONSTRAINT "analysis_skill_gaps_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_ats_suggestions" ADD CONSTRAINT "analysis_ats_suggestions_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_milestones" ADD CONSTRAINT "roadmap_milestones_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "roadmap_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_messages" ADD CONSTRAINT "coaching_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coaching_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Vector similarity indexes (cosine), used by EmbeddingService
CREATE INDEX "resume_embeddings_embedding_hnsw_idx" ON "resume_embeddings" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "job_embeddings_embedding_hnsw_idx" ON "job_embeddings" USING hnsw ("embedding" vector_cosine_ops);
