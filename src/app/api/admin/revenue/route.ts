import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const payments = await db.platformPayment.findMany({
    include: { subscription: { include: { tenant: true, plan: true } } },
    orderBy: { paidAt: "desc" },
    take: 50,
  })

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthsAgo6 = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
  const monthlyRevenue = await db.platformPayment.aggregate({ where: { status: "paid", paidAt: { gte: monthsAgo6 } }, _sum: { amount: true }, _count: true })

  return NextResponse.json({ payments, monthlyRevenue })
}
