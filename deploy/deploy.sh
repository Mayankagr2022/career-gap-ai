#!/usr/bin/env bash
# Deploy a version of CareerGap AI on this server. The GitHub Actions workflow copies the deploy/ files here and runs this
# script over SSH; you can also run it by hand to redeploy or roll back:
#
#   IMAGE_PREFIX=ghcr.io/owner/repo IMAGE_TAG=<commit sha> ./deploy.sh
#
# Set SKIP_PULL=1 to use images that are already on the machine (for example ones you built there yourself).
#
# Steps:
#   1. Log in to the image registry (a token on stdin, only when REGISTRY_USER is set) and pull the new API image.
#   2. Start PostgreSQL and Redis, and wait until they are healthy.
#   3. Run the database migrations with the new API image. If they fail, nothing running is touched.
#   4. Start the new version and wait until every container reports healthy.
#   5. Check the public health endpoint through Caddy. If any step after the migration fails, switch back to the previous
#      version (migrations are not undone, so keep them backward compatible: add before you remove).
set -euo pipefail

cd "$(dirname "$0")"

: "${IMAGE_PREFIX:?IMAGE_PREFIX is required, e.g. ghcr.io/owner/repo}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
[ -f .env ] || { echo "Missing .env next to deploy.sh. Copy .env.example and fill it in." >&2; exit 1; }

# The domain, read without executing the file (values may contain shell characters)
DOMAIN="$(grep -E '^DOMAIN=' .env | head -n1 | cut -d= -f2- | tr -d "\"' \t\r")"
[ -n "$DOMAIN" ] || { echo "DOMAIN is not set in .env" >&2; exit 1; }

compose() { docker compose --project-name careergap "$@"; }
log() { printf '\n==> %s\n' "$*"; }

PREVIOUS_TAG="$(cat .deployed-tag 2>/dev/null || true)"
export IMAGE_PREFIX IMAGE_TAG

if [ -n "${REGISTRY_USER:-}" ]; then
  log "Logging in to ${IMAGE_PREFIX%%/*}"
  docker login "${IMAGE_PREFIX%%/*}" --username "$REGISTRY_USER" --password-stdin
fi

if [ "${SKIP_PULL:-0}" = "1" ]; then
  log "Using images already on this machine (SKIP_PULL=1)"
else
  log "Pulling images for ${IMAGE_TAG}"
  compose pull api
fi

log "Starting the database and queue"
compose up -d --wait postgres redis

log "Running database migrations"
if ! compose run --rm --no-deps api sh -c 'node scripts/check-migrations.js && npx prisma migrate deploy'; then
  echo "Migration failed. The running version was not changed." >&2
  exit 1
fi

# Switch back to the previous images; used when the new version does not come up healthy
roll_back() {
  if [ -n "$PREVIOUS_TAG" ] && [ "$PREVIOUS_TAG" != "$IMAGE_TAG" ]; then
    echo "Rolling back to ${PREVIOUS_TAG}" >&2
    IMAGE_TAG="$PREVIOUS_TAG" compose up -d --wait --remove-orphans || echo "Rollback did not complete; check 'docker compose logs'." >&2
  else
    echo "There is no previous version to roll back to." >&2
  fi
}

log "Starting ${IMAGE_TAG}"
if ! compose up -d --wait --remove-orphans; then
  echo "The new version did not become healthy." >&2
  compose ps >&2 || true
  roll_back
  exit 1
fi

# Through Caddy, as a visitor would reach it. --resolve avoids depending on DNS from this machine, and -k tolerates the
# moment before the first certificate has been issued (the check is about the app, not the certificate).
log "Checking https://${DOMAIN}/api/v1/health/ready"
healthy=0
for _ in $(seq 1 30); do
  if curl -fsSk --max-time 10 --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/api/v1/health/ready" >/dev/null; then
    healthy=1
    break
  fi
  sleep 3
done
if [ "$healthy" != "1" ]; then
  echo "The public health check did not pass." >&2
  compose logs --tail 40 caddy api >&2 || true
  roll_back
  exit 1
fi

echo "$IMAGE_TAG" > .deployed-tag
docker image prune -f >/dev/null
log "Deployed ${IMAGE_TAG}"
