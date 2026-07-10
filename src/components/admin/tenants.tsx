"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Building2, Search, Eye, Pause, Play, X, IndianRupee, Users, FileText, Boxes } from "lucide-react"
import { useState } from "react"
import { formatINR, formatDate, timeAgo } from "@/lib/format"
import { toast } from "sonner"

export function AdminTenants() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "trial" | "past_due" | "suspended">("all")
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => (await fetch("/api/admin/tenants")).json(),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await fetch("/api/admin/tenants", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      toast.success("Tenant status updated")
    },
  })

  const tenants = (data?.tenants || []).filter((t: any) => {
    if (search && !t.businessName.toLowerCase().includes(search.toLowerCase()) && !t.email?.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === "all") return true
    if (filter === "past_due") return t.subscriptions?.some((s: any) => s.status === "past_due")
    return t.status === filter
  })

  const selectedTenant = tenants.find((t: any) => t.id === selected)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" /> All Tenants</h1>
        <p className="text-sm text-muted-foreground mt-1">{data?.tenants?.length || 0} businesses using BillDesk Pro</p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by business name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "active", "trial", "past_due", "suspended"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f.replace("_", " ")}</Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Business</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Plan</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Usage</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Joined</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="border-b"><td colSpan={6} className="p-4"><div className="h-6 bg-muted/40 rounded animate-pulse" /></td></tr>)
                ) : tenants.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No tenants found</td></tr>
                ) : tenants.map((t: any) => {
                  const sub = t.subscriptions?.[0]
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-semibold">{t.businessName}</div>
                        <div className="text-xs text-muted-foreground">{t.email} · {t.city || "—"}</div>
                      </td>
                      <td className="p-3 hidden sm:table-cell"><PlanBadge plan={sub?.plan?.name} /></td>
                      <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">
                        {t._count.invoices} invoices · {t._count.items} items · {t._count.parties} parties
                      </td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">{timeAgo(t.createdAt)}</td>
                      <td className="p-3"><StatusBadge status={t.status} sub={sub} /></td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => setSelected(t.id)}>
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tenant detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTenant && (
            <TenantDetail
              tenant={selectedTenant}
              onAction={(status) => {
                updateMutation.mutate({ id: selectedTenant.id, status })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TenantDetail({ tenant, onAction }: { tenant: any; onAction: (s: string) => void }) {
  const sub = tenant.subscriptions?.[0]
  const plan = sub?.plan
  const owner = tenant.users?.[0]

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            {tenant.businessName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div>{tenant.businessName}</div>
            <div className="text-xs font-normal text-muted-foreground">{tenant.legalName || tenant.email}</div>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Status & plan actions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Status</div>
            <StatusBadge status={tenant.status} sub={sub} />
          </div>
          <div className="p-3 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Plan</div>
            <PlanBadge plan={plan?.name} /> <span className="text-xs text-muted-foreground">{formatINR(plan?.priceMonthly || 0)}/mo</span>
          </div>
        </div>

        {/* Usage stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <UsageStat icon={<FileText className="w-4 h-4" />} label="Invoices" value={tenant._count?.invoices || 0} />
          <UsageStat icon={<Boxes className="w-4 h-4" />} label="Items" value={tenant._count?.items || 0} />
          <UsageStat icon={<Users className="w-4 h-4" />} label="Parties" value={tenant._count?.parties || 0} />
          <UsageStat icon={<IndianRupee className="w-4 h-4" />} label="Payments" value={tenant._count?.payments || 0} />
        </div>

        <Separator />

        {/* Business info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="GSTIN" value={tenant.gstin || "—"} />
          <Field label="PAN" value={tenant.pan || "—"} />
          <Field label="Phone" value={tenant.phone || "—"} />
          <Field label="Email" value={tenant.email || "—"} />
          <Field label="City" value={tenant.city || "—"} />
          <Field label="State" value={`${tenant.state || "—"} (${tenant.stateCode || "—"})`} />
          <Field label="Address" value={tenant.address || "—"} fullWidth />
          <Field label="Owner" value={`${owner?.name || "—"} · ${owner?.email || ""}`} fullWidth />
          <Field label="Joined" value={formatDate(tenant.createdAt)} />
          <Field label="Trial Ends" value={tenant.trialEndsAt ? formatDate(tenant.trialEndsAt) : "—"} />
        </div>

        <Separator />

        {/* Subscription & payments */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subscription</div>
          <div className="p-3 rounded-lg border">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{plan?.name} Plan · {sub?.billingCycle}</div>
                <div className="text-xs text-muted-foreground">{formatINR(plan?.priceMonthly || 0)}/mo · Renews {formatDate(sub?.currentPeriodEnd)}</div>
              </div>
              <Badge variant="secondary" className="capitalize">{sub?.status}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {tenant.status !== "suspended" && (
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-700" onClick={() => onAction("suspended")}>
              <Pause className="w-3.5 h-3.5" /> Suspend
            </Button>
          )}
          {tenant.status === "suspended" && (
            <Button variant="outline" size="sm" className="gap-1.5 text-green-700" onClick={() => onAction("active")}>
              <Play className="w-3.5 h-3.5" /> Reactivate
            </Button>
          )}
          {tenant.status !== "cancelled" && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => onAction("cancelled")}>
              <X className="w-3.5 h-3.5" /> Cancel Subscription
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Impersonate coming soon")}>
            <Eye className="w-3.5 h-3.5" /> Login as Tenant
          </Button>
        </div>
      </div>
    </>
  )
}

function UsageStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40 text-center">
      <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1">{icon}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}

function Field({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  )
}

function PlanBadge({ plan }: { plan?: string }) {
  const map: Record<string, string> = {
    Free: "bg-slate-100 text-slate-700",
    Starter: "bg-blue-100 text-blue-700",
    Pro: "bg-purple-100 text-purple-700",
    Enterprise: "bg-amber-100 text-amber-700",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${map[plan || ""] || "bg-muted"}`}>{plan || "—"}</span>
}

function StatusBadge({ status, sub }: { status: string; sub?: any }) {
  let display = status
  if (status === "active" && sub?.status === "past_due") display = "past_due"
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trial: "bg-amber-100 text-amber-700",
    past_due: "bg-red-100 text-red-700",
    suspended: "bg-slate-400 text-white",
    cancelled: "bg-slate-100 text-slate-400",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${map[display] || ""}`}>{display.replace("_", " ")}</span>
}
