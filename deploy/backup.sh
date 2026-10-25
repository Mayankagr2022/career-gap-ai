#!/usr/bin/env bash
# Dump the PostgreSQL database to a compressed file and delete dumps older than KEEP_DAYS (default 14).
# Schedule it with cron, for example every night at 02:30:
#
#   30 2 * * * /opt/careergap/backup.sh >> /opt/careergap/backups/backup.log 2>&1
#
# A backup on the same server does not survive losing the server: also copy the backups folder somewhere else
# (another machine, or an object storage bucket).
#
# Restore:  gunzip -c backups/<file>.sql.gz | docker compose --project-name careergap exec -T postgres psql -U careergap -d careergap
set -euo pipefail

cd "$(dirname "$0")"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p backups

user="$(grep -E '^POSTGRES_USER=' .env | head -n1 | cut -d= -f2- || true)"
db="$(grep -E '^POSTGRES_DB=' .env | head -n1 | cut -d= -f2- || true)"
user="${user:-careergap}"
db="${db:-careergap}"

file="backups/${db}-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose --project-name careergap exec -T postgres pg_dump -U "$user" -d "$db" --no-owner | gzip > "${file}.partial"
mv "${file}.partial" "$file"
echo "$(date -Is) wrote ${file} ($(du -h "$file" | cut -f1))"

find backups -name '*.sql.gz' -mtime +"$KEEP_DAYS" -delete
