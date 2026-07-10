import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const parties = await db.party.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: "asc" } })
  // Compute current balance = openingBalance + (invoices total - payments received)
  const partiesWithBalance = await Promise.all(
    parties.map(async (p) => {
      const invAgg = await db.invoice.aggregate({ where: { tenantId: ctx.tenantId!, partyId: p.id }, _sum: { grandTotal: true } })
      const payAgg = await db.payment.aggregate({ where: { tenantId: ctx.tenantId!, partyId: p.id, direction: "in" }, _sum: { amount: true } })
      const purAgg = await db.purchase.aggregate({ where: { tenantId: ctx.tenantId!, partyId: p.id }, _sum: { grandTotal: true } })
      const payOutAgg = await db.payment.aggregate({ where: { tenantId: ctx.tenantId!, partyId: p.id, direction: "out" }, _sum: { amount: true } })
      const balance = (p.openingBalance || 0) + (invAgg._sum.grandTotal || 0) - (payAgg._sum.amount || 0) - (purAgg._sum.grandTotal || 0) + (payOutAgg._sum.amount || 0)
      return { ...p, currentBalance: balance }
    })
  )
  return NextResponse.json({ parties: partiesWithBalance })
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const party = await db.party.create({
    data: { ...body, tenantId: ctx.tenantId, openingBalance: Number(body.openingBalance || 0) },
  })
  return NextResponse.json({ party })
}

export async function PUT(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { id, ...data } = body
  const party = await db.party.update({ where: { id, tenantId: ctx.tenantId }, data: { ...data, openingBalance: data.openingBalance !== undefined ? Number(data.openingBalance) : undefined } })
  return NextResponse.json({ party })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  await db.party.delete({ where: { id, tenantId: ctx.tenantId } })
  return NextResponse.json({ ok: true })
}
