#!/bin/bash

# PostgreSQL dump to compressed backup. Rotates files older than 7 days.                                                       
# Usage: make backup or `bash scripts/backup.sh`
# /!\ should be automated by cron. /!\

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"

source "$ROOT_DIR/.env"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gamefinder_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of '$POSTGRES_DB'..."

docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Saved: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

find "$BACKUP_DIR" -name "gamefinder_*.sql.gz" -mtime +7 -delete
echo "[$(date)] Old backups (>7 days) removed."
