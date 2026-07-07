import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [tenants, totalTenants, activeTenants, trialTenants, pastDueTenants, payments, paymentsThisMonth, paymentsLastMonth, plans, recentSignups, recentActivity] = await Promise.all([
    db.tenant.findMany({
      include: { users: true, subscriptions: { include: { plan: true } }, _count: { select: { invoices: true, items: true, parties: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.tenant.count(),
    db.tenant.count({ where: { status: "active" } }),
    db.tenant.count({ where: { status: "trial" } }),
    db.tenant.count({ where: { subscriptions: { some: { status: "past_due" } } } }),
    db.platformPayment.findMany({ where: { status: "paid" }, include: { subscription: { include: { tenant: true, plan: true } } }, orderBy: { paidAt: "desc" } }),
    db.platformPayment.aggregate({ where: { status: "paid", paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    db.platformPayment.aggregate({ where: { status: "paid", paidAt: { gte: lastMonthStart, lt: monthStart } }, _sum: { amount: true } }),
    db.plan.findMany({ include: { subscriptions: true } }),
    db.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { users: { take: 1 }, subscriptions: { include: { plan: true } } } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { tenant: { select: { businessName: true } } } }),
  ])

  const mrr = payments.reduce((sum, p) => {
    if (p.subscription.billingCycle === "monthly" && p.subscription.status === "active") return sum + p.amount
    if (p.subscription.billingCycle === "yearly" && p.subscription.status === "active") return sum + p.amount / 12
    return sum
  }, 0)

  const arr = payments.reduce((sum, p) => {
    if (p.subscription.billingCycle === "yearly" && p.subscription.status === "active") return sum + p.amount
    return sum
  }, 0)

  return NextResponse.json({
    totalTenants,
    activeTenants,
    trialTenants,
    pastDueTenants,
    mrr: Math.round(mrr),
    arr: Math.round(arr),
    revenueThisMonth: paymentsThisMonth._sum.amount || 0,
    revenueLastMonth: paymentsLastMonth._sum.amount || 0,
    paymentsCount: paymentsThisMonth._count,
    planDistribution: plans.map((p) => ({ name: p.name, count: p.subscriptions.filter(s => s.status === "active" || s.status === "trial").length, mrr: p.subscriptions.filter(s => s.status === "active" && s.billingCycle === "monthly").reduce((sum, s) => sum + p.priceMonthly, 0) })),
    tenants,
    recentSignups,
    recentActivity,
    recentPayments: payments.slice(0, 5),
  })
}
