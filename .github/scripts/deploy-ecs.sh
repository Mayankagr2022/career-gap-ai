#!/usr/bin/env bash
# Roll a new image version out to ECS. Called by .github/workflows/deploy-aws.yml after the images are pushed.
#
#   1. Register new task definition revisions that point at the new images.
#   2. Run database migrations as a one-off task of the new API image. Stop here if they fail, so a broken
#      migration never reaches running services. Migrations therefore have to stay compatible with the
#      version that is still running while the new one starts (add before you remove).
#   3. Update both services and wait for the deployment to finish. The services' circuit breaker rolls a
#      failing deployment back automatically; this script then fails so the run is red.
#   4. Record the deployed tag in SSM so later infrastructure deploys keep it.
#
# Required environment: AWS_REGION, CLUSTER, REGISTRY, IMAGE_TAG
# Optional:             API_DESIRED_COUNT, WEB_DESIRED_COUNT (used only when a service currently has no tasks)
# shellcheck disable=SC2016  # the backticks are JMESPath literals, not shell expansions
set -euo pipefail

: "${AWS_REGION:?}" "${CLUSTER:?}" "${REGISTRY:?}" "${IMAGE_TAG:?}"
API_SERVICE="careergap-api"
WEB_SERVICE="careergap-web"
TAG_PARAMETER="/careergap/image-tag"

log() { printf '\n==> %s\n' "$*"; }

# register_task_definition <family> <container name> <repository>  -> prints the new revision's ARN
register_task_definition() {
  local family="$1" container="$2" repository="$3"
  local image="${REGISTRY}/${repository}:${IMAGE_TAG}"
  aws ecs describe-task-definition --task-definition "$family" --query taskDefinition --output json \
    | jq --arg container "$container" --arg image "$image" '
        del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities,
            .registeredAt, .registeredBy, .deregisteredAt)
        | .containerDefinitions |= map(if .name == $container then .image = $image else . end)' \
    > "/tmp/${family}.json"
  aws ecs register-task-definition --cli-input-json "file:///tmp/${family}.json" \
    --query taskDefinition.taskDefinitionArn --output text
}

log "Registering task definitions for ${IMAGE_TAG}"
API_TASK_DEFINITION="$(register_task_definition careergap-api api careergap/api)"
WEB_TASK_DEFINITION="$(register_task_definition careergap-web web careergap/web)"
echo "api: ${API_TASK_DEFINITION}"
echo "web: ${WEB_TASK_DEFINITION}"

# ------------------------------------------------------------------ migrations
log "Running database migrations"
NETWORK="$(aws ecs describe-services --cluster "$CLUSTER" --services "$API_SERVICE" \
  --query 'services[0].networkConfiguration.awsvpcConfiguration' --output json)"
SUBNETS="$(jq -r '.subnets | join(",")' <<<"$NETWORK")"
SECURITY_GROUPS="$(jq -r '.securityGroups | join(",")' <<<"$NETWORK")"

MIGRATION_TASK="$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --launch-type FARGATE \
  --task-definition "$API_TASK_DEFINITION" \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUPS}],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"api","command":["sh","-c","node scripts/check-migrations.js && npx prisma migrate deploy"]}]}' \
  --started-by "github-${GITHUB_RUN_ID:-local}" \
  --query 'tasks[0].taskArn' --output text)"

if [ -z "$MIGRATION_TASK" ] || [ "$MIGRATION_TASK" = "None" ]; then
  echo "::error::The migration task could not be started"
  exit 1
fi
echo "migration task: ${MIGRATION_TASK}"

aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$MIGRATION_TASK"
EXIT_CODE="$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$MIGRATION_TASK" \
  --query 'tasks[0].containers[?name==`api`].exitCode | [0]' --output text)"

if [ "$EXIT_CODE" != "0" ]; then
  echo "::error::Database migration failed (exit code ${EXIT_CODE}). Services were not changed."
  TASK_ID="${MIGRATION_TASK##*/}"
  LOG_GROUP="$(aws ecs describe-task-definition --task-definition "$API_TASK_DEFINITION" \
    --query 'taskDefinition.containerDefinitions[?name==`api`].logConfiguration.options."awslogs-group" | [0]' --output text)"
  aws logs get-log-events --log-group-name "$LOG_GROUP" --log-stream-name "api/api/${TASK_ID}" \
    --query 'events[].message' --output text || true
  exit 1
fi
echo "migrations applied"

# ------------------------------------------------------------------ roll out
# A service created by the first (initialDeploy) CDK run has no tasks yet; give it some.
desired_count() {
  local service="$1" configured="${2:-}" current
  current="$(aws ecs describe-services --cluster "$CLUSTER" --services "$service" --query 'services[0].desiredCount' --output text)"
  if [ "$current" = "0" ]; then echo "${configured:-1}"; else echo "$current"; fi
}

deploy_service() {
  local service="$1" task_definition="$2" count="$3"
  log "Deploying ${service} (${count} task(s))"
  aws ecs update-service --cluster "$CLUSTER" --service "$service" \
    --task-definition "$task_definition" --desired-count "$count" >/dev/null
}

API_COUNT="$(desired_count "$API_SERVICE" "${API_DESIRED_COUNT:-}")"
WEB_COUNT="$(desired_count "$WEB_SERVICE" "${WEB_DESIRED_COUNT:-}")"
deploy_service "$API_SERVICE" "$API_TASK_DEFINITION" "$API_COUNT"
deploy_service "$WEB_SERVICE" "$WEB_TASK_DEFINITION" "$WEB_COUNT"

log "Waiting for the services to become stable"
aws ecs wait services-stable --cluster "$CLUSTER" --services "$API_SERVICE" "$WEB_SERVICE"

# "stable" also happens after an automatic rollback, so confirm the new revision is what is running
for pair in "${API_SERVICE}=${API_TASK_DEFINITION}" "${WEB_SERVICE}=${WEB_TASK_DEFINITION}"; do
  service="${pair%%=*}"
  expected="${pair#*=}"
  primary="$(aws ecs describe-services --cluster "$CLUSTER" --services "$service" \
    --query 'services[0].deployments[?status==`PRIMARY`] | [0].[taskDefinition, rolloutState]' --output text)"
  actual="$(cut -f1 <<<"$primary")"
  state="$(cut -f2 <<<"$primary")"
  if [ "$actual" != "$expected" ] || [ "$state" != "COMPLETED" ]; then
    echo "::error::${service} did not finish on ${expected} (running ${actual}, state ${state}). It was probably rolled back; check the service events."
    exit 1
  fi
  echo "${service} is running ${expected}"
done

log "Recording ${IMAGE_TAG} as the deployed version"
aws ssm put-parameter --name "$TAG_PARAMETER" --type String --value "$IMAGE_TAG" --overwrite >/dev/null

log "Deployed ${IMAGE_TAG}"
