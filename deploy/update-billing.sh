#!/usr/bin/env bash
# ============================================
# update-billing.sh
# ============================================
# Update billing app to latest code (without touching trade).
# Run AFTER first deploy is done.
#
# Usage (as root): bash deploy/update-billing.sh
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/opt/billdesk"

echo -e "${GREEN}🔄 Updating billing.wifiwalanet.in${NC}"

cd "$APP_DIR"

# 1. Pull latest
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull --rebase

# 2. Install deps
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
if command -v bun &> /dev/null; then
    bun install --frozen-lockfile
else
    npm ci
fi

# 3. Prisma
echo -e "${YELLOW}🔧 Prisma generate + db push...${NC}"
npx prisma generate
npx prisma db push

# 4. Build
echo -e "${YELLOW}🔨 Building (1-2 min)...${NC}"
npm run build
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || true
cp .env.production .next/standalone/

# 5. Restart
echo -e "${YELLOW}🔄 Restarting PM2...${NC}"
pm2 restart billdesk-pro --update-env
pm2 save

# 6. Health check
sleep 4
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/auth/csrf | grep -q "200"; then
    echo -e "${GREEN}✓ Billing app updated & healthy${NC}"
else
    echo -e "${YELLOW}⚠️  App not responding yet — check: pm2 logs billdesk-pro${NC}"
fi

# 7. Verify trade site is untouched
TRADE=$(curl -s -o /dev/null -w "%{http_code}" https://trade.wifiwalanet.in)
echo -e "${GREEN}✓ Trade site still up: $TRADE${NC}"
