#!/usr/bin/env bash
# ============================================
# backup.sh — Daily DB Backup
# ============================================
# Run as billdesk user. Add to crontab:
#   crontab -e
#   0 3 * * * /home/billdesk/app/deploy/backup.sh
#
# Keeps last 30 days of backups.
# ============================================

set -e

APP_DIR="/home/billdesk/app"
DB_FILE="$APP_DIR/db/production.db"
BACKUP_DIR="$APP_DIR/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/billdesk-$DATE.db"

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up database..."

# Use sqlite3 .backup for consistent snapshot
if [[ -f "$DB_FILE" ]]; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
    # Compress
    gzip "$BACKUP_FILE"
    echo "✓ Saved: ${BACKUP_FILE}.gz ($(du -h ${BACKUP_FILE}.gz | cut -f1))"
else
    echo "⚠️  Database file not found: $DB_FILE"
    exit 1
fi

# ============================================
# Cleanup old backups (keep last 30 days)
# ============================================
echo "🧹 Cleaning up backups older than 30 days..."
find "$BACKUP_DIR" -name "billdesk-*.db.gz" -mtime +30 -delete
echo "✓ Cleanup done"

# ============================================
# Optional: upload to S3 / cloud
# ============================================
# Uncomment and configure if you use aws-cli:
# aws s3 cp "${BACKUP_FILE}.gz" s3://your-bucket/billdesk-backups/ --storage-class STANDARD_IA

echo "✅ Backup complete"
