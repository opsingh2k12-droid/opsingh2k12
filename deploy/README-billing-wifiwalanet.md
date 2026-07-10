# 🚀 Deploy billdesk.wifiwalanet.in (alongside trade.wifiwalanet.in)

> **Scenario:** You have a VPS where `trade.wifiwalanet.in` (Node.js) is already running on Caddy. You want to add `billdesk.wifiwalanet.in` (BillDesk Pro) on the **same VPS** without breaking trade.

---

## 📋 Your Setup Summary

| Item | Value |
|---|---|
| Reverse proxy | Caddy (existing) |
| Existing site | trade.wifiwalanet.in → port 3000 |
| New site | billdesk.wifiwalanet.in → **port 3001** |
| Tech stack | Node.js + PM2 (both apps) |
| VPS user | root |
| App directory | `/opt/billdesk` |
| DB | SQLite at `/opt/billdesk/db/production.db` (separate from trade's DB) |

✅ Trade app **stays untouched** — different port, different PM2 process, different DB file, separate Caddy block.

---

## 🗺️ Step-by-Step Deploy Plan

### ✅ Step 0: Backup trade site config (safety net)

```bash
# SSH to VPS as root
ssh root@YOUR_VPS_IP

# Backup critical files (5 seconds, zero risk)
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup-before-billing-$(date +%Y%m%d)
pm2 save
```

---

### 🌐 Step 1: Add DNS A record for `billdesk.wifiwalanet.in`

At your DNS provider (Cloudflare/GoDaddy/Namecheap wherever trade is managed):

| Type | Name | Value | TTL |
|---|---|---|---|
| **A** | `billing` | `<same IP as trade.wifiwalanet.in>` | Auto |

**Find your VPS IP:**
```bash
# On VPS
curl -s ifconfig.me
```

**Verify DNS (from your local machine):**
```bash
# Run dns-check.sh locally
bash deploy/dns-check.sh
```

Expected output:
```
✓ trade.wifiwalanet.in → 123.45.67.89
✓ billdesk.wifiwalanet.in → 123.45.67.89
🎉 DNS is correctly pointed!
```

⏱️ DNS propagation: usually 5-30 minutes. You can proceed to Step 2 meanwhile.

---

### 📦 Step 2: Push code to git

The deploy script clones from git, so push your code first:

```bash
# On your local machine, in project root
cd /home/z/my-project

# Initialize git if not done
git init
git add .
git commit -m "BillDesk Pro — initial commit"

# Push to GitHub (create a repo first)
git remote add origin https://github.com/YOUR_USERNAME/billdesk-pro.git
git branch -M main
git push -u origin main
```

⚠️ **CRITICAL:** Verify `.env.production` is NOT in git:
```bash
git status  # should NOT show .env.production
cat .gitignore | grep env  # should show .env*
```

---

### 🚀 Step 3: Deploy on VPS (one command)

SSH to VPS as root:
```bash
ssh root@YOUR_VPS_IP
```

Clone the repo (anywhere temporary):
```bash
cd /tmp
git clone https://github.com/YOUR_USERNAME/billdesk-pro.git
cd billdesk-pro
```

Set your repo URL and run the deploy:
```bash
export REPO_URL="https://github.com/YOUR_USERNAME/billdesk-pro.git"
bash deploy/deploy-billing.sh
```

**What this script does (in order):**
1. ✅ Verifies `trade.wifiwalanet.in` is healthy (won't proceed if it's down)
2. 📥 Clones code to `/opt/billdesk`
3. 📝 Creates `.env.production` with random NEXTAUTH_SECRET
4. 📦 Installs dependencies
5. 🔧 Generates Prisma client + pushes DB schema
6. 🌱 Seeds database (first time only)
7. 🔨 Builds Next.js (standalone)
8. 🔄 Starts PM2 process `billdesk-pro` on port **3001**
9. 🌐 Adds Caddy block for `billdesk.wifiwalanet.in` (validates before reload — auto-rollback on error)
10. ❤️ Health check on both `trade` and `billing` sites

**Expected final output:**
```
╔══════════════════════════════════════════════╗
║       🎉 BILLING APP DEPLOYED!              ║
╚══════════════════════════════════════════════╝

Sites on this VPS:
  📊 trade.wifiwalanet.in   → port 3000 (unchanged)
  🧾 billdesk.wifiwalanet.in → port 3001 (new)

🌐 Visit: https://billdesk.wifiwalanet.in

Default logins (CHANGE IMMEDIATELY):
  👑 Super Admin: admin@billdesk.pro / admin123
  🏪 Tenant:      rahul@sharma-electronics.in / rahul123
```

---

### 🔐 Step 4: Change default passwords (CRITICAL!)

```bash
cd /opt/billdesk

# Change super admin password
npx tsx -e "
  import { db } from './src/lib/db'
  import bcrypt from 'bcryptjs'
  const hash = await bcrypt.hash('YOUR_NEW_STRONG_PASSWORD', 10)
  await db.user.update({ where: { email: 'admin@billdesk.pro' }, data: { passwordHash: hash } })
  console.log('✓ Super admin password updated')
"
```

Repeat for all 6 default accounts OR delete them and let real tenants sign up.

---

### 📅 Step 5: Set up daily backup

```bash
# As root
crontab -e

# Add this line (daily 3 AM backup):
0 3 * * * /opt/billdesk/deploy/backup.sh >> /opt/billdesk/logs/backup.log 2>&1
```

---

## 🔄 Daily Operations

### Update billing app (zero downtime, trade untouched)
```bash
cd /opt/billdesk
bash deploy/update-billing.sh
```

### View logs
```bash
# Billing app logs
pm2 logs billdesk-pro

# Both apps side-by-side
pm2 monit

# Caddy logs (both sites)
sudo journalctl -u caddy -f

# Just billing access logs
sudo tail -f /var/log/caddy/billing-access.log
```

### Restart billing app
```bash
pm2 restart billdesk-pro
```

### Manual backup
```bash
bash /opt/billdesk/deploy/backup.sh
```

---

## 🚨 If Something Breaks

### Trade site goes down

**IMMEDIATE ROLLBACK:**
```bash
# Restore Caddyfile from backup
sudo cp /etc/caddy/Caddyfile.backup-before-billing-* /etc/caddy/Caddyfile
sudo systemctl reload caddy

# Verify
curl -I https://trade.wifiwalanet.in
```

Trade site should be back. Billing site will be down but trade is safe.

### Billing site shows 502

Caddy is up but app on port 3001 isn't responding.
```bash
pm2 status                    # is billdesk-pro running?
pm2 logs billdesk-pro --err   # check error
pm2 restart billdesk-pro      # restart
```

### SSL not working on billing

```bash
# Check Caddy status
sudo systemctl status caddy

# Check Caddy logs (SSL provisioning happens here)
sudo journalctl -u caddy -n 50

# Force reload
sudo systemctl reload caddy

# Verify cert
curl -vI https://billdesk.wifiwalanet.in 2>&1 | grep -i ssl
```

Common cause: DNS not propagated. Check with `dig billdesk.wifiwalanet.in`.

### Both apps need port 3000

If trade app already uses 3000 and you accidentally set billing to 3000:
```bash
# Stop billing
pm2 stop billdesk-pro

# Edit ecosystem to use 3001
nano /opt/billdesk/deploy/ecosystem.config.cjs
# Change PORT: 3000 → PORT: 3001

# Also edit .env.production
nano /opt/billdesk/.env.production
# Change PORT=3000 → PORT=3001

# Rebuild & restart
cd /opt/billdesk
bash deploy/update-billing.sh
```

---

## 📊 Monitoring Both Apps

### PM2 dashboard
```bash
pm2 monit
```
Shows live CPU/memory for both `trade-pro` (or whatever it's named) and `billdesk-pro`.

### Disk usage
```bash
du -sh /opt/billdesk/* 2>/dev/null | sort -h
# Look for:
#   /opt/billdesk/db/        — SQLite DB
#   /opt/billdesk/.next/     — build output
#   /opt/billdesk/node_modules/  — deps
#   /opt/billdesk/backups/   — daily DB backups
```

### Memory usage
```bash
free -h
pm2 list  # shows memory per process
```

---

## 🔒 Security Checklist

- [ ] **Default passwords changed** for all 6 seeded accounts
- [ ] `.env.production` permissions: `chmod 600 /opt/billdesk/.env.production`
- [ ] Firewall allows 22, 80, 443 only: `sudo ufw status`
- [ ] fail2ban installed: `sudo apt install fail2ban`
- [ ] Daily backups running (check: `ls -la /opt/billdesk/backups/`)
- [ ] SSL cert valid for billdesk.wifiwalanet.in
- [ ] trade.wifiwalanet.in still works after deploy

---

## 📁 File Layout on VPS

```
/etc/caddy/
├── Caddyfile                          # ← both sites configured here
├── Caddyfile.backup-before-billing-*  # ← safety backup
└── backups/
    └── Caddyfile.before-billing-add.* # ← another backup

/opt/billdesk/                         # ← billing app (new)
├── .next/standalone/server.js         # ← PM2 runs this
├── db/production.db                   # ← billing's own DB
├── logs/
├── backups/
├── .env.production                    # ← secrets
└── deploy/                            # ← scripts

/var/log/caddy/
├── billing-access.log                 # ← billing access logs
└── (trade log file)                   # ← trade access logs

# Trade app stays wherever it was (you didn't move it)
```

---

## 🆘 Quick Reference

| Action | Command |
|---|---|
| **Deploy billing (first time)** | `bash deploy/deploy-billing.sh` |
| **Update billing code** | `cd /opt/billdesk && bash deploy/update-billing.sh` |
| **Restart billing app** | `pm2 restart billdesk-pro` |
| **Restart trade app** | `pm2 restart <trade-process-name>` |
| **Reload Caddy (no downtime)** | `sudo systemctl reload caddy` |
| **View billing logs** | `pm2 logs billdesk-pro` |
| **View Caddy logs** | `sudo journalctl -u caddy -f` |
| **Rollback Caddy config** | `sudo cp /etc/caddy/Caddyfile.backup-* /etc/caddy/Caddyfile && sudo systemctl reload caddy` |
| **Check both apps** | `pm2 status` |
| **Check disk space** | `df -h` |
| **Check memory** | `free -h && pm2 monit` |
| **DNS check** (local) | `bash deploy/dns-check.sh` |
| **Manual backup** | `bash /opt/billdesk/deploy/backup.sh` |

---

## 🎯 Final Verification

After deploy, all 4 of these should work:

```bash
# 1. Trade site still works (untouched)
curl -I https://trade.wifiwalanet.in
# Expected: HTTP/2 200 (or 301)

# 2. Billing site is live
curl -I https://billdesk.wifiwalanet.in
# Expected: HTTP/2 200

# 3. Billing app responds on localhost:3001
curl http://localhost:3001/api/auth/csrf
# Expected: {"csrfToken":"..."}

# 4. Both PM2 processes are online
pm2 status
# Expected: billdesk-pro ✓ online, <trade-app> ✓ online
```

If all 4 pass — you're golden! 🎉

---

## ❓ FAQ

**Q: Will updating billing affect trade?**
A: No. Separate PM2 process, separate port, separate DB file. Only shared thing is Caddy, and we use `systemctl reload` (graceful) instead of `restart`.

**Q: Can I run billing on a different port (not 3001)?**
A: Yes. Edit `deploy/ecosystem.config.cjs` (change `PORT: 3001`) and `deploy/Caddyfile.billing` (change `localhost:3001`), then re-run deploy.

**Q: How do I add more sites later (e.g. reports.wifiwalanet.in)?**
A: Copy this same pattern — different port (3002), different app dir, different Caddy block. The `caddy-add-block.sh` script can be adapted.

**Q: Can I migrate billing from SQLite to Postgres later?**
A: Yes, see the main `README.md`. Postgres can run alongside both Node apps.

**Q: What if trade app uses PM2 process name "billdesk-pro" too?**
A: Very unlikely, but if so — change `name: "billdesk-pro"` in `ecosystem.config.cjs` to `"billdesk-billing"` or similar.

---

**That's it!** Billing app runs at `https://billdesk.wifiwalanet.in` while trade stays untouched. 🚀
