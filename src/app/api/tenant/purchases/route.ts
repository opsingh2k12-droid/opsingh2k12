import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const purchases = await db.purchase.findMany({
    where: { tenantId: ctx.tenantId },
    include: { party: true, items: true },
    orderBy: { billDate: "desc" },
  })
  return NextResponse.json({ purchases })
}
