#!/usr/bin/env bash
# ============================================
# quick-deploy.sh — Interactive Quick Deploy
# ============================================
# Run this on a fresh VPS as root.
# It will:
#   1. Run setup.sh (install deps, create user)
#   2. Ask for your domain + git repo URL
#   3. Clone code as billdesk user
#   4. Generate .env.production
#   5. Configure Caddy with your domain
#   6. Deploy!
#   7. Print final URL
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  BillDesk Pro — Quick VPS Deployment    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check root
if [[ $EUID -ne 0 ]]; then
    echo "❌ Run as root: sudo bash quick-deploy.sh"
    exit 1
fi

# ============================================
# Gather info
# ============================================
read -p "🌐 Your domain (e.g. billdesk.example.com): " DOMAIN
read -p "📦 Git repo URL (e.g. https://github.com/user/repo.git): " REPO_URL
read -p "📧 Support email (optional, press Enter to skip): " SUPPORT_EMAIL

if [[ -z "$DOMAIN" ]] || [[ -z "$REPO_URL" ]]; then
    echo "❌ Domain and repo URL are required."
    exit 1
fi

# Verify DNS
VPS_IP=$(curl -s ifconfig.me)
echo ""
echo -e "${YELLOW}🔍 Checking DNS for $DOMAIN...${NC}"
DOMAIN_IP=$(dig +short $DOMAIN | head -1)
if [[ "$DOMAIN_IP" != "$VPS_IP" ]]; then
    echo -e "${YELLOW}⚠️  Warning: $DOMAIN resolves to $DOMAIN_IP, but this VPS is $VPS_IP${NC}"
    echo "   Make sure your A record points to $VPS_IP"
    read -p "Continue anyway? [y/N] " confirm
    [[ $confirm == [yY] ]] || exit 0
else
    echo -e "${GREEN}✓ DNS correctly points to this VPS${NC}"
fi

# ============================================
# 1. Run setup.sh
# ============================================
echo ""
echo -e "${GREEN}=== Step 1/4: Provisioning VPS ===${NC}"
if ! command -v node &> /dev/null; then
    bash setup.sh
else
    echo -e "${YELLOW}Node.js already installed ($(node --version)). Skipping setup.sh${NC}"
fi

# ============================================
# 2. Clone repo as billdesk user
# ============================================
echo ""
echo -e "${GREEN}=== Step 2/4: Cloning code ===${NC}"
if [[ ! -d /home/billdesk/app/.git ]]; then
    sudo -u billdesk git clone "$REPO_URL" /home/billdesk/app
else
    echo "  Repo already cloned. Pulling latest..."
    sudo -u billdesk git -C /home/billdesk/app pull
fi

# ============================================
# 3. Generate .env.production
# ============================================
echo ""
echo -e "${GREEN}=== Step 3/4: Configuring environment ===${NC}"
NEXTAUTH_SECRET=$(openssl rand -base64 32)

sudo -u billdesk bash -c "cat > /home/billdesk/app/.env.production << EOF
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=https://$DOMAIN
DATABASE_URL=file:/home/billdesk/app/db/production.db
APP_NAME=BillDesk Pro
SUPPORT_EMAIL=${SUPPORT_EMAIL:-support@$DOMAIN}
TRIAL_DAYS=14
EOF"

sudo -u billdesk chmod 600 /home/billdesk/app/.env.production
echo -e "${GREEN}✓ .env.production created${NC}"

# ============================================
# 4. Configure Caddy + Deploy
# ============================================
echo ""
echo -e "${GREEN}=== Step 4/4: Configuring Caddy + Deploying ===${NC}"

# Caddyfile
cat > /etc/caddy/Caddyfile << EOF
$DOMAIN {
    reverse_proxy localhost:3000
    encode gzip zstd

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    @static path *.js *.css *.png *.jpg *.svg *.woff2 *.ico
    header @static Cache-Control "public, max-age=31536000, immutable"

    log {
        output file /var/log/caddy/billdesk.log
    }
}
EOF

systemctl restart caddy

# Install tsx globally for seed
sudo -u billdesk npm install -g tsx 2>/dev/null || true

# Deploy
sudo -u billdesk bash -c "cd /home/billdesk/app && bash deploy/deploy.sh"

# ============================================
# Done
# ============================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           🎉 DEPLOYMENT COMPLETE!        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 Your app is live at:${NC} https://$DOMAIN"
echo ""
echo -e "${YELLOW}Login credentials (CHANGE IMMEDIATELY):${NC}"
echo "  👑 Super Admin: admin@billdesk.pro / admin123"
echo "  🏪 Tenant:      rahul@sharma-electronics.in / rahul123"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Login & change all default passwords"
echo "  2. Set up backups: crontab -e (as billdesk)"
echo "     → 0 3 * * * /home/billdesk/app/deploy/backup.sh"
echo "  3. Install fail2ban: sudo apt install fail2ban"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 logs billdesk-pro        # view app logs"
echo "  pm2 status                   # check status"
echo "  sudo systemctl status caddy  # check SSL/proxy"
echo ""
echo -e "${GREEN}Docs: /home/billdesk/app/deploy/README.md${NC}"
