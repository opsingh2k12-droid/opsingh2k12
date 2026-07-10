"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IndianRupee, CreditCard, TrendingUp } from "lucide-react"
import { formatINR, formatDate } from "@/lib/format"

export function AdminRevenue() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => (await fetch("/api/admin/revenue")).json(),
  })

  const payments = data?.payments || []
  const totalCollected = payments.reduce((s: number, p: any) => s + (p.status === "paid" ? p.amount : 0), 0)
  const failed = payments.filter((p: any) => p.status === "failed").length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" /> Revenue & Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">Razorpay settlements · subscription billing history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">Total Collected</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><IndianRupee className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold tabular-nums">{formatINR(totalCollected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">Successful Payments</span>
              <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold tabular-nums">{payments.filter((p: any) => p.status === "paid").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">Failed Payments</span>
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center"><CreditCard className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold tabular-nums">{failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">Last 6 Months</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><IndianRupee className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold tabular-nums">{formatINR(data?.monthlyRevenue?._sum?.amount || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment History (Last 50)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Gateway Ref</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Tenant</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Plan</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Date</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="border-b"><td colSpan={6} className="p-4"><div className="h-6 bg-muted/40 rounded animate-pulse" /></td></tr>)
                ) : payments.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments yet</td></tr>
                ) : payments.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{p.gatewayRef || "—"}</td>
                    <td className="p-3"><div className="font-medium">{p.subscription?.tenant?.businessName}</div><div className="text-xs text-muted-foreground">{p.subscription?.tenant?.email}</div></td>
                    <td className="p-3 hidden sm:table-cell text-xs"><span className="font-medium">{p.subscription?.plan?.name}</span> · {p.subscription?.billingCycle}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDate(p.paidAt)}</td>
                    <td className="p-3 text-right font-bold tabular-nums">{formatINR(p.amount)}</td>
                    <td className="p-3">
                      <Badge variant={p.status === "paid" ? "default" : p.status === "failed" ? "destructive" : "secondary"} className="text-[10px] capitalize">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
