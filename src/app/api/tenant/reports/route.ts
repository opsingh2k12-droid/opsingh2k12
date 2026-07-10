import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

function getFiscalYearRange(startMonth: number, yearOffset: number = 0): { start: Date; end: Date; label: string } {
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // 1-12
  const currentYear = now.getFullYear()

  // Determine FY start year
  // If current month >= startMonth → FY started this year
  // If current month < startMonth → FY started last year
  let fyStartYear: number
  if (currentMonth >= startMonth) {
    fyStartYear = currentYear + yearOffset
  } else {
    fyStartYear = currentYear - 1 + yearOffset
  }

  const start = new Date(fyStartYear, startMonth - 1, 1) // month is 0-indexed
  const end = new Date(fyStartYear + 1, startMonth - 1, 1) // next FY start
  const label = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`

  return { start, end, label }
}

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const tenantId = ctx.tenantId

  // Get tenant's fiscal year start month
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { fiscalYearStartMonth: true } })
  const fyStartMonth = tenant?.fiscalYearStartMonth || 4 // Default April

  // Get yearOffset from query (0 = current FY, -1 = last FY, etc.)
  const { searchParams } = new URL(req.url)
  const yearOffset = parseInt(searchParams.get("yearOffset") || "0")

  // Calculate FY range
  const fy = getFiscalYearRange(fyStartMonth, yearOffset)

  // Also get current month for monthly stats
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [salesAgg, purchaseAgg, salesByDay, topItems, gstByRate, invoices, fyInvoices] = await Promise.all([
    // Current month stats (for dashboard cards)
    db.invoice.aggregate({ where: { tenantId, type: "invoice", invoiceDate: { gte: monthStart } }, _sum: { grandTotal: true, totalGst: true, taxableAmount: true }, _count: true }),
    db.purchase.aggregate({ where: { tenantId, billDate: { gte: monthStart } }, _sum: { grandTotal: true, totalGst: true } }),
    // FY-wise daily sales
    db.$queryRaw`SELECT DATE(invoiceDate) as d, SUM(grandTotal) as total FROM Invoice WHERE tenantId = ${tenantId} AND type = 'invoice' AND invoiceDate >= ${fy.start} AND invoiceDate < ${fy.end} GROUP BY DATE(invoiceDate) ORDER BY d ASC`,
    // FY-wise top items
    db.invoiceItem.groupBy({ by: ["name", "hsn"], where: { invoice: { tenantId, type: "invoice", invoiceDate: { gte: fy.start, lt: fy.end } } }, _sum: { qty: true, amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 5 }),
    // FY-wise GST by rate
    db.invoiceItem.groupBy({ by: ["gstRate"], where: { invoice: { tenantId, type: "invoice", invoiceDate: { gte: fy.start, lt: fy.end } } }, _sum: { taxableAmount: true, cgst: true, sgst: true, igst: true } }),
    // All invoices (for status breakdown)
    db.invoice.findMany({ where: { tenantId, type: "invoice" }, select: { grandTotal: true, totalGst: true, taxableAmount: true, status: true } }),
    // FY-specific totals
    db.invoice.aggregate({ where: { tenantId, type: "invoice", invoiceDate: { gte: fy.start, lt: fy.end } }, _sum: { grandTotal: true, totalGst: true, taxableAmount: true }, _count: true }),
  ])

  // FY purchases for ITC
  const fyPurchases = await db.purchase.aggregate({ where: { tenantId, billDate: { gte: fy.start, lt: fy.end } }, _sum: { grandTotal: true, totalGst: true } })

  const itcAvailable = fyPurchases._sum.totalGst || 0
  const outputGst = fyInvoices._sum.totalGst || 0
  const netGst = outputGst - itcAvailable

  // Available FY options (current -2 to current +1, max 4 options)
  const fyOptions = []
  for (let i = -2; i <= 1; i++) {
    const f = getFiscalYearRange(fyStartMonth, i)
    fyOptions.push({ offset: i, label: f.label, isCurrent: i === 0 })
  }

  return NextResponse.json({
    // Current month stats (dashboard cards)
    monthSales: salesAgg._sum.grandTotal || 0,
    monthTaxable: salesAgg._sum.taxableAmount || 0,
    monthGst: salesAgg._sum.totalGst || 0,
    monthInvoiceCount: salesAgg._count,
    monthPurchases: purchaseAgg._sum.grandTotal || 0,
    // FY stats
    fyLabel: fy.label,
    fyStart: fy.start,
    fyEnd: fy.end,
    fyOptions,
    totalSales: fyInvoices._sum.grandTotal || 0,
    totalTaxable: fyInvoices._sum.taxableAmount || 0,
    totalGst: outputGst,
    invoiceCount: fyInvoices._count,
    totalPurchases: fyPurchases._sum.grandTotal || 0,
    itcAvailable,
    netGst,
    salesByDay,
    topItems,
    gstByRate: gstByRate.map((g: any) => ({
      rate: g.gstRate,
      taxable: g._sum.taxableAmount || 0,
      gst: (g._sum.cgst || 0) + (g._sum.sgst || 0) + (g._sum.igst || 0),
    })),
  })
}
