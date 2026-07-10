import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const invoices = await db.invoice.findMany({
    where: { tenantId: ctx.tenantId },
    include: { party: true, items: true, payments: true },
    orderBy: { invoiceDate: "desc" },
  })
  return NextResponse.json({ invoices })
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { partyId, supplyType, invoiceDate, discountPct, items, notes, terms, status } = body

  if (!partyId || !items?.length) {
    return NextResponse.json({ error: "Party and items required" }, { status: 400 })
  }

  const isInter = supplyType === "inter"
  const discount = Number(discountPct || 0)

  let subtotal = 0
  let totalGst = 0
  const itemLines = items.map((it: any) => {
    const amount = Number(it.qty) * Number(it.rate)
    const lineDiscount = (amount * discount) / 100
    const taxableAmount = amount - lineDiscount
    const gst = (taxableAmount * Number(it.gstRate)) / 100
    const cgst = isInter ? 0 : gst / 2
    const sgst = isInter ? 0 : gst / 2
    const igst = isInter ? gst : 0
    subtotal += amount
    totalGst += gst
    return {
      itemId: it.itemId || null,
      name: it.name,
      hsn: it.hsn,
      qty: Number(it.qty),
      rate: Number(it.rate),
      gstRate: Number(it.gstRate),
      amount,
      taxableAmount,
      cgst,
      sgst,
      igst,
    }
  })

  const discountAmount = (subtotal * discount) / 100
  const taxableAmount = subtotal - discountAmount
  const cgst = isInter ? 0 : totalGst / 2
  const sgst = isInter ? 0 : totalGst / 2
  const igst = isInter ? totalGst : 0
  const grandTotal = taxableAmount + totalGst

  // Generate invoice number: INV-YYYY-XXXX
  const year = new Date().getFullYear()
  const count = await db.invoice.count({ where: { tenantId: ctx.tenantId } })
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`

  const invoice = await db.invoice.create({
    data: {
      tenantId: ctx.tenantId,
      invoiceNumber,
      partyId,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      supplyType,
      status: status || "unpaid",
      subtotal,
      discountPct: discount,
      discountAmount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalGst,
      grandTotal,
      paidAmount: 0,
      balanceDue: grandTotal,
      notes,
      terms,
      items: { create: itemLines },
    },
    include: { items: true, party: true },
  })

  // Reduce stock
  await Promise.all(
    itemLines.map(async (line: any) => {
      if (line.itemId) {
        await db.item.update({
          where: { id: line.itemId },
          data: { stockQty: { decrement: line.qty } },
        })
      }
    })
  )

  // Log activity
  await db.activityLog.create({
    data: { tenantId: ctx.tenantId!, action: "invoice.created", detail: invoice.invoiceNumber },
  })

  return NextResponse.json({ invoice })
}
