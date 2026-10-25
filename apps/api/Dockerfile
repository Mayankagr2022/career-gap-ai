# syntax=docker/dockerfile:1
# API image (NestJS). Build from the repository root:
#   docker build -f apps/api/Dockerfile -t careergap-api .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Prisma needs OpenSSL; CA certificates are needed for calls to the AI providers and S3
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# ---- dependencies: only the manifests, so this layer is cached until a dependency changes
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @career-gap-ai/api...

# ---- build: shared types, Prisma client, then the API
FROM deps AS build
COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @career-gap-ai/shared build \
    && pnpm --filter @career-gap-ai/api db:generate \
    && pnpm --filter @career-gap-ai/api build \
    && sed -i 's/\r$//' apps/api/docker-entrypoint.sh \
    && chmod +x apps/api/docker-entrypoint.sh

# ---- runtime
# The Prisma CLI stays in the image so the same image can apply migrations (db:migrate:prod) as a one-off task.
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build --chown=node:node /repo /repo
WORKDIR /repo/apps/api
USER node
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
