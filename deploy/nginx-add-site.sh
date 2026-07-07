#!/usr/bin/env bash
# ============================================
# nginx-add-site.sh
# ============================================
# Safely add billdesk.wifiwalanet.in to existing Nginx
# WITHOUT touching trade.wifiwalanet.in config.
#
# Then provision SSL via certbot (same as trade).
#
# Usage (as root): bash deploy/nginx-add-site.sh
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
BACKUP_DIR="/etc/nginx/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SITE_NAME="billdesk"
DOMAIN="billdesk.wifiwalanet.in"

echo -e "${GREEN}🌐 Adding $DOMAIN to Nginx${NC}"

# ============================================
# 1. Pre-flight checks
# ============================================
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ Run as root: sudo bash deploy/nginx-add-site.sh${NC}"
    exit 1
fi

if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ Nginx not installed!${NC}"
    exit 1
fi

# Verify trade config exists (sanity check)
TRADE_FOUND=false
for dir in "$NGINX_ENABLED" "/etc/nginx/conf.d"; do
    if [[ -d "$dir" ]]; then
        if grep -rl "trade.wifiwalanet.in" "$dir" 2>/dev/null | head -1 | grep -q .; then
            TRADE_FOUND=true
            echo -e "${GREEN}✓ Found trade.wifiwalanet.in config (we won't touch it)${NC}"
            break
        fi
    fi
done
$TRADE_FOUND || echo -e "${YELLOW}⚠️  trade config not found in standard locations${NC}"

# ============================================
# 2. Create directories if missing
# ============================================
mkdir -p "$NGINX_AVAILABLE" "$NGINX_ENABLED" "$BACKUP_DIR"

# ============================================
# 3. Backup current nginx config
# ============================================
tar -czf "$BACKUP_DIR/nginx-config-backup-$TIMESTAMP.tar.gz" \
    /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || true
echo -e "${GREEN}✓ Backed up nginx config to $BACKUP_DIR/nginx-config-backup-$TIMESTAMP.tar.gz${NC}"

# ============================================
# 4. Remove old billdesk config if exists
# ============================================
if [[ -f "$NGINX_ENABLED/$SITE_NAME" ]] || [[ -f "$NGINX_AVAILABLE/$SITE_NAME" ]]; then
    echo -e "${YELLOW}⚠️  $SITE_NAME config already exists, removing old one...${NC}"
    rm -f "$NGINX_ENABLED/$SITE_NAME" "$NGINX_AVAILABLE/$SITE_NAME"
fi

# ============================================
# 5. Copy new config
# ============================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_CONF="$SCRIPT_DIR/nginx-billdesk.conf"

if [[ ! -f "$SOURCE_CONF" ]]; then
    echo -e "${RED}❌ $SOURCE_CONF not found${NC}"
    exit 1
fi

cp "$SOURCE_CONF" "$NGINX_AVAILABLE/$SITE_NAME"
ln -sf "$NGINX_AVAILABLE/$SITE_NAME" "$NGINX_ENABLED/$SITE_NAME"
echo -e "${GREEN}✓ Installed nginx config: $NGINX_AVAILABLE/$SITE_NAME${NC}"

# ============================================
# 6. Test nginx config
# ============================================
echo -e "${YELLOW}🔍 Testing nginx config...${NC}"
if ! nginx -t; then
    echo -e "${RED}❌ Nginx config test failed! Rolling back...${NC}"
    rm -f "$NGINX_ENABLED/$SITE_NAME" "$NGINX_AVAILABLE/$SITE_NAME"
    echo -e "${YELLOW}✓ Rolled back. Trade site is safe.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Nginx config test passed${NC}"

# ============================================
# 7. Reload nginx (graceful — no downtime)
# ============================================
echo -e "${YELLOW}🔄 Reloading nginx (graceful)...${NC}"
systemctl reload nginx
sleep 2

if ! systemctl is-active --quiet nginx; then
    echo -e "${RED}❌ Nginx not active after reload! Rolling back...${NC}"
    rm -f "$NGINX_ENABLED/$SITE_NAME" "$NGINX_AVAILABLE/$SITE_NAME"
    systemctl restart nginx
    echo -e "${YELLOW}✓ Rolled back. Trade should be back.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Nginx reloaded${NC}"

# ============================================
# 8. Provision SSL via certbot (like trade)
# ============================================
echo ""
echo -e "${GREEN}🔒 Provisioning SSL certificate...${NC}"
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}⚠️  Certbot not installed. Installing...${NC}"
    apt-get install -y certbot python3-certbot-nginx
fi

# Run certbot non-interactively
certbot --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --redirect || {
    echo -e "${YELLOW}⚠️  Certbot failed. You can run manually later:${NC}"
    echo "  certbot --nginx -d $DOMAIN"
    echo "  App will work on HTTP for now."
}

# ============================================
# 9. Verify
# ============================================
echo ""
echo -e "${YELLOW}🔍 Verifying sites...${NC}"
sleep 3

# Check trade
TRADE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://trade.wifiwalanet.in" 2>/dev/null || echo "FAIL")
echo -e "  trade.wifiwalanet.in   → HTTP $TRADE_STATUS"

# Check billdesk
BILLING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" 2>/dev/null || echo "FAIL")
echo -e "  $DOMAIN → HTTP $BILLING_STATUS"
if [[ "$BILLING_STATUS" == "502" ]]; then
    echo -e "${YELLOW}  (502 = nginx up, but app on port 3001 not running yet — start it with pm2)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Nginx config added!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Trade site:    https://trade.wifiwalanet.in (untouched)"
echo "Billing site:  https://$DOMAIN"
echo ""
echo "Backup: $BACKUP_DIR/nginx-config-backup-$TIMESTAMP.tar.gz"
echo ""
echo "If anything breaks, rollback:"
echo "  rm $NGINX_ENABLED/$SITE_NAME"
echo "  systemctl reload nginx"
