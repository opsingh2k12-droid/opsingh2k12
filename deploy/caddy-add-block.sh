#!/usr/bin/env bash
# ============================================
# caddy-add-block.sh
# ============================================
# Safely ADD billing.wifiwalanet.in block to existing Caddyfile
# WITHOUT touching trade.wifiwalanet.in config.
#
# Usage (as root): bash deploy/caddy-add-block.sh
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CADDYFILE="/etc/caddy/Caddyfile"
BACKUP_DIR="/etc/caddy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}🌐 Adding billing.wifiwalanet.in to Caddy${NC}"

# ============================================
# 1. Pre-flight checks
# ============================================
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ Run as root: sudo bash deploy/caddy-add-block.sh${NC}"
    exit 1
fi

if [[ ! -f "$CADDYFILE" ]]; then
    echo -e "${RED}❌ Caddyfile not found at $CADDYFILE${NC}"
    echo "Is Caddy installed? Check: systemctl status caddy"
    exit 1
fi

# ============================================
# 2. Check if billing block already exists
# ============================================
if grep -q "billing.wifiwalanet.in" "$CADDYFILE"; then
    echo -e "${YELLOW}⚠️  billing.wifiwalanet.in block already exists in Caddyfile${NC}"
    read -p "Remove existing block and re-add? [y/N] " confirm
    if [[ $confirm == [yY] ]]; then
        # Backup first
        mkdir -p "$BACKUP_DIR"
        cp "$CADDYFILE" "$BACKUP_DIR/Caddyfile.before-billing-replace.$TIMESTAMP"
        # Remove old billing block (from "billing.wifiwalanet.in {" to matching "}")
        # Use sed to remove the block
        sed -i '/^billing\.wifiwalanet\.in {/,/^}/d' "$CADDYFILE"
        echo -e "${GREEN}✓ Removed old billing block${NC}"
    else
        echo "Aborting."
        exit 0
    fi
fi

# ============================================
# 3. Backup current Caddyfile (CRITICAL!)
# ============================================
mkdir -p "$BACKUP_DIR"
cp "$CADDYFILE" "$BACKUP_DIR/Caddyfile.before-billing-add.$TIMESTAMP"
echo -e "${GREEN}✓ Backed up Caddyfile to: $BACKUP_DIR/Caddyfile.before-billing-add.$TIMESTAMP${NC}"

# ============================================
# 4. Append billing block
# ============================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BILLING_BLOCK_FILE="$SCRIPT_DIR/Caddyfile.billing"

if [[ ! -f "$BILLING_BLOCK_FILE" ]]; then
    echo -e "${RED}❌ Caddyfile.billing not found at $BILLING_BLOCK_FILE${NC}"
    exit 1
fi

# Add a blank line separator then the billing block
echo "" >> "$CADDYFILE"
cat "$BILLING_BLOCK_FILE" >> "$CADDYFILE"
echo -e "${GREEN}✓ Appended billing block to Caddyfile${NC}"

# ============================================
# 5. Validate Caddyfile
# ============================================
echo -e "${YELLOW}🔍 Validating Caddyfile...${NC}"
if ! caddy validate --config "$CADDYFILE"; then
    echo -e "${RED}❌ Caddyfile validation failed! Rolling back...${NC}"
    cp "$BACKUP_DIR/Caddyfile.before-billing-add.$TIMESTAMP" "$CADDYFILE"
    echo -e "${YELLOW}Rolled back to previous Caddyfile${NC}"
    echo "Trade site is safe. Fix the error and try again."
    exit 1
fi
echo -e "${GREEN}✓ Caddyfile is valid${NC}"

# ============================================
# 6. Reload Caddy (NOT restart — reload is graceful, no downtime)
# ============================================
echo -e "${YELLOW}🔄 Reloading Caddy (graceful — trade site stays up)...${NC}"
systemctl reload caddy
sleep 2

if ! systemctl is-active --quiet caddy; then
    echo -e "${RED}❌ Caddy not active after reload! Rolling back...${NC}"
    cp "$BACKUP_DIR/Caddyfile.before-billing-add.$TIMESTAMP" "$CADDYFILE"
    systemctl restart caddy
    echo -e "${YELLOW}Rolled back. Trade site should be back.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Caddy reloaded successfully${NC}"

# ============================================
# 7. Verify both sites
# ============================================
echo ""
echo -e "${YELLOW}🔍 Verifying sites...${NC}"
sleep 3

# Check trade site (should still work)
TRADE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://trade.wifiwalanet.in 2>/dev/null || echo "FAIL")
if [[ "$TRADE_STATUS" == "200" ]] || [[ "$TRADE_STATUS" == "301" ]] || [[ "$TRADE_STATUS" == "302" ]]; then
    echo -e "${GREEN}✓ trade.wifiwalanet.in still working (HTTP $TRADE_STATUS)${NC}"
else
    echo -e "${RED}⚠️  trade.wifiwalanet.in returned $TRADE_STATUS — check manually!${NC}"
fi

# Check billing site
BILLING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://billing.wifiwalanet.in 2>/dev/null || echo "FAIL")
if [[ "$BILLING_STATUS" == "200" ]] || [[ "$BILLING_STATUS" == "301" ]] || [[ "$BILLING_STATUS" == "302" ]] || [[ "$BILLING_STATUS" == "502" ]]; then
    if [[ "$BILLING_STATUS" == "502" ]]; then
        echo -e "${YELLOW}⚠️  billing.wifiwalanet.in returned 502 — Caddy is up but app on port 3001 is not running yet${NC}"
        echo "   Start the app: cd /opt/billdesk && bash deploy/deploy.sh"
    else
        echo -e "${GREEN}✓ billing.wifiwalanet.in responding (HTTP $BILLING_STATUS)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  billing.wifiwalanet.in returned $BILLING_STATUS (DNS may not be propagated yet)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Caddy config updated!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Trade site:    https://trade.wifiwalanet.in (untouched)"
echo "Billing site:  https://billing.wifiwalanet.in (will work after app starts)"
echo ""
echo "Backup of old Caddyfile: $BACKUP_DIR/Caddyfile.before-billing-add.$TIMESTAMP"
echo ""
echo "If anything breaks, rollback:"
echo "  sudo cp $BACKUP_DIR/Caddyfile.before-billing-add.$TIMESTAMP /etc/caddy/Caddyfile"
echo "  sudo systemctl reload caddy"
