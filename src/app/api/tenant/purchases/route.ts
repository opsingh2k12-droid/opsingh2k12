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

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { partyId, billDate, supplyType, discountPct, items, notes, status } = body

  if (!partyId || !items?.length) {
    return NextResponse.json({ error: "Supplier and items required" }, { status: 400 })
  }

  const isInter = supplyType === "inter"
  const discount = Number(discountPct || 0)

  let subtotal = 0
  let totalGst = 0
  let totalTaxable = 0
  const itemLines = items.map((it: any) => {
    const gstType = it.gstType === "inclusive" ? "inclusive" : "exclusive"
    const amount = Number(it.qty) * Number(it.rate)
    const lineDiscount = (amount * discount) / 100
    const netAmount = amount - lineDiscount

    let taxableAmount: number
    let gst: number
    if (gstType === "inclusive") {
      taxableAmount = netAmount / (1 + Number(it.gstRate) / 100)
      gst = netAmount - taxableAmount
    } else {
      taxableAmount = netAmount
      gst = (taxableAmount * Number(it.gstRate)) / 100
    }

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
      amount,
    }
  })

  const discountAmount = (subtotal * discount) / 100
  const taxableAmount = totalTaxable
  const cgst = isInter ? 0 : totalGst / 2
  const sgst = isInter ? 0 : totalGst / 2
  const igst = isInter ? totalGst : 0
  const grandTotal = taxableAmount + totalGst

  // Generate bill number
  const year = new Date().getFullYear()
  const count = await db.purchase.count({ where: { tenantId: ctx.tenantId } })
  const billNumber = `PUR-${year}-${String(count + 1).padStart(4, "0")}`

  const purchase = await db.purchase.create({
    data: {
      tenantId: ctx.tenantId,
      billNumber,
      partyId,
      billDate: billDate ? new Date(billDate) : new Date(),
      status: status || "unpaid",
      subtotal,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalGst,
      grandTotal,
      paidAmount: 0,
      balanceDue: grandTotal,
      notes,
      items: { create: itemLines },
    },
    include: { items: true, party: true },
  })

  // Increase stock
  await Promise.all(
    itemLines.map(async (line: any) => {
      if (line.itemId) {
        await db.item.update({
          where: { id: line.itemId },
          data: { stockQty: { increment: line.qty } },
        })
      }
    })
  )

  return NextResponse.json({ purchase })
}
