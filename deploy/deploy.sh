#!/usr/bin/env bash
# ============================================
# deploy.sh — One-command deploy
# ============================================
# Run as `billdesk` user from the app directory.
#
# Usage:
#   cd /home/billdesk/app
#   bash deploy/deploy.sh
#
# What it does:
#   1. Pulls latest code from git
#   2. Installs dependencies
#   3. Generates Prisma client
#   4. Pushes schema to DB
#   5. Builds Next.js (standalone)
#   6. Copies standalone + static + public
#   7. Restarts PM2
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Move to app root (parent of deploy/ directory)
cd "$(dirname "$0")/.."
APP_DIR=$(pwd)

echo -e "${GREEN}🚀 Deploying BillDesk Pro from $APP_DIR${NC}"

# ============================================
# 1. Pre-flight checks
# ============================================
if [[ ! -f .env.production ]]; then
    echo -e "${RED}❌ .env.production not found!${NC}"
    echo "Create it from deploy/.env.production.example"
    exit 1
fi

if [[ -z "$(grep -v '^#' .env.production | grep NEXTAUTH_SECRET | grep -v CHANGE_ME)" ]]; then
    echo -e "${RED}❌ NEXTAUTH_SECRET not set in .env.production${NC}"
    echo "Generate one with: openssl rand -base64 32"
    exit 1
fi

# Load env
export $(grep -v '^#' .env.production | xargs)

# ============================================
# 2. Pull latest code
# ============================================
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull --rebase || {
    echo -e "${YELLOW}⚠️  Git pull failed (maybe local changes). Continuing...${NC}"
}

# ============================================
# 3. Install dependencies
# ============================================
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
if command -v bun &> /dev/null; then
    bun install --frozen-lockfile
else
    npm ci --omit=dev
    npm install
fi

# ============================================
# 4. Generate Prisma client
# ============================================
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

# ============================================
# 5. Push schema to database
# ============================================
echo -e "${YELLOW}💾 Pushing schema to database...${NC}"
npx prisma db push

# Optional: run seed only on first deploy (check if db exists)
if [[ ! -f db/production.db ]] || [[ $(sqlite3 db/production.db "SELECT COUNT(*) FROM Tenant;" 2>/dev/null || echo 0) -eq 0 ]]; then
    echo -e "${YELLOW}🌱 First deploy — running seed...${NC}"
    DATABASE_URL="file:$APP_DIR/db/production.db" npx tsx scripts/seed.ts 2>/dev/null || \
    DATABASE_URL="file:$APP_DIR/db/production.db" npx ts-node scripts/seed.ts 2>/dev/null || \
    echo -e "${YELLOW}⚠️  Seed skipped (tsx/ts-node not available). Install with: npm i -g tsx${NC}"
fi

# ============================================
# 6. Build Next.js
# ============================================
echo -e "${YELLOW}🔨 Building Next.js (this may take 1-2 min)...${NC}"
npm run build

# ============================================
# 7. Copy standalone + static + public
# ============================================
echo -e "${YELLOW}📁 Copying build artifacts...${NC}"
# Next.js standalone build creates .next/standalone/server.js
# But it doesn't include static files — copy them
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || mkdir -p .next/standalone/public
cp .env.production .next/standalone/

# ============================================
# 8. Restart PM2
# ============================================
echo -e "${YELLOW}🔄 Restarting PM2...${NC}"
if pm2 describe billdesk-pro &> /dev/null; then
    pm2 restart billdesk-pro --update-env
else
    pm2 start deploy/ecosystem.config.cjs --env production
fi
pm2 save

# ============================================
# 9. Health check
# ============================================
echo -e "${YELLOW}❤️  Health check...${NC}"
sleep 3
for i in {1..10}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/csrf | grep -q "200"; then
        echo -e "${GREEN}✓ App is healthy!${NC}"
        break
    fi
    echo "  Attempt $i: waiting..."
    sleep 2
    if [[ $i -eq 10 ]]; then
        echo -e "${RED}❌ App not responding. Check logs: pm2 logs billdesk-pro${NC}"
        exit 1
    fi
done

# ============================================
# Done
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deploy complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "App running at: http://localhost:3000"
echo "Public URL:     ${NEXTAUTH_URL}"
echo ""
echo "Useful commands:"
echo "  pm2 status                # see process status"
echo "  pm2 logs billdesk-pro     # tail logs"
echo "  pm2 monit                 # live monitor"
echo "  pm2 restart billdesk-pro  # manual restart"
echo ""
echo "Caddy (SSL/reverse proxy):"
echo "  sudo systemctl status caddy"
echo "  sudo systemctl restart caddy"
echo ""
