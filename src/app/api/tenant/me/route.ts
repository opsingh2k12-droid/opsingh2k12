import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as any
  if (!user.tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  })
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ tenant, user })
}
