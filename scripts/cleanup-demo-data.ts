/**
 * ============================================
 * cleanup-demo-data.ts
 * ============================================
 * Removes ALL demo data but keeps:
 *   - Super admin (admin@wifiwalanet.in) — so you can still login
 *   - Plans (Free, Starter, Pro, Enterprise) — needed for subscription system
 *   - Super admin's user record
 *
 * Removes:
 *   - All tenants (Sharma, Verma, Gupta, Patel, TechHub)
 *   - All demo users (rahul, verma, gupta, patel, techhub)
 *   - All items, parties, invoices, purchases, payments
 *   - All activity logs (except super admin)
 *   - All subscriptions & platform payments
 *
 * Usage:
 *   cd /opt/billdesk
 *   set -a; source .env.production; set +a
 *   npx tsx scripts/cleanup-demo-data.ts
 *
 * Options:
 *   --keep-admin    Keep super admin (default)
 *   --wipe-all      Wipe EVERYTHING including admin (you'll need to re-register)
 * ============================================
 */

import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const args = process.argv.slice(2)
  const wipeAll = args.includes('--wipe-all')
  const keepAdmin = !wipeAll

  console.log('🧹 BillDesk Pro — Demo Data Cleanup')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Mode: ${wipeAll ? 'WIPE ALL (including admin)' : 'Keep super admin + plans'}`)
  console.log('')

  // Show what will be deleted
  const counts = {
    tenants: await db.tenant.count(),
    users: await db.user.count(),
    items: await db.item.count(),
    parties: await db.party.count(),
    invoices: await db.invoice.count(),
    purchases: await db.purchase.count(),
    payments: await db.payment.count(),
    activityLogs: await db.activityLog.count(),
    subscriptions: await db.subscription.count(),
    platformPayments: await db.platformPayment.count(),
    plans: await db.plan.count(),
  }

  console.log('📊 Current data counts:')
  Object.entries(counts).forEach(([key, val]) => {
    console.log(`   ${key.padEnd(20)} ${val}`)
  })
  console.log('')

  // ============================================
  // Delete in correct order (respecting foreign keys)
  // ============================================
  console.log('🗑️  Deleting demo data...')

  // 1. Child records first
  await db.invoiceItem.deleteMany()
  console.log('   ✓ Deleted invoice items')

  await db.purchaseItem.deleteMany()
  console.log('   ✓ Deleted purchase items')

  await db.payment.deleteMany()
  console.log('   ✓ Deleted payments')

  // 2. Invoices and purchases
  await db.invoice.deleteMany()
  console.log('   ✓ Deleted invoices')

  await db.purchase.deleteMany()
  console.log('   ✓ Deleted purchases')

  // 3. Items and parties
  await db.item.deleteMany()
  console.log('   ✓ Deleted items')

  await db.party.deleteMany()
  console.log('   ✓ Deleted parties')

  // 4. Platform payments and subscriptions
  await db.platformPayment.deleteMany()
  console.log('   ✓ Deleted platform payments')

  await db.subscription.deleteMany()
  console.log('   ✓ Deleted subscriptions')

  // 5. Activity logs
  await db.activityLog.deleteMany()
  console.log('   ✓ Deleted activity logs')

  // 6. Tenants
  await db.tenant.deleteMany()
  console.log('   ✓ Deleted tenants')

  // 7. Users — keep super admin unless --wipe-all
  if (keepAdmin) {
    await db.user.deleteMany({
      where: { role: { not: 'super_admin' } },
    })
    console.log('   ✓ Deleted demo users (kept super admin)')

    const adminCount = await db.user.count({ where: { role: 'super_admin' } })
    console.log(`   ✓ Kept ${adminCount} super admin user(s)`)
  } else {
    await db.user.deleteMany()
    console.log('   ✓ Deleted ALL users (including super admin)')
  }

  // 8. Plans — keep them (needed for subscription system)
  // Unless wipe-all, in which case delete
  if (wipeAll) {
    await db.plan.deleteMany()
    console.log('   ✓ Deleted plans')
  } else {
    const planCount = await db.plan.count()
    console.log(`   ✓ Kept ${planCount} plans (needed for subscription system)`)
  }

  // ============================================
  // Optional: Reset super admin password if --wipe-all
  // ============================================
  if (wipeAll) {
    console.log('')
    console.log('📝 Creating fresh super admin...')
    const passwordHash = await bcrypt.hash('admin123', 10)
    await db.user.create({
      data: {
        email: 'admin@wifiwalanet.in',
        name: 'Platform Admin',
        passwordHash,
        role: 'super_admin',
      },
    })
    console.log('   ✓ Created super admin: admin@wifiwalanet.in / admin123')
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY after first login!')
  }

  // ============================================
  // Final summary
  // ============================================
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Cleanup complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  const finalCounts = {
    tenants: await db.tenant.count(),
    users: await db.user.count(),
    items: await db.item.count(),
    parties: await db.party.count(),
    invoices: await db.invoice.count(),
    plans: await db.plan.count(),
  }

  console.log('📊 Final data counts:')
  Object.entries(finalCounts).forEach(([key, val]) => {
    console.log(`   ${key.padEnd(20)} ${val}`)
  })

  console.log('')
  if (keepAdmin) {
    console.log('🔐 You can still login as:')
    console.log('   👑 admin@wifiwalanet.in / admin123 (or your custom password)')
    console.log('')
    console.log('🆕 New tenants will sign up via the registration form.')
  } else {
    console.log('🔐 Fresh super admin created:')
    console.log('   👑 admin@wifiwalanet.in / admin123')
    console.log('   ⚠️  Change password immediately!')
  }
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
