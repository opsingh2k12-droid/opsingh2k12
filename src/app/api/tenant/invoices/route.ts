import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") // "invoice" | "estimate" | null (all)

  const invoices = await db.invoice.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(type ? { type } : {}),
    },
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
  let totalTaxable = 0
  const itemLines = items.map((it: any) => {
    const gstType = it.gstType === "inclusive" ? "inclusive" : "exclusive"
    const amount = Number(it.qty) * Number(it.rate) // qty * rate (as entered)
    const lineDiscount = (amount * discount) / 100
    const netAmount = amount - lineDiscount // after discount

    let taxableAmount: number
    let gst: number
    if (gstType === "inclusive") {
      // Rate includes GST → back-calculate taxable
      taxableAmount = netAmount / (1 + Number(it.gstRate) / 100)
      gst = netAmount - taxableAmount
    } else {
      // Exclusive: rate is taxable → GST added on top
      taxableAmount = netAmount
      gst = (taxableAmount * Number(it.gstRate)) / 100
    }

    const cgst = isInter ? 0 : gst / 2
    const sgst = isInter ? 0 : gst / 2
    const igst = isInter ? gst : 0
    subtotal += amount
    totalGst += gst
    totalTaxable += taxableAmount
    return {
      itemId: it.itemId || null,
      name: it.name,
      hsn: it.hsn,
      qty: Number(it.qty),
      rate: Number(it.rate),
      gstRate: Number(it.gstRate),
      gstType,
      amount,
      taxableAmount,
      cgst,
      sgst,
      igst,
    }
  })

  const discountAmount = (subtotal * discount) / 100
  const taxableAmount = totalTaxable // sum of per-line taxable (handles mixed inclusive/exclusive)
  const cgst = isInter ? 0 : totalGst / 2
  const sgst = isInter ? 0 : totalGst / 2
  const igst = isInter ? totalGst : 0
  const grandTotal = taxableAmount + totalGst

  // Generate invoice/estimate number with tenant's custom prefix
  const year = new Date().getFullYear()
  const docType = body.type === "estimate" ? "estimate" : "invoice"
  const tenant = await db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { invoicePrefix: true, estimatePrefix: true } })
  const prefix = docType === "estimate" ? (tenant?.estimatePrefix || "EST-") : (tenant?.invoicePrefix || "INV-")
  // Count only docs of same type for sequential numbering
  const count = await db.invoice.count({ where: { tenantId: ctx.tenantId, type: docType } })
  const invoiceNumber = `${prefix}${year}-${String(count + 1).padStart(4, "0")}`

  const invoice = await db.invoice.create({
    data: {
      tenantId: ctx.tenantId,
      invoiceNumber,
      partyId,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      supplyType,
      type: docType,
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
