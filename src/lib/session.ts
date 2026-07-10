import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function getTenantContext() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const user = session.user as any
  if (user.role === "super_admin") return { role: "super_admin" as const, userId: user.id }
  if (!user.tenantId) return null
  const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } })
  if (!tenant) return null
  return { role: user.role, tenantId: tenant.id, userId: user.id, tenant }
}

export type TenantContext = Awaited<ReturnType<typeof getTenantContext>>
