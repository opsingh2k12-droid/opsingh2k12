"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IndianRupee, Clock, AlertTriangle, FileText, TrendingUp, TrendingDown, ArrowRight, Boxes, Users, ShoppingCart } from "lucide-react"
import { formatINR, formatDate, timeAgo } from "@/lib/format"
import { TenantPage } from "@/components/tenant-app-shell"

export function TenantDashboard({ onNavigate }: { onNavigate: (p: TenantPage) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/dashboard")
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    )
  }

  const kpis = [
    { label: "Today's Sales", value: formatINR(data?.todaySales || 0), icon: <IndianRupee className="w-4 h-4" />, trend: "+12.4%", trendUp: true, color: "primary" },
    { label: "Pending Dues", value: formatINR(data?.pendingDues || 0), icon: <Clock className="w-4 h-4" />, trend: "-4.2%", trendUp: false, color: "destructive" },
    { label: "Low Stock Items", value: `${data?.lowStockCount || 0} items`, icon: <AlertTriangle className="w-4 h-4" />, trend: "Needs restock", trendUp: false, color: "accent" },
    { label: "Invoices This Month", value: `${data?.monthInvoices || 0}`, icon: <FileText className="w-4 h-4" />, trend: "+23 vs last month", trendUp: true, color: "primary" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Welcome back 🙏</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening at your business today</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Last 30 days</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${kpi.color}/10 text-${kpi.color}`}>
                  {kpi.icon}
                </div>
              </div>
              <div className="text-2xl font-bold tabular-nums">{kpi.value}</div>
              <div className={`text-xs font-medium mt-1 flex items-center gap-1 ${kpi.trendUp ? "text-green-600" : "text-muted-foreground"}`}>
                {kpi.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent invoices */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => onNavigate("invoices")}>
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground p-3 text-xs uppercase tracking-wider">Invoice #</th>
                    <th className="text-left font-medium text-muted-foreground p-3 text-xs uppercase tracking-wider">Party</th>
                    <th className="text-left font-medium text-muted-foreground p-3 text-xs uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="text-right font-medium text-muted-foreground p-3 text-xs uppercase tracking-wider">Amount</th>
                    <th className="text-left font-medium text-muted-foreground p-3 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentInvoices?.map((inv: any) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => onNavigate("invoices")}>
                      <td className="p-3">
                        <div className="font-semibold">{inv.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">{inv.items.length} items</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{inv.party?.name}</div>
                        <div className="text-xs text-muted-foreground">{inv.party?.gstin || "Walk-in"}</div>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                      <td className="p-3 text-right font-semibold tabular-nums">{formatINR(inv.grandTotal)}</td>
                      <td className="p-3"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                  {data?.recentInvoices?.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No invoices yet. Click "New Invoice" to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => onNavigate("items")}>
              Manage <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data?.lowStockItems?.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">All items well stocked ✅</div>
              )}
              {data?.lowStockItems?.map((item: any) => (
                <div key={item.id} className="p-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer" onClick={() => onNavigate("items")}>
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">HSN: {item.hsn || "—"} · Stock: {item.stockQty} / Reorder: {item.reorderLevel}</div>
                  </div>
                  {item.stockQty === 0 ? (
                    <Badge variant="destructive" className="text-[10px]">OUT</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">LOW</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Boxes className="w-5 h-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Total Items</div>
              <div className="font-bold text-lg tabular-nums">{data?.totalItems || 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Total Parties</div>
              <div className="font-bold text-lg tabular-nums">{data?.totalParties || 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><IndianRupee className="w-5 h-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">This Month Sales</div>
              <div className="font-bold text-lg tabular-nums">{formatINR(data?.monthSales || 0)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><ShoppingCart className="w-5 h-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">This Month Purchases</div>
              <div className="font-bold text-lg tabular-nums">{formatINR(data?.monthPurchases || 0)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    paid: "default",
    partial: "secondary",
    unpaid: "outline",
    overdue: "destructive",
    cancelled: "outline",
  }
  const variant = map[status] || "outline"
  const colors: Record<string, string> = {
    paid: "bg-green-100 text-green-700 hover:bg-green-100",
    partial: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    unpaid: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    overdue: "bg-red-100 text-red-700 hover:bg-red-100",
    cancelled: "",
  }
  return <Badge variant={variant} className={`text-[10px] capitalize ${colors[status] || ""}`}>{status}</Badge>
}
