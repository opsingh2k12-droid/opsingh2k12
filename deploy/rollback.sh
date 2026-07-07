#!/usr/bin/env bash
# ============================================
# rollback.sh — Rollback to previous deploy
# ============================================
# Usage: bash deploy/rollback.sh
# ============================================

set -e

APP_DIR="/home/billdesk/app"
cd "$APP_DIR"

echo "⏪ Rolling back to previous commit..."

# Get last good commit
PREV_COMMIT=$(git log --skip=1 -1 --pretty=format:"%H")
echo "  Rolling back to: $PREV_COMMIT ($(git log --skip=1 -1 --pretty=format:'%h - %s'))"

read -p "Continue? [y/N] " confirm
[[ $confirm == [yY] ]] || exit 0

git reset --hard "$PREV_COMMIT"

# Rebuild
npm install
npx prisma generate
npm run build
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || true
pm2 restart billdesk-pro --update-env

echo "✅ Rolled back to $PREV_COMMIT"
echo "Check: pm2 logs billdesk-pro"
