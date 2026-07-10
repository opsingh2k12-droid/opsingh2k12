import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTenantContext } from "@/lib/session"

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      id: true,
      businessName: true,
      legalName: true,
      gstin: true,
      pan: true,
      address: true,
      city: true,
      state: true,
      stateCode: true,
      phone: true,
      email: true,
      logo: true,
      signature: true,
      termsAndConditions: true,
      invoicePrefix: true,
      estimatePrefix: true,
      fiscalYearStartMonth: true,
    },
  })
  return NextResponse.json({ tenant })
}

export async function PUT(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      businessName,
      legalName,
      gstin,
      pan,
      address,
      city,
      state,
      stateCode,
      phone,
      email,
      logo,
      signature,
      termsAndConditions,
      invoicePrefix,
      estimatePrefix,
      fiscalYearStartMonth,
    } = body

    const tenant = await db.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        businessName,
        legalName,
        gstin,
        pan,
        address,
        city,
        state,
        stateCode,
        phone,
        email,
        logo,
        signature,
        termsAndConditions,
        invoicePrefix,
        estimatePrefix,
        fiscalYearStartMonth: fiscalYearStartMonth ? Number(fiscalYearStartMonth) : undefined,
      },
    })

    return NextResponse.json({ tenant })
  } catch (e) {
    console.error("[settings update]", e)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}
