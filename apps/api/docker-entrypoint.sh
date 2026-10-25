#!/bin/sh
# Container entrypoint for the API.
#
# On AWS the database credentials arrive as separate values (DB_USER and DB_PASSWORD come from Secrets Manager,
# DB_HOST/DB_PORT/DB_NAME from the task definition). Prisma and the app read one DATABASE_URL, so build it here.
# A DATABASE_URL that is already set (local Docker, tests) is left alone. The generated password is
# alphanumeric, so it needs no URL encoding.
set -e

if [ -z "$DATABASE_URL" ] && [ -n "$DB_HOST" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}?schema=public&sslmode=${DB_SSLMODE:-require}"
fi

exec "$@"
