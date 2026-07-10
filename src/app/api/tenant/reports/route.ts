import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const tenantId = ctx.tenantId

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const [salesAgg, purchaseAgg, salesByDay, topItems, gstByRate, invoices] = await Promise.all([
    db.invoice.aggregate({ where: { tenantId, invoiceDate: { gte: monthStart } }, _sum: { grandTotal: true, totalGst: true, taxableAmount: true }, _count: true }),
    db.purchase.aggregate({ where: { tenantId, billDate: { gte: monthStart } }, _sum: { grandTotal: true, totalGst: true } }),
    db.$queryRaw`SELECT DATE(invoiceDate) as d, SUM(grandTotal) as total FROM Invoice WHERE tenantId = ${tenantId} AND invoiceDate >= ${monthStart} GROUP BY DATE(invoiceDate) ORDER BY d ASC`,
    db.invoiceItem.groupBy({ by: ["name", "hsn"], where: { invoice: { tenantId } }, _sum: { qty: true, amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 5 }),
    db.invoiceItem.groupBy({ by: ["gstRate"], where: { invoice: { tenantId } }, _sum: { taxableAmount: true, cgst: true, sgst: true, igst: true } }),
    db.invoice.findMany({ where: { tenantId }, select: { grandTotal: true, totalGst: true, taxableAmount: true, status: true } }),
  ])

  const itcAvailable = purchaseAgg._sum.totalGst || 0
  const outputGst = salesAgg._sum.totalGst || 0
  const netGst = outputGst - itcAvailable

  return NextResponse.json({
    totalSales: salesAgg._sum.grandTotal || 0,
    totalTaxable: salesAgg._sum.taxableAmount || 0,
    totalGst: outputGst,
    invoiceCount: salesAgg._count,
    totalPurchases: purchaseAgg._sum.grandTotal || 0,
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
