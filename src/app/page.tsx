"use client"
import { useSession } from "next-auth/react"
import { Loader2, Receipt } from "lucide-react"
import { LoginScreen } from "@/components/login-screen"
import { TenantAppShell } from "@/components/tenant-app-shell"
import { AdminAppShell } from "@/components/admin-app-shell"
import { useEffect, useState } from "react"

// Error boundary — catches client-side errors gracefully
function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-4">Please try refreshing the page.</p>
        <button onClick={reset} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
          Refresh
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const { data: session, status } = useSession()
  const [tenant, setTenant] = useState<any>(null)
  const [tenantLoaded, setTenantLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (status !== "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTenantLoaded(true)
      return
    }
    const user = session?.user as any
    if (user?.role === "super_admin") {
      setTenantLoaded(true)
      return
    }
    if (user?.tenantId) {
      let cancelled = false
      fetch("/api/tenant/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled) {
            if (data?.tenant) setTenant(data.tenant)
            setTenantLoaded(true)
          }
        })
        .catch(() => { if (!cancelled) setTenantLoaded(true) })
      return () => { cancelled = true }
    } else {
      setTenantLoaded(true)
    }
  }, [session, status])

  if (error) {
    return <ErrorFallback error={error} reset={() => { setError(null); window.location.reload() }} />
  }

  if (status === "loading" || !tenantLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="/kloudiotech-logo.png" alt="BillDesk Pro" className="w-12 h-12 rounded-xl object-contain animate-pulse" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading BillDesk Pro...
          </div>
        </div>
      </div>
    )
  }

  if (!session) return <LoginScreen />

  try {
    const user = session.user as any
    if (user?.role === "super_admin") return <AdminAppShell />
    if (tenant) return <TenantAppShell tenant={tenant} />

    // Fallback: user without tenant
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold mb-2">Account not linked to a business</h1>
          <p className="text-sm text-muted-foreground mb-4">Your account is not associated with any tenant. Please contact support.</p>
          <a href="/api/auth/signout" className="text-primary underline text-sm">Logout</a>
        </div>
      </div>
    )
  } catch (e: any) {
    setError(e)
    return null
  }
}
