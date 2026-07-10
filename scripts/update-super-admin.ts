/**
 * ============================================
 * update-super-admin.ts
 * ============================================
 * Updates super admin email + password.
 * Uses admin@wifiwalanet.in / admin123 by default.
 *
 * Usage:
 *   cd /opt/billdesk
 *   set -a; source .env.production; set +a
 *   npx tsx scripts/update-super-admin.ts
 *
 * Custom values:
 *   NEW_EMAIL=ops@wifiwalanet.in NEW_PASSWORD=secret npx tsx scripts/update-super-admin.ts
 * ============================================
 */

import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

const NEW_EMAIL = process.env.NEW_EMAIL || 'admin@wifiwalanet.in'
const NEW_PASSWORD = process.env.NEW_PASSWORD || 'admin123'

async function main() {
  console.log('🔧 Updating super admin credentials...')
  console.log(`   New email: ${NEW_EMAIL}`)
  console.log(`   New password: ${NEW_PASSWORD}`)
  console.log('')

  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10)

  // Find existing super admin
  const existing = await db.user.findFirst({ where: { role: 'super_admin' } })

  let user
  if (existing) {
    user = await db.user.update({
      where: { id: existing.id },
      data: {
        email: NEW_EMAIL,
        passwordHash,
        name: existing.name || 'Platform Admin',
      },
    })
    console.log('✓ Updated existing super admin')
  } else {
    // Try to find by email
    const byEmail = await db.user.findUnique({ where: { email: NEW_EMAIL } })
    if (byEmail) {
      user = await db.user.update({
        where: { id: byEmail.id },
        data: {
          passwordHash,
          role: 'super_admin',
          name: byEmail.name || 'Platform Admin',
        },
      })
      console.log('✓ Promoted existing user to super admin')
    } else {
      user = await db.user.create({
        data: {
          email: NEW_EMAIL,
          name: 'Platform Admin',
          passwordHash,
          role: 'super_admin',
        },
      })
      console.log('✓ Created new super admin')
    }
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Super admin ready!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   Email:    ${user.email}`)
  console.log(`   Password: ${NEW_PASSWORD}`)
  console.log(`   Role:     ${user.role}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('⚠️  Login and change this password immediately!')
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
