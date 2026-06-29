#!/usr/bin/env bash
# Sauvegarde quotidienne de la base AssurTrack (compressée + rotation).
#
# Installation cron (tous les jours à 02h00) :
#   crontab -e
#   0 2 * * * /chemin/vers/AssurTrack/scripts/backup-db.sh >> /var/log/assurtrack-backup.log 2>&1
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Charge les variables du .env (POSTGRES_USER / POSTGRES_DB)
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/assurtrack}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_USER="${POSTGRES_USER:-assurtrack_user}"
DB_NAME="${POSTGRES_DB:-assurtrack}"
STAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

docker exec assurtrack-db pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/assurtrack_$STAMP.sql.gz"

# Purge des sauvegardes plus anciennes que RETENTION_DAYS jours
find "$BACKUP_DIR" -name 'assurtrack_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[$(date)] Sauvegarde OK : $BACKUP_DIR/assurtrack_$STAMP.sql.gz"
