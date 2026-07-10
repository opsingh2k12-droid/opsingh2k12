import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Seeding database...')

  await db.payment.deleteMany()
  await db.invoiceItem.deleteMany()
  await db.purchaseItem.deleteMany()
  await db.invoice.deleteMany()
  await db.purchase.deleteMany()
  await db.item.deleteMany()
  await db.party.deleteMany()
  await db.platformPayment.deleteMany()
  await db.subscription.deleteMany()
  await db.plan.deleteMany()
  await db.activityLog.deleteMany()
  await db.user.deleteMany()
  await db.tenant.deleteMany()

  // ============ PLANS ============
  const freePlan = await db.plan.create({
    data: {
      name: 'Free',
      priceMonthly: 0, priceYearly: 0,
      invoiceLimit: 50, userLimit: 1,
      features: JSON.stringify(['Basic invoicing', '50 invoices/month', '1 user']),
    },
  })
  const starterPlan = await db.plan.create({
    data: {
      name: 'Starter',
      priceMonthly: 499, priceYearly: 4990,
      invoiceLimit: 500, userLimit: 2,
      features: JSON.stringify(['500 invoices/month', '2 users', 'Inventory', 'Reports']),
    },
  })
  const proPlan = await db.plan.create({
    data: {
      name: 'Pro',
      priceMonthly: 999, priceYearly: 9990,
      invoiceLimit: 0, userLimit: 5,
      features: JSON.stringify(['Unlimited invoices', '5 users', 'e-Invoice', 'WhatsApp', 'Multi-branch']),
    },
  })
  const enterprisePlan = await db.plan.create({
    data: {
      name: 'Enterprise',
      priceMonthly: 2499, priceYearly: 24990,
      invoiceLimit: 0, userLimit: 50,
      features: JSON.stringify(['Unlimited everything', 'API access', 'Custom branding', 'Priority support']),
    },
  })

  // ============ SUPER ADMIN ============
  const superAdminHash = await bcrypt.hash('admin123', 10)
  const superAdmin = await db.user.create({
    data: { email: 'admin@wifiwalanet.in', name: 'Platform Admin', passwordHash: superAdminHash, role: 'super_admin' },
  })
  console.log('✓ Super admin:', superAdmin.email)

  // ============ TENANT 1: Sharma Electronics (Pro, Active) ============
  const t1Hash = await bcrypt.hash('rahul123', 10)
  const tenant1 = await db.tenant.create({
    data: {
      businessName: 'Sharma Electronics', legalName: 'Sharma Electronics Pvt Ltd',
      gstin: '27ABCDE1234F1Z5', pan: 'ABCDE1234F',
      address: 'Shop No. 14, Hill Road, Bandra West', city: 'Mumbai', state: 'Maharashtra', stateCode: '27',
      phone: '+91 98200 12345', email: 'rahul@sharma-electronics.in',
      status: 'active',
    },
  })
  await db.user.create({
    data: { email: 'rahul@sharma-electronics.in', name: 'Rahul Sharma', passwordHash: t1Hash, role: 'owner', tenantId: tenant1.id },
  })
  const t1Sub = await db.subscription.create({
    data: { tenantId: tenant1.id, planId: proPlan.id, status: 'active', billingCycle: 'monthly', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
  })
  await db.platformPayment.create({
    data: { subscriptionId: t1Sub.id, amount: 999, gateway: 'razorpay', gatewayRef: 'rzp_pay_001', status: 'paid' },
  })

  const items1 = await Promise.all([
    db.item.create({ data: { tenantId: tenant1.id, name: 'Mi Power Bank 20000mAh', hsn: '8507', category: 'Electronics', unit: 'pcs', salePrice: 1499, purchasePrice: 1100, gstRate: 18, stockQty: 3, reorderLevel: 15, sku: 'MI-PB20K' } }),
    db.item.create({ data: { tenantId: tenant1.id, name: 'USB-C Cable 1m (Braided)', hsn: '8544', category: 'Cables', unit: 'pcs', salePrice: 299, purchasePrice: 150, gstRate: 18, stockQty: 8, reorderLevel: 50, sku: 'USBC-1M' } }),
    db.item.create({ data: { tenantId: tenant1.id, name: 'LED Bulb 12W (Pack of 4)', hsn: '8539', category: 'Appliances', unit: 'pack', salePrice: 449, purchasePrice: 280, gstRate: 12, stockQty: 0, reorderLevel: 10, sku: 'LED-12W-4P' } }),
    db.item.create({ data: { tenantId: tenant1.id, name: 'HDMI Cable 2m (Premium)', hsn: '8544', category: 'Cables', unit: 'pcs', salePrice: 549, purchasePrice: 320, gstRate: 18, stockQty: 5, reorderLevel: 20, sku: 'HDMI-2M' } }),
    db.item.create({ data: { tenantId: tenant1.id, name: 'Bluetooth Earbuds Pro', hsn: '8518', category: 'Electronics', unit: 'pcs', salePrice: 2499, purchasePrice: 1800, gstRate: 18, stockQty: 2, reorderLevel: 10, sku: 'BT-EAR-PRO' } }),
    db.item.create({ data: { tenantId: tenant1.id, name: 'Smart Watch Series 7', hsn: '8517', category: 'Electronics', unit: 'pcs', salePrice: 4999, purchasePrice: 3800, gstRate: 18, stockQty: 42, reorderLevel: 10, sku: 'SW-S7' } }),
    db.item.create({ data: { tenantId: tenant1.id, name: 'Multi-Port USB Charger 65W', hsn: '8504', category: 'Accessories', unit: 'pcs', salePrice: 1299, purchasePrice: 950, gstRate: 18, stockQty: 28, reorderLevel: 10, sku: 'CHG-65W' } }),
    db.item.create({ data: { tenantId: tenant1.id, name: 'Phone Holder (Car Mount)', hsn: '8479', category: 'Accessories', unit: 'pcs', salePrice: 399, purchasePrice: 220, gstRate: 18, stockQty: 65, reorderLevel: 20, sku: 'PH-CM' } }),
  ])

  const parties1 = await Promise.all([
    db.party.create({ data: { tenantId: tenant1.id, name: 'Verma Traders', type: 'customer', gstin: '27AAACV1234L1Z5', phone: '+91 98765 43210', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', email: 'verma@traders.in', address: '55 Marine Drive, Mumbai', openingBalance: 0 } }),
    db.party.create({ data: { tenantId: tenant1.id, name: 'Patel Electronics', type: 'customer', gstin: '27AABCP9876R1Z2', phone: '+91 98200 11111', city: 'Pune', state: 'Maharashtra', stateCode: '27', email: 'patel@electronics.in', openingBalance: 32800 } }),
    db.party.create({ data: { tenantId: tenant1.id, name: 'Mumbai Trade House', type: 'customer', gstin: '27AAACM4567P1Z7', phone: '+91 98200 22222', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', email: 'mth@trade.in', openingBalance: 84600 } }),
    db.party.create({ data: { tenantId: tenant1.id, name: 'Suresh Kumar', type: 'customer', phone: '+91 99876 54321', city: 'Mumbai', openingBalance: 0 } }),
    db.party.create({ data: { tenantId: tenant1.id, name: 'Distributor India Pvt Ltd', type: 'supplier', gstin: '27AAACD6789Q1Z3', phone: '+91 98330 55555', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', openingBalance: -120000 } }),
    db.party.create({ data: { tenantId: tenant1.id, name: 'MobileSource Wholesale', type: 'supplier', gstin: '27AAACM9999R1Z8', phone: '+91 98330 66666', city: 'Delhi', state: 'Delhi', stateCode: '07', openingBalance: -48500 } }),
  ])

  const today = new Date()
  const inv1 = await db.invoice.create({
    data: {
      tenantId: tenant1.id, invoiceNumber: 'INV-2025-0186', partyId: parties1[0].id,
      invoiceDate: today, supplyType: 'intra', status: 'paid',
      subtotal: 24119, taxableAmount: 24119, cgst: 2165.5, sgst: 2165.5, totalGst: 4331,
      grandTotal: 28450, paidAmount: 28450, balanceDue: 0,
      notes: 'Thank you for your business.', terms: 'Payment due within 15 days.',
      items: { create: [
        { name: 'Mi Power Bank 20000mAh', hsn: '8507', qty: 5, rate: 1499, gstRate: 18, amount: 7495, taxableAmount: 7495, cgst: 674.55, sgst: 674.55 },
        { name: 'Smart Watch Series 7', hsn: '8517', qty: 3, rate: 4999, gstRate: 18, amount: 14997, taxableAmount: 14997, cgst: 1349.73, sgst: 1349.73 },
        { name: 'USB-C Cable 1m (Braided)', hsn: '8544', qty: 6, rate: 271, gstRate: 18, amount: 1627, taxableAmount: 1627, cgst: 146.43, sgst: 146.43 },
      ]},
    },
  })
  await db.payment.create({ data: { tenantId: tenant1.id, invoiceId: inv1.id, partyId: parties1[0].id, amount: 28450, method: 'upi', direction: 'in' } })

  const inv2 = await db.invoice.create({
    data: {
      tenantId: tenant1.id, invoiceNumber: 'INV-2025-0184', partyId: parties1[1].id,
      invoiceDate: new Date(today.getTime() - 86400000), supplyType: 'intra', status: 'partial',
      subtotal: 44745, taxableAmount: 44745, cgst: 4027.05, sgst: 4027.05, totalGst: 8054.1,
      grandTotal: 52799, paidAmount: 20000, balanceDue: 32799,
      items: { create: [
        { name: 'Bluetooth Earbuds Pro', hsn: '8518', qty: 8, rate: 2499, gstRate: 18, amount: 19992, taxableAmount: 19992, cgst: 1799.28, sgst: 1799.28 },
        { name: 'HDMI Cable 2m (Premium)', hsn: '8544', qty: 15, rate: 1650, gstRate: 18, amount: 24753, taxableAmount: 24753, cgst: 2227.77, sgst: 2227.77 },
      ]},
    },
  })
  await db.payment.create({ data: { tenantId: tenant1.id, invoiceId: inv2.id, partyId: parties1[1].id, amount: 20000, method: 'bank', direction: 'in' } })

  await db.invoice.create({
    data: {
      tenantId: tenant1.id, invoiceNumber: 'INV-2025-0182', partyId: parties1[2].id,
      invoiceDate: new Date(today.getTime() - 2 * 86400000), supplyType: 'intra', status: 'unpaid',
      subtotal: 71695, taxableAmount: 71695, cgst: 6452.55, sgst: 6452.55, totalGst: 12905.1,
      grandTotal: 84600, paidAmount: 0, balanceDue: 84600,
      items: { create: [
        { name: 'Smart Watch Series 7', hsn: '8517', qty: 12, rate: 4999, gstRate: 18, amount: 59988, taxableAmount: 59988, cgst: 5398.92, sgst: 5398.92 },
        { name: 'Multi-Port USB Charger 65W', hsn: '8504', qty: 9, rate: 1300, gstRate: 18, amount: 11700, taxableAmount: 11700, cgst: 1053, sgst: 1053 },
      ]},
    },
  })

  await db.purchase.create({
    data: {
      tenantId: tenant1.id, billNumber: 'PUR-2025-0042', partyId: parties1[4].id,
      billDate: new Date(today.getTime() - 86400000), status: 'unpaid',
      subtotal: 68644, taxableAmount: 68644, cgst: 6177.96, sgst: 6177.96, totalGst: 12355.92,
      grandTotal: 81000, paidAmount: 0, balanceDue: 81000,
      items: { create: [
        { name: 'Smart Watch Series 7', hsn: '8517', qty: 15, rate: 3800, gstRate: 18, amount: 57000 },
        { name: 'Bluetooth Earbuds Pro', hsn: '8518', qty: 12, rate: 970, gstRate: 18, amount: 11644 },
      ]},
    },
  })

  // ============ TENANT 2: Verma Traders (Starter) ============
  const t2Hash = await bcrypt.hash('verma123', 10)
  const tenant2 = await db.tenant.create({
    data: {
      businessName: 'Verma Traders', legalName: 'Verma Traders LLP',
      gstin: '27AAACV1234L1Z5', pan: 'AAACV1234L',
      address: '55 Marine Drive, Nariman Point', city: 'Mumbai', state: 'Maharashtra', stateCode: '27',
      phone: '+91 98765 43210', email: 'verma@traders.in', status: 'active',
    },
  })
  await db.user.create({
    data: { email: 'verma@traders.in', name: 'Anil Verma', passwordHash: t2Hash, role: 'owner', tenantId: tenant2.id },
  })
  const t2Sub = await db.subscription.create({
    data: { tenantId: tenant2.id, planId: starterPlan.id, status: 'active', billingCycle: 'monthly', currentPeriodEnd: new Date(Date.now() + 22 * 86400000) },
  })
  await db.platformPayment.create({ data: { subscriptionId: t2Sub.id, amount: 499, gateway: 'razorpay', gatewayRef: 'rzp_pay_002', status: 'paid' } })

  // ============ TENANT 3: Gupta General Store (Trial) ============
  const t3Hash = await bcrypt.hash('gupta123', 10)
  const tenant3 = await db.tenant.create({
    data: {
      businessName: 'Gupta General Store', gstin: '27AAACG5678K1Z9',
      address: '12 MG Road, Andheri East', city: 'Mumbai', state: 'Maharashtra', stateCode: '27',
      phone: '+91 99300 11111', email: 'gupta@store.in', status: 'trial',
      trialEndsAt: new Date(Date.now() + 4 * 86400000),
    },
  })
  await db.user.create({
    data: { email: 'gupta@store.in', name: 'Suresh Gupta', passwordHash: t3Hash, role: 'owner', tenantId: tenant3.id },
  })
  await db.subscription.create({
    data: { tenantId: tenant3.id, planId: freePlan.id, status: 'trial', billingCycle: 'monthly', currentPeriodEnd: new Date(Date.now() + 4 * 86400000) },
  })

  // ============ TENANT 4: Patel Wholesale (Past Due) ============
  const t4Hash = await bcrypt.hash('patel123', 10)
  const tenant4 = await db.tenant.create({
    data: {
      businessName: 'Patel Wholesale', legalName: 'Patel Wholesale Corp',
      gstin: '27AABCP9876R1Z2', pan: 'AABCP9876R',
      address: '88 Wholesale Market, Bhiwandi', city: 'Thane', state: 'Maharashtra', stateCode: '27',
      phone: '+91 98200 33333', email: 'patel@wholesale.in', status: 'active',
    },
  })
  await db.user.create({
    data: { email: 'patel@wholesale.in', name: 'Ketan Patel', passwordHash: t4Hash, role: 'owner', tenantId: tenant4.id },
  })
  const t4Sub = await db.subscription.create({
    data: { tenantId: tenant4.id, planId: proPlan.id, status: 'past_due', billingCycle: 'monthly', currentPeriodEnd: new Date(Date.now() - 3 * 86400000) },
  })
  await db.platformPayment.create({ data: { subscriptionId: t4Sub.id, amount: 999, gateway: 'razorpay', gatewayRef: 'rzp_pay_003_fail', status: 'failed' } })

  // ============ TENANT 5: TechHub Bangalore (Enterprise) ============
  const t5Hash = await bcrypt.hash('tech123', 10)
  const tenant5 = await db.tenant.create({
    data: {
      businessName: 'TechHub Bangalore', legalName: 'TechHub India Pvt Ltd',
      gstin: '29AAACT1234M1Z1', pan: 'AAACT1234M',
      address: 'Outer Ring Road, Bellandur', city: 'Bengaluru', state: 'Karnataka', stateCode: '29',
      phone: '+91 80400 12345', email: 'admin@techhub.in', status: 'active',
    },
  })
  await db.user.create({
    data: { email: 'admin@techhub.in', name: 'Priya Nair', passwordHash: t5Hash, role: 'owner', tenantId: tenant5.id },
  })
  const t5Sub = await db.subscription.create({
    data: { tenantId: tenant5.id, planId: enterprisePlan.id, status: 'active', billingCycle: 'yearly', currentPeriodEnd: new Date(Date.now() + 280 * 86400000) },
  })
  await db.platformPayment.create({ data: { subscriptionId: t5Sub.id, amount: 24990, gateway: 'razorpay', gatewayRef: 'rzp_pay_004', status: 'paid' } })

  // ============ ACTIVITY LOGS ============
  await db.activityLog.createMany({
    data: [
      { tenantId: tenant1.id, action: 'tenant.signup', detail: 'Trial started', createdAt: new Date(Date.now() - 30 * 86400000) },
      { tenantId: tenant1.id, action: 'subscription.upgraded', detail: 'Free -> Pro', createdAt: new Date(Date.now() - 25 * 86400000) },
      { tenantId: tenant1.id, action: 'invoice.created', detail: 'INV-2025-0186', createdAt: today },
      { tenantId: tenant2.id, action: 'tenant.signup', detail: 'Trial started', createdAt: new Date(Date.now() - 22 * 86400000) },
      { tenantId: tenant3.id, action: 'tenant.signup', detail: 'Trial started', createdAt: new Date(Date.now() - 10 * 86400000) },
      { tenantId: tenant4.id, action: 'payment.failed', detail: 'Auto-renewal failed', createdAt: new Date(Date.now() - 3 * 86400000) },
      { tenantId: tenant5.id, action: 'subscription.upgraded', detail: 'Pro -> Enterprise (yearly)', createdAt: new Date(Date.now() - 80 * 86400000) },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔑 Login credentials:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Super Admin:   admin@wifiwalanet.in / admin123')
  console.log('Tenant (Pro):  rahul@sharma-electronics.in / rahul123')
  console.log('Tenant (Starter): verma@traders.in / verma123')
  console.log('Tenant (Trial): gupta@store.in / gupta123')
  console.log('Tenant (Past Due): patel@wholesale.in / patel123')
  console.log('Tenant (Enterprise): admin@techhub.in / tech123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
