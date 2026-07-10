"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, IndianRupee, Users, AlertCircle, TrendingUp, ArrowRight, Crown, Zap, Gift, Building } from "lucide-react"
import { formatINR, formatDate, timeAgo } from "@/lib/format"
import { AdminPage } from "@/components/admin-app-shell"

export function AdminDashboard({ onNavigate }: { onNavigate: (p: AdminPage) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await fetch("/api/admin/dashboard")).json(),
  })

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="h-32 animate-pulse" /></Card>)}</div>
  }

  const revenueGrowth = data?.revenueLastMonth ? ((data.revenueThisMonth - data.revenueLastMonth) / data.revenueLastMonth) * 100 : 0

  const kpis = [
    { label: "Total Tenants", value: data?.totalTenants || 0, icon: <Building2 className="w-4 h-4" />, sub: `${data?.activeTenants || 0} active`, color: "primary" },
    { label: "MRR (Monthly Recurring)", value: formatINR(data?.mrr || 0), icon: <IndianRupee className="w-4 h-4" />, sub: `ARR: ${formatINR(data?.arr || 0)}`, color: "primary" },
    { label: "Active Trials", value: data?.trialTenants || 0, icon: <Gift className="w-4 h-4" />, sub: "Converting to paid soon", color: "accent" },
    { label: "Past Due", value: data?.pastDueTenants || 0, icon: <AlertCircle className="w-4 h-4" />, sub: "Need attention", color: "destructive" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6 text-primary" /> Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">All your SaaS tenants, revenue & activity at a glance</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate("tenants")} className="gap-1.5">
          <Users className="w-4 h-4" /> Manage Tenants <ArrowRight className="w-3 h-3" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${kpi.color}/10 text-${kpi.color}`}>{kpi.icon}</div>
              </div>
              <div className="text-2xl font-bold tabular-nums">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue banner */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Revenue This Month</div>
              <div className="text-3xl font-bold text-primary tabular-nums">{formatINR(data?.revenueThisMonth || 0)}</div>
              <div className={`text-xs font-medium mt-1 flex items-center gap-1 ${revenueGrowth >= 0 ? "text-green-600" : "text-destructive"}`}>
                <TrendingUp className="w-3 h-3" />
                {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth.toFixed(1)}% vs last month ({formatINR(data?.revenueLastMonth || 0)})
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Payments this month</div>
              <div className="text-lg font-bold">{data?.paymentsCount || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent tenants */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Tenants</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => onNavigate("tenants")}>
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Business</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Plan</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Joined</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentSignups?.map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => onNavigate("tenants")}>
                    <td className="p-3">
                      <div className="font-semibold">{t.businessName}</div>
                      <div className="text-xs text-muted-foreground">{t.email} · {t.city || "—"}</div>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <PlanBadge plan={t.subscriptions?.[0]?.plan?.name} />
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDate(t.createdAt)}</td>
                    <td className="p-3"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.planDistribution?.map((p: any) => {
              const max = Math.max(...data.planDistribution.map((x: any) => x.count), 1)
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.count} tenants</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(p.count / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Activity feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-80 overflow-y-auto">
            {data?.recentActivity?.map((log: any) => (
              <div key={log.id} className="p-3 flex items-center gap-3 hover:bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  {log.action.includes("signup") ? <Building className="w-4 h-4" /> : log.action.includes("payment") ? <AlertCircle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{log.tenant?.businessName}</div>
                  <div className="text-xs text-muted-foreground">{log.action.replace(/\./g, " ")} — {log.detail}</div>
                </div>
                <div className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trial: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-400",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${map[status] || ""}`}>{status}</span>
}
