# 🚀 BillDesk Pro — VPS Deployment Guide

Deploy BillDesk Pro on your own VPS with **PM2 + Node.js + Caddy (auto-SSL)**.

> **Stack:** Ubuntu 22.04+ · Node.js 20 LTS · PM2 · Caddy · SQLite · Next.js standalone

---

## 📋 Prerequisites

Before you start, you need:

| Requirement | How to get it |
|---|---|
| VPS (root access) | Hetzner, DigitalOcean, Vultr, Linode, Contabo, etc. |
| 1GB+ RAM (2GB recommended) | |
| Ubuntu 22.04 or 24.04 LTS | Most VPS providers offer this pre-installed |
| Domain name | Pointed to your VPS IP via A record |
| Git repo | Code pushed to GitHub/GitLab/Gitea |
| SSH access to VPS | `ssh root@YOUR_VPS_IP` |

---

## 🌐 Step 1 — Point Domain to VPS

In your domain registrar's DNS panel (Cloudflare/Namecheap/GoDaddy):

| Type | Name | Value | TTL |
|---|---|---|---|
| **A** | `@` | `YOUR_VPS_IP` | Auto |
| **A** | `www` | `YOUR_VPS_IP` | Auto |

Verify with:
```bash
dig +short yourdomain.com
# Should return YOUR_VPS_IP
```

⏱️ DNS propagation takes 5-30 min. You can proceed with setup meanwhile.

---

## 🖥️ Step 2 — Provision VPS (one-time)

SSH into your VPS as root:
```bash
ssh root@YOUR_VPS_IP
```

Download and run the setup script:
```bash
# Option A: If you've pushed code to git
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy/setup.sh | bash

# Option B: SCP the file directly
# (from your local machine)
scp deploy/setup.sh root@YOUR_VPS_IP:/root/
ssh root@YOUR_VPS_IP "bash /root/setup.sh"
```

**What setup.sh does:**
- ✅ Updates system packages
- ✅ Installs Node.js 20 LTS, PM2, Git, Caddy, build tools
- ✅ Creates `billdesk` user with sudo access for Caddy/PM2
- ✅ Sets up `/home/billdesk/app/{db,logs,uploads,backups}` dirs
- ✅ Configures UFW firewall (ports 22, 80, 443 open)
- ✅ Enables PM2 + Caddy to start on boot
- ✅ Hardens SSH (disables root password login — keep your SSH key handy!)

---

## 📥 Step 3 — Clone Code & Configure

Switch to billdesk user:
```bash
su - billdesk
cd /home/billdesk/app
```

Clone your repo:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

> 💡 If using a private repo, set up SSH keys or use a personal access token.

Create environment file:
```bash
cp deploy/.env.production.example .env.production
nano .env.production
```

**Edit these values:**

```bash
# Generate a secure secret:
openssl rand -base64 32
# Paste the output as NEXTAUTH_SECRET

NEXTAUTH_SECRET=YOUR_GENERATED_SECRET_HERE
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=file:/home/billdesk/app/db/production.db

# Optional: configure email/Razorpay/WhatsApp if you have keys
```

---

## 🚀 Step 4 — Deploy

```bash
bash deploy/deploy.sh
```

**What happens:**
1. 📥 Pulls latest code
2. 📦 Installs dependencies
3. 🔧 Generates Prisma client
4. 💾 Pushes DB schema + runs seed (first time only)
5. 🔨 Builds Next.js (standalone)
6. 📁 Copies static + public files
7. 🔄 Starts/restarts PM2
8. ❤️ Health check

**Output should show:**
```
✅ Deploy complete!
App running at: http://localhost:3000
Public URL:     https://yourdomain.com
```

---

## 🌍 Step 5 — Configure Caddy (SSL + Reverse Proxy)

Edit Caddy config:
```bash
sudo nano /etc/caddy/Caddyfile
```

**Replace the entire file with:**
```
yourdomain.com {
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
```

(Or use the template from `deploy/Caddyfile` — just replace `YOUR_DOMAIN.COM`.)

Validate and restart:
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
sudo systemctl status caddy
```

🎉 Visit `https://yourdomain.com` — SSL is auto-provisioned by Let's Encrypt!

---

## 🔐 Step 6 — Login & Verify

Use the seeded demo accounts:

| Role | Email | Password |
|---|---|---|
| 👑 **Super Admin** | `admin@billdesk.pro` | `admin123` |
| 🏪 **Tenant (Pro)** | `rahul@sharma-electronics.in` | `rahul123` |
| 🏪 **Tenant (Starter)** | `verma@traders.in` | `verma123` |
| 🏪 **Tenant (Trial)** | `gupta@store.in` | `gupta123` |
| 🏪 **Tenant (Past Due)** | `patel@wholesale.in` | `patel123` |
| 🏪 **Tenant (Enterprise)** | `admin@techhub.in` | `tech123` |

⚠️ **CHANGE THESE PASSWORDS IMMEDIATELY** in production! (See "Post-Deploy" below.)

---

## 📅 Post-Deploy — Critical Tasks

### 1. Change default passwords

After first login, either:
- **Quickest:** Run a script to update password hashes
  ```bash
  cd /home/billdesk/app
  npx tsx -e "
    import { db } from './src/lib/db'
    import bcrypt from 'bcryptjs'
    const hash = await bcrypt.hash('YOUR_NEW_SECURE_PASSWORD', 10)
    await db.user.update({ where: { email: 'admin@billdesk.pro' }, data: { passwordHash: hash } })
    console.log('Done')
  "
  ```
- **Better:** Disable seed on production and add a signup-only flow.

### 2. Set up daily backups

```bash
crontab -e
# Add this line:
0 3 * * * /home/billdesk/app/deploy/backup.sh >> /home/billdesk/app/logs/backup.log 2>&1
```

### 3. Configure PM2 log rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 4. (Optional) Migrate SQLite → Postgres

For multi-instance scaling, migrate to PostgreSQL:

```bash
# 1. Install Postgres on VPS
sudo apt install postgresql postgresql-contrib

# 2. Create DB + user
sudo -u postgres createuser billdesk --pwprompt
sudo -u postgres createdb billdesk_pro --owner=billdesk

# 3. Update schema.prisma
# Change: provider = "sqlite"  →  provider = "postgresql"
# Change: url      = env(...)   →  same env, but postgres URL

# 4. Update .env.production
DATABASE_URL=postgresql://billdesk:PASSWORD@localhost:5432/billdesk_pro

# 5. Re-push schema
npx prisma db push
```

---

## 🛠️ Daily Operations

### Update app to latest version
```bash
cd /home/billdesk/app
bash deploy/deploy.sh
```

### View logs
```bash
# App logs (live)
pm2 logs billdesk-pro

# App logs (last 100 lines)
pm2 logs billdesk-pro --lines 100

# Caddy access logs
sudo tail -f /var/log/caddy/billdesk.log

# System logs
sudo journalctl -u caddy -f
```

### Restart app
```bash
pm2 restart billdesk-pro
```

### Rollback to previous deploy
```bash
cd /home/billdesk/app
bash deploy/rollback.sh
```

### Manual DB backup
```bash
bash deploy/backup.sh
```

### Restore DB from backup
```bash
cd /home/billdesk/app
pm2 stop billdesk-pro
gunzip < backups/billdesk-2026-07-07_03-00-00.db.gz > db/production.db
pm2 start billdesk-pro
```

---

## 🚨 Troubleshooting

### App not starting

```bash
pm2 logs billdesk-pro --lines 50
```

Common issues:
- **Port 3000 in use:** `lsof -i :3000` then kill the process
- **Env vars missing:** Check `.env.production` exists in `/home/billdesk/app/.next/standalone/`
- **DB locked:** `pm2 stop billdesk-pro`, then `fuser db/production.db` to find locks

### SSL not working

```bash
# Check Caddy status
sudo systemctl status caddy

# Check Caddy logs
sudo journalctl -u caddy -n 50

# Manually reload Caddy
sudo systemctl reload caddy

# Verify SSL cert
curl -vI https://yourdomain.com 2>&1 | grep -i ssl
```

Common causes:
- DNS not propagated: `dig yourdomain.com` should return VPS IP
- Port 443 blocked: `sudo ufw allow 443/tcp`
- Caddy can't bind: check `sudo ss -tlnp | grep -E ':(80|443)'`

### 502 Bad Gateway

App is down. Check:
```bash
pm2 status                    # is billdesk-pro online?
pm2 restart billdesk-pro      # try restarting
pm2 logs billdesk-pro --err   # check errors
```

### Database issues

```bash
# Check DB file
ls -la /home/billdesk/app/db/production.db

# Verify schema
sqlite3 /home/billdesk/app/db/production.db ".tables"

# Re-push schema (safe — won't delete data)
cd /home/billdesk/app
npx prisma db push
```

### Out of memory

```bash
# Check memory
free -h
pm2 monit

# If OOM, increase swap:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📊 Monitoring

### PM2 monitoring
```bash
pm2 monit                    # live CPU/memory
pm2 status                   # process status
pm2 info billdesk-pro        # detailed info
```

### Server monitoring
```bash
htop                         # process viewer
df -h                        # disk usage
free -h                      # memory
uptime                       # load average
```

### Set up PM2 monitoring (optional)
```bash
pm2 monitor                  # connect to PM2 Plus (free tier)
```

---

## 🔒 Security Checklist

- [ ] Changed default admin password
- [ ] SSH key auth enabled (disable password login)
- [ ] UFW firewall active (only 22/80/443 open)
- [ ] Fail2ban installed: `sudo apt install fail2ban`
- [ ] Automatic security updates: `sudo apt install unattended-upgrades`
- [ ] Daily DB backups running
- [ ] SSL certificate valid (auto-renews via Caddy)
- [ ] `.env.production` permissions: `chmod 600 .env.production`
- [ ] Strong NEXTAUTH_SECRET (32+ random chars)

---

## 📁 File Structure on VPS

```
/home/billdesk/
├── app/                          # ← your application
│   ├── .next/                    # build output
│   │   └── standalone/
│   │       ├── server.js         # ← PM2 runs this
│   │       ├── .next/static/     # static assets
│   │       ├── public/           # public assets
│   │       └── .env.production   # env file (copied)
│   ├── db/
│   │   └── production.db         # SQLite database
│   ├── logs/
│   │   ├── out.log               # PM2 stdout
│   │   └── err.log               # PM2 stderr
│   ├── uploads/                  # user uploads
│   ├── backups/                  # DB backups
│   ├── prisma/
│   ├── src/
│   ├── deploy/                   # ← deployment scripts
│   │   ├── .env.production.example
│   │   ├── ecosystem.config.cjs
│   │   ├── Caddyfile
│   │   ├── setup.sh
│   │   ├── deploy.sh
│   │   ├── backup.sh
│   │   └── rollback.sh
│   ├── .env.production           # ← your secrets (NEVER commit)
│   └── package.json
└── .pm2/                         # PM2 state
```

---

## 🆘 Emergency Contacts / Recovery

If app is completely broken:

```bash
# 1. Stop everything
pm2 stop billdesk-pro
sudo systemctl stop caddy

# 2. Restore last good backup
cd /home/billdesk/app
gunzip < backups/billdesk-LATEST.db.gz > db/production.db

# 3. Restart
pm2 start billdesk-pro
sudo systemctl start caddy

# 4. If still broken, full rollback
bash deploy/rollback.sh
```

---

## 📞 Support

- 📖 NextAuth docs: https://next-auth.js.org
- 📖 Prisma docs: https://pris.ly/d/prisma-schema
- 📖 Caddy docs: https://caddyserver.com/docs/
- 📖 PM2 docs: https://pm2.keymetrics.io/docs/usage/quick-start/

---

## 🎯 Quick Reference

| Action | Command |
|---|---|
| Deploy | `bash deploy/deploy.sh` |
| Restart app | `pm2 restart billdesk-pro` |
| View logs | `pm2 logs billdesk-pro` |
| Reload Caddy | `sudo systemctl reload caddy` |
| Backup DB | `bash deploy/backup.sh` |
| Rollback | `bash deploy/rollback.sh` |
| SSH to VPS | `ssh billdesk@YOUR_VPS_IP` |
| Check ports | `sudo ss -tlnp` |
| Check disk | `df -h` |

---

**That's it!** Your BillDesk Pro SaaS is now live at `https://yourdomain.com` 🎉
