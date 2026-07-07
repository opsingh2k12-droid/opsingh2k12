#!/usr/bin/env bash
# ============================================
# setup.sh — Fresh VPS Provisioning
# ============================================
# Run ONCE on a brand-new Ubuntu 22.04/24.04 VPS as root (or with sudo).
#
# Usage:
#   ssh root@YOUR_VPS_IP
#   curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/deploy/setup.sh | bash
#   OR
#   scp setup.sh root@YOUR_VPS_IP:/root/
#   ssh root@YOUR_VPS_IP "bash /root/setup.sh"
#
# What it does:
#   1. Updates system packages
#   2. Installs: Node.js 20 LTS, PM2, Git, Caddy, build tools
#   3. Creates `billdesk` user
#   4. Sets up /home/billdesk/app directory structure
#   5. Enables Caddy + PM2 on boot
#   6. Configures firewall (ufw)
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 BillDesk Pro — VPS Setup Starting${NC}"
echo "This script will:"
echo "  - Update system packages"
echo "  - Install Node.js 20 LTS, PM2, Git, Caddy"
echo "  - Create 'billdesk' user"
echo "  - Set up firewall"
echo ""
read -p "Continue? [y/N] " confirm
[[ $confirm == [yY] ]] || exit 0

# ============================================
# 1. System update
# ============================================
echo -e "${YELLOW}📦 Updating system packages...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git build-essential python3 ufw ca-certificates gnupg sqlite3

# ============================================
# 2. Node.js 20 LTS via NodeSource
# ============================================
echo -e "${YELLOW}⚙️  Installing Node.js 20 LTS...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✓ npm: $(npm --version)${NC}"

# ============================================
# 3. PM2 (process manager)
# ============================================
echo -e "${YELLOW}🔧 Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2@latest
fi
echo -e "${GREEN}✓ PM2: $(pm2 --version)${NC}"

# ============================================
# 4. Caddy (reverse proxy + auto SSL)
# ============================================
echo -e "${YELLOW}🌐 Installing Caddy...${NC}"
if ! command -v caddy &> /dev/null; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y
    apt-get install -y caddy
fi
echo -e "${GREEN}✓ Caddy: $(caddy version)${NC}"

# ============================================
# 5. Create billdesk user
# ============================================
echo -e "${YELLOW}👤 Creating billdesk user...${NC}"
if ! id -u billdesk &> /dev/null; then
    useradd -m -s /bin/bash billdesk
    echo "billdesk ALL=(ALL) NOPASSWD: /bin/systemctl restart caddy, /bin/systemctl restart pm2-billdesk, /usr/bin/pm2" >> /etc/sudoers.d/billdesk
fi
mkdir -p /home/billdesk/app/{db,logs,uploads,backups}
chown -R billdesk:billdesk /home/billdesk
echo -e "${GREEN}✓ User 'billdesk' created with app dirs${NC}"

# ============================================
# 6. Firewall (ufw)
# ============================================
echo -e "${YELLOW}🛡️  Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
echo -e "${GREEN}✓ Firewall enabled (ports 22, 80, 443 open)${NC}"

# ============================================
# 7. Enable PM2 on boot
# ============================================
echo -e "${YELLOW}🔄 Setting PM2 to start on boot...${NC}"
sudo -u billdesk env PATH=$PATH:/usr/bin pm2 startup systemd -u billdesk --hp /home/billdesk
# The above command will print a `sudo env...` line — run it:
# (already handled by -u flag, but to be safe)
echo -e "${GREEN}✓ PM2 will auto-start on boot${NC}"

# ============================================
# 8. Enable Caddy on boot
# ============================================
echo -e "${YELLOW}🔄 Enabling Caddy on boot...${NC}"
systemctl enable caddy
systemctl restart caddy
echo -e "${GREEN}✓ Caddy enabled and started${NC}"

# ============================================
# 9. SSH hardening (optional but recommended)
# ============================================
echo -e "${YELLOW}🔒 Hardening SSH (disable root password login)...${NC}"
if grep -q "^#PermitRootLogin" /etc/ssh/sshd_config; then
    sed -i 's/^#PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
    systemctl reload ssh
    echo -e "${GREEN}✓ SSH root password login disabled${NC}"
fi

# ============================================
# Done
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ VPS setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Point your domain's A record to this server's IP:"
echo "   $(curl -s ifconfig.me)"
echo ""
echo "2. As billdesk user, clone repo and deploy:"
echo "   su - billdesk"
echo "   git clone https://github.com/YOUR_REPO.git app"
echo "   cd app"
echo "   cp deploy/.env.production.example .env.production"
echo "   nano .env.production  # fill values"
echo "   bash deploy/deploy.sh"
echo ""
echo "3. Configure Caddy with your domain:"
echo "   sudo nano /etc/caddy/Caddyfile"
echo "   # Replace YOUR_DOMAIN.COM"
echo "   sudo systemctl restart caddy"
echo ""
echo "4. Visit https://YOUR_DOMAIN.COM"
echo ""
echo "Logs:"
echo "  App logs:   pm2 logs billdesk-pro"
echo "  Caddy logs: sudo journalctl -u caddy -f"
echo ""
