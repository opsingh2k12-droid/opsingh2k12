#!/usr/bin/env bash
# ============================================
# dns-check.sh — Verify DNS is pointed correctly
# ============================================
# Run from your LOCAL machine (not VPS).
# Checks if billing.wifiwalanet.in → VPS IP
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="billing.wifiwalanet.in"
TRADE_DOMAIN="trade.wifiwalanet.in"

echo -e "${YELLOW}🔍 DNS Check for $DOMAIN${NC}"
echo ""

# Get VPS IP (assume trade domain already points to it)
VPS_IP=$(dig +short $TRADE_DOMAIN | head -1)
if [[ -z "$VPS_IP" ]]; then
    echo -e "${RED}❌ Could not resolve $TRADE_DOMAIN${NC}"
    echo "Check your DNS or internet connection."
    exit 1
fi
echo -e "${GREEN}✓ $TRADE_DOMAIN → $VPS_IP${NC}"

# Check billing
BILLING_IP=$(dig +short $DOMAIN | head -1)
if [[ -z "$BILLING_IP" ]]; then
    echo -e "${RED}❌ $DOMAIN has NO DNS record yet${NC}"
    echo ""
    echo "Create an A record at your DNS provider:"
    echo "  Type:  A"
    echo "  Name:  billing"
    echo "  Value: $VPS_IP"
    echo "  TTL:   Auto / 3600"
    echo ""
    echo "After adding, wait 5-30 min and re-run this script."
    exit 1
fi

echo -e "${GREEN}✓ $DOMAIN → $BILLING_IP${NC}"

# Compare
if [[ "$BILLING_IP" == "$VPS_IP" ]]; then
    echo ""
    echo -e "${GREEN}🎉 DNS is correctly pointed!${NC}"
    echo "  $DOMAIN → $VPS_IP ✓"
    echo ""
    echo "You can now deploy billing app on VPS."
else
    echo ""
    echo -e "${RED}❌ DNS mismatch!${NC}"
    echo "  $TRADE_DOMAIN → $VPS_IP"
    echo "  $DOMAIN → $BILLING_IP"
    echo ""
    echo "Update the A record for 'billing' to point to: $VPS_IP"
    echo "Wait 5-30 min for propagation, then re-run."
    exit 1
fi

# Bonus: check www subdomain
WWW_IP=$(dig +short www.$DOMAIN | head -1)
if [[ -n "$WWW_IP" ]]; then
    if [[ "$WWW_IP" == "$VPS_IP" ]]; then
        echo -e "${GREEN}✓ www.$DOMAIN → $WWW_IP (also pointed)${NC}"
    else
        echo -e "${YELLOW}⚠️  www.$DOMAIN → $WWW_IP (different — optional, can ignore)${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✓ All checks passed. Ready to deploy!${NC}"
