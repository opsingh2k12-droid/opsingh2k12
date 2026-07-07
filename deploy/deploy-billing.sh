#!/usr/bin/env bash
# ============================================
# deploy-billing.sh
# ============================================
# Deploy BillDesk Pro at /opt/billdesk on port 3001
# Runs ALONGSIDE trade.wifiwalanet.in (which stays untouched)
#
# Usage (as root):
#   bash deploy/deploy-billing.sh
#
# What it does:
#   1. Verifies trade site is still up (don't break it!)
#   2. Clones/updates code at /opt/billdesk
#   3. Installs deps, generates Prisma client
#   4. Builds Next.js (standalone)
#   5. Pushes schema to billing's own DB file
#   6. Restarts PM2 process "billdesk-pro"
#   7. Adds Caddy block for billing.wifiwalanet.in
#   8. Verifies both sites work
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================
# Config
# ============================================
APP_DIR="/opt/billdesk"
APP_PORT=3001
APP_USER="root" # Change if you want a different user
DOMAIN="billing.wifiwalanet.in"
TRADE_DOMAIN="trade.wifiwalanet.in"
REPO_URL="${REPO_URL:-https://github.com/YOUR_USERNAME/YOUR_REPO.git}" # ← Set this!

# ============================================
# Pre-flight checks
# ============================================
echo -e "${CYAN}🚀 BillDesk Pro — Additive Deploy${NC}"
echo "Will deploy billing app alongside $TRADE_DOMAIN"
echo "  App dir:  $APP_DIR"
echo "  Port:     $APP_PORT"
echo "  Domain:   $DOMAIN"
echo ""

if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ Run as root: sudo bash deploy/deploy-billing.sh${NC}"
    exit 1
fi

# Verify trade site is up before we touch anything
echo -e "${YELLOW}🔍 Pre-check: Is $TRADE_DOMAIN up?${NC}"
TRADE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$TRADE_DOMAIN" 2>/dev/null || echo "FAIL")
if [[ "$TRADE_STATUS" != "200" ]] && [[ "$TRADE_STATUS" != "301" ]] && [[ "$TRADE_STATUS" != "302" ]]; then
    echo -e "${YELLOW}⚠️  $TRADE_DOMAIN returned $TRADE_STATUS. Continue anyway?${NC}"
    read -p "[y/N] " confirm
    [[ $confirm == [yY] ]] || exit 0
else
    echo -e "${GREEN}✓ $TRADE_DOMAIN is healthy ($TRADE_STATUS)${NC}"
fi

# ============================================
# 1. Clone or update code
# ============================================
echo ""
echo -e "${GREEN}=== Step 1/7: Setting up code ===${NC}"
mkdir -p "$APP_DIR"

if [[ ! -d "$APP_DIR/.git" ]]; then
    echo -e "${YELLOW}📥 Cloning repo to $APP_DIR...${NC}"
    if [[ "$REPO_URL" == *"YOUR_USERNAME"* ]]; then
        echo -e "${RED}❌ REPO_URL not set!${NC}"
        echo "   Set it: export REPO_URL=https://github.com/yourname/repo.git"
        echo "   Or upload code via SCP."
        exit 1
    fi
    git clone "$REPO_URL" "$APP_DIR"
else
    echo -e "${YELLOW}📥 Pulling latest code...${NC}"
    git -C "$APP_DIR" pull --rebase || echo -e "${YELLOW}⚠️  Pull failed, continuing with existing code${NC}"
fi

cd "$APP_DIR"

# ============================================
# 2. Create .env.production if missing
# ============================================
echo ""
echo -e "${GREEN}=== Step 2/7: Environment config ===${NC}"
if [[ ! -f ".env.production" ]]; then
    echo -e "${YELLOW}📝 Creating .env.production...${NC}"
    cp deploy/.env.production.example .env.production
    # Generate secure secret
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    sed -i "s|CHANGE_ME_GENERATE_32_CHAR_RANDOM_STRING|$NEXTAUTH_SECRET|g" .env.production
    echo -e "${GREEN}✓ .env.production created with random NEXTAUTH_SECRET${NC}"
    echo -e "${YELLOW}⚠️  Review it: nano .env.production${NC}"
else
    echo -e "${GREEN}✓ .env.production already exists${NC}"
fi

chmod 600 .env.production

# ============================================
# 3. Create directories
# ============================================
mkdir -p db logs uploads backups

# ============================================
# 4. Install deps + build
# ============================================
echo ""
echo -e "${GREEN}=== Step 3/7: Installing dependencies ===${NC}"
if command -v bun &> /dev/null; then
    bun install --frozen-lockfile
else
    npm ci
fi

echo ""
echo -e "${GREEN}=== Step 4/7: Prisma + DB setup ===${NC}"

# Prisma CLI reads from .env (not .env.production). Create a symlink.
# This way both Prisma and Next.js can read env vars.
if [[ ! -f ".env" ]]; then
    ln -s .env.production .env
    echo -e "${GREEN}✓ Created .env symlink → .env.production${NC}"
fi

# Load env vars into current shell (for npx prisma to use)
set -a
source .env.production
set +a

echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}💾 Pushing schema to DB...${NC}"
npx prisma db push

# First-time seed
if [[ ! -f db/production.db ]] || [[ $(sqlite3 db/production.db "SELECT COUNT(*) FROM Tenant;" 2>/dev/null || echo 0) -eq 0 ]]; then
    echo -e "${YELLOW}🌱 First deploy — seeding database...${NC}"
    # Install tsx if not present
    npm install -D tsx 2>/dev/null
    DATABASE_URL="file:$(pwd)/db/production.db" npx tsx scripts/seed.ts
fi

echo ""
echo -e "${GREEN}=== Step 5/7: Building Next.js (1-2 min)...${NC}"
npm run build

# Copy standalone + static + public
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || mkdir -p .next/standalone/public
cp .env.production .next/standalone/.env.production
cp .env.production .next/standalone/.env

# ============================================
# 5. Restart PM2
# ============================================
echo ""
echo -e "${GREEN}=== Step 6/7: Starting PM2 process ===${NC}"
if pm2 describe billdesk-pro &> /dev/null; then
    pm2 restart billdesk-pro --update-env
else
    pm2 start deploy/ecosystem.config.cjs --env production
fi
pm2 save
echo -e "${GREEN}✓ billdesk-pro process running on port $APP_PORT${NC}"

# ============================================
# 6. Caddy block
# ============================================
echo ""
echo -e "${GREEN}=== Step 7/7: Caddy config ===${NC}"
bash deploy/caddy-add-block.sh

# ============================================
# 7. Final health check
# ============================================
echo ""
echo -e "${YELLOW}❤️  Health check...${NC}"
sleep 5

# Check app on localhost
APP_OK=false
for i in {1..15}; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$APP_PORT/api/auth/csrf" | grep -q "200"; then
        APP_OK=true
        break
    fi
    sleep 2
done

if $APP_OK; then
    echo -e "${GREEN}✓ App on port $APP_PORT is healthy${NC}"
else
    echo -e "${RED}❌ App not responding on port $APP_PORT${NC}"
    echo "Check logs: pm2 logs billdesk-pro"
fi

# Check trade site still works
TRADE_AFTER=$(curl -s -o /dev/null -w "%{http_code}" "https://$TRADE_DOMAIN" 2>/dev/null || echo "FAIL")
if [[ "$TRADE_AFTER" == "200" ]] || [[ "$TRADE_AFTER" == "301" ]] || [[ "$TRADE_AFTER" == "302" ]]; then
    echo -e "${GREEN}✓ $TRADE_DOMAIN still healthy ($TRADE_AFTER) — untouched${NC}"
else
    echo -e "${RED}⚠️  $TRADE_DOMAIN returned $TRADE_AFTER — CHECK IMMEDIATELY!${NC}"
fi

# Check billing site
BILLING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null || echo "FAIL")

# ============================================
# Done
# ============================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       🎉 BILLING APP DEPLOYED!              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Sites on this VPS:${NC}"
echo "  📊 $TRADE_DOMAIN   → port 3000 (unchanged)"
echo "  🧾 $DOMAIN  → port $APP_PORT (new)"
echo ""

if [[ "$BILLING_STATUS" == "200" ]] || [[ "$BILLING_STATUS" == "301" ]] || [[ "$BILLING_STATUS" == "302" ]]; then
    echo -e "${GREEN}🌐 Visit: https://$DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠️  billing site returned $BILLING_STATUS${NC}"
    echo "Likely causes:"
    echo "  1. DNS not propagated yet (wait 5-30 min, then retry)"
    echo "  2. SSL still provisioning (Caddy auto-fetches, give it 30 sec)"
    echo "  3. App not started yet — check: pm2 logs billdesk-pro"
fi
echo ""
echo -e "${YELLOW}Default logins (CHANGE IMMEDIATELY):${NC}"
echo "  👑 Super Admin: admin@billdesk.pro / admin123"
echo "  🏪 Tenant:      rahul@sharma-electronics.in / rahul123"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 status                    # see both apps"
echo "  pm2 logs billdesk-pro         # billing logs"
echo "  sudo systemctl status caddy   # reverse proxy"
echo "  sudo journalctl -u caddy -f   # caddy logs"
echo ""
