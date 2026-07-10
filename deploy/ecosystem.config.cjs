// ============================================
// PM2 Ecosystem — BillDesk Pro (billing.wifiwalanet.in)
// ============================================
// Runs ALONGSIDE trade.wifiwalanet.in on same VPS.
// Uses port 3001 (since 3000 is taken by trade app).
//
// Start:    pm2 start deploy/ecosystem.config.cjs --env production
// Restart:  pm2 restart billdesk-pro
// Stop:     pm2 stop billdesk-pro
// Logs:     pm2 logs billdesk-pro
// Status:   pm2 status

module.exports = {
  apps: [
    {
      name: "billdesk-pro",
      script: ".next/standalone/server.js",
      cwd: "/opt/billdesk",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "500M",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001, // ← Different from trade app (3000)
        HOSTNAME: "0.0.0.0",
      },
      env_file: ".env.production",
      error_file: "/opt/billdesk/logs/err.log",
      out_file: "/opt/billdesk/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}
