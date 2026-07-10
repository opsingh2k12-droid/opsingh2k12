import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (id) {
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        users: true,
        subscriptions: { include: { plan: true, payments: { orderBy: { paidAt: "desc" } } } },
        _count: { select: { invoices: true, items: true, parties: true, purchases: true, payments: true } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    })
    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ tenant })
  }
  const tenants = await db.tenant.findMany({
    include: {
      users: { take: 1 },
      subscriptions: { include: { plan: true } },
      _count: { select: { invoices: true, items: true, parties: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ tenants })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { id, status } = body
  const tenant = await db.tenant.update({ where: { id }, data: { status } })
  return NextResponse.json({ tenant })
}
