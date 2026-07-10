import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const items = await db.item.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: "asc" } })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const item = await db.item.create({
    data: { ...body, tenantId: ctx.tenantId, salePrice: Number(body.salePrice), purchasePrice: Number(body.purchasePrice || 0), gstRate: Number(body.gstRate || 18), stockQty: Number(body.stockQty || 0), reorderLevel: Number(body.reorderLevel || 10) },
  })
  return NextResponse.json({ item })
}

export async function PUT(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { id, ...data } = body
  const item = await db.item.update({
    where: { id, tenantId: ctx.tenantId },
    data: { ...data, salePrice: data.salePrice ? Number(data.salePrice) : undefined, purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined, gstRate: data.gstRate !== undefined ? Number(data.gstRate) : undefined, stockQty: data.stockQty !== undefined ? Number(data.stockQty) : undefined, reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : undefined },
  })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  await db.item.delete({ where: { id, tenantId: ctx.tenantId } })
  return NextResponse.json({ ok: true })
}
