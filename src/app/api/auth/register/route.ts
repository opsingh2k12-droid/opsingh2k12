import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessName, email, password, phone, gstin, state, stateCode, city } = body

    if (!businessName || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const freePlan = await db.plan.findFirst({ where: { name: "Free" } })
    if (!freePlan) return NextResponse.json({ error: "Default plan not found" }, { status: 500 })

    const passwordHash = await bcrypt.hash(password, 10)
    const trialDays = 14

    const tenant = await db.tenant.create({
      data: {
        businessName,
        gstin,
        phone,
        email: email.toLowerCase(),
        city,
        state,
        stateCode,
        status: "trial",
        trialEndsAt: new Date(Date.now() + trialDays * 86400000),
        users: {
          create: {
            email: email.toLowerCase(),
            name: businessName,
            passwordHash,
            role: "owner",
          },
        },
        subscriptions: {
          create: {
            planId: freePlan.id,
            status: "trial",
            billingCycle: "monthly",
            currentPeriodEnd: new Date(Date.now() + trialDays * 86400000),
          },
        },
        activityLogs: {
          create: { action: "tenant.signup", detail: "Trial started" },
        },
      },
    })

    return NextResponse.json({ ok: true, tenantId: tenant.id })
  } catch (e) {
    console.error("[register]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
