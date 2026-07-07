import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const tenantId = ctx.tenantId

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [invoicesToday, invoicesMonth, items, parties, lowStockItems, recentInvoices, payments, purchases] = await Promise.all([
    db.invoice.aggregate({ where: { tenantId, invoiceDate: { gte: today } }, _sum: { grandTotal: true } }),
    db.invoice.aggregate({ where: { tenantId, invoiceDate: { gte: monthStart } }, _sum: { grandTotal: true }, _count: true }),
    db.item.count({ where: { tenantId } }),
    db.party.count({ where: { tenantId } }),
    db.item.findMany({ where: { tenantId, stockQty: { lte: db.item.fields.reorderLevel } }, take: 5, orderBy: { stockQty: "asc" } }),
    db.invoice.findMany({ where: { tenantId }, include: { party: true, items: true }, orderBy: { invoiceDate: "desc" }, take: 5 }),
    db.payment.aggregate({ where: { tenantId, direction: "in", paidAt: { gte: today } }, _sum: { amount: true } }),
    db.purchase.aggregate({ where: { tenantId, billDate: { gte: monthStart } }, _sum: { grandTotal: true } }),
  ])

  const pendingDues = await db.invoice.aggregate({
    where: { tenantId, status: { in: ["unpaid", "partial", "overdue"] } },
    _sum: { balanceDue: true },
  })

  return NextResponse.json({
    todaySales: invoicesToday._sum.grandTotal || 0,
    todayPayments: payments._sum.amount || 0,
    monthSales: invoicesMonth._sum.grandTotal || 0,
    monthInvoices: invoicesMonth._count,
    monthPurchases: purchases._sum.grandTotal || 0,
    pendingDues: pendingDues._sum.balanceDue || 0,
    totalItems: items,
    totalParties: parties,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    recentInvoices,
  })
}
