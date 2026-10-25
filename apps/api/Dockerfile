# syntax=docker/dockerfile:1
# API image (NestJS). Build from the repository root:
#   docker build -f apps/api/Dockerfile -t careergap-api .
#
# The runtime image holds only the API's own production dependencies (no TypeScript, test or build tooling, and none of
# the web app's packages). The Prisma CLI is a production dependency on purpose: the same image applies database
# migrations as a one-off task.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Prisma needs OpenSSL; CA certificates are needed for calls to the AI providers and S3
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# ---- build: all dependencies, then the shared package and the API
FROM base AS build
# Manifests first, so the install layer is cached until a dependency changes
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @career-gap-ai/api...
COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @career-gap-ai/shared build \
    && pnpm --filter @career-gap-ai/api db:generate \
    && pnpm --filter @career-gap-ai/api build

# ---- deploy folder: the API with its production dependencies only
FROM build AS deployed
# pnpm deploy copies the project's files and installs its production dependencies (workspace packages are copied in,
# so the shared package is built first, above). It does not copy dist (ignored by git), so that is added afterwards.
RUN pnpm --filter @career-gap-ai/api deploy --prod /out \
    && cp -r apps/api/dist /out/dist \
    && cd /out \
    && rm -rf src test \
    && sed -i 's/\r$//' docker-entrypoint.sh \
    && chmod +x docker-entrypoint.sh \
    && pnpm exec prisma generate

# ---- runtime
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app
COPY --from=deployed --chown=node:node /out /app
USER node
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
