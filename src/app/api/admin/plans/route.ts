import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const plans = await db.plan.findMany({ include: { subscriptions: true }, orderBy: { priceMonthly: "asc" } })
  return NextResponse.json({ plans: plans.map(p => ({ ...p, features: JSON.parse(p.features), activeSubs: p.subscriptions.filter(s => s.status === "active" || s.status === "trial").length })) })
}
