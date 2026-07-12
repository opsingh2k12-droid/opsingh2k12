import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      party: true,
      items: true,
      payments: true,
      tenant: {
        select: { businessName: true, legalName: true, gstin: true, pan: true, address: true, city: true, state: true, stateCode: true, phone: true, email: true, logo: true, signature: true, termsAndConditions: true, invoicePrefix: true, estimatePrefix: true },
      },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ invoice })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()

  // Verify ownership
  const existing = await db.invoice.findFirst({ where: { id, tenantId: ctx.tenantId } })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Handle simple field updates (status, notes, terms, dates)
  const allowedFields = ["status", "notes", "terms", "invoiceDate"]
  const updateData: any = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "invoiceDate") {
        updateData[field] = new Date(body[field])
      } else {
        updateData[field] = body[field]
      }
    }
  }

  const invoice = await db.invoice.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ invoice })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params

  // Verify ownership
  const existing = await db.invoice.findFirst({ where: { id, tenantId: ctx.tenantId } })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Restore stock before deleting
  const items = await db.invoiceItem.findMany({ where: { invoiceId: id } })
  for (const item of items) {
    if (item.itemId) {
      await db.item.update({
        where: { id: item.itemId },
        data: { stockQty: { increment: item.qty } },
      })
    }
  }

  // Delete invoice (cascade will delete items + payments)
  await db.invoice.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
