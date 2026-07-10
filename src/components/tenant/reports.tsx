"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IndianRupee, TrendingUp, ShoppingCart, Receipt, FileDown, Calendar } from "lucide-react"
import { formatINR } from "@/lib/format"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function TenantReports() {
  const [fyOffset, setFyOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-reports", fyOffset],
    queryFn: async () => (await fetch(`/api/tenant/reports?yearOffset=${fyOffset}`)).json(),
  })

  const maxSale = Math.max(...((data?.salesByDay || []).map((s: any) => Number(s.total)) || [1]), 1)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary" /> Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Financial Year: <span className="font-semibold text-foreground">{data?.fyLabel || "—"}</span></p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={String(fyOffset)} onValueChange={(v) => setFyOffset(Number(v))}>
            <SelectTrigger className="w-[140px]"><Calendar className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {(data?.fyOptions || []).map((fy: any) => (
                <SelectItem key={fy.offset} value={String(fy.offset)}>
                  FY {fy.label} {fy.isCurrent ? "(Current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-1.5" /> GSTR-1 Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={`Total Sales (FY ${data?.fyLabel || ""})`} value={formatINR(data?.totalSales || 0)} icon={<IndianRupee className="w-4 h-4" />} trend={`${data?.invoiceCount || 0} invoices`} trendUp />
        <KpiCard label="Total Purchases" value={formatINR(data?.totalPurchases || 0)} icon={<ShoppingCart className="w-4 h-4" />} trend="" trendUp />
        <KpiCard label="Output GST" value={formatINR(data?.totalGst || 0)} icon={<Receipt className="w-4 h-4" />} trend="Collected" trendUp />
        <KpiCard label="Net GST Payable" value={formatINR(data?.netGst || 0)} icon={<IndianRupee className="w-4 h-4" />} trend={`After ITC: ${formatINR(data?.itcAvailable || 0)}`} trendUp={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daily Sales — This Month</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 bg-muted/40 rounded animate-pulse" />
            ) : (
              <div className="flex items-end gap-1 h-48 border-b border-border pb-1">
                {(data?.salesByDay || []).map((day: any, i: number) => {
                  const heightPct = (Number(day.total) / maxSale) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 absolute -top-5">{formatINR(Number(day.total))}</div>
                      <div className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t hover:from-accent hover:to-accent/60 transition-colors" style={{ height: `${Math.max(heightPct, 2)}%` }} />
                      <div className="text-[9px] text-muted-foreground">{new Date(day.d).getDate()}</div>
                    </div>
                  )
                })}
                {(data?.salesByDay || []).length === 0 && <div className="w-full text-center text-sm text-muted-foreground py-12">No sales this month yet</div>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GST summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">GST Summary (GSTR-1)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted/40 rounded animate-pulse" />)
            ) : (
              <>
                <GstRow label="Taxable Supplies" value={formatINR(data?.totalTaxable || 0)} />
                {(data?.gstByRate || []).map((g: any) => (
                  <GstRow key={g.rate} label={`GST ${g.rate}% Supplies`} value={formatINR(g.taxable)} />
                ))}
                <div className="border-t pt-2 mt-2 bg-primary/5 -mx-2 px-2 py-1.5 rounded">
                  <GstRow label="Total Output GST" value={formatINR(data?.totalGst || 0)} bold />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top Selling Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Item</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">HSN</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Qty Sold</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topItems || []).length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No sales data</td></tr>
              ) : (data?.topItems || []).map((item: any, i: number) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{item.hsn || "—"}</td>
                  <td className="p-3 text-right tabular-nums">{item._sum.qty}</td>
                  <td className="p-3 text-right font-bold tabular-nums">{formatINR(item._sum.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ label, value, icon, trend, trendUp }: { label: string; value: string; icon: React.ReactNode; trend: string; trendUp: boolean }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">{label}</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">{icon}</div>
        </div>
        <div className="text-lg sm:text-2xl font-bold tabular-nums">{value}</div>
        <div className={`text-[10px] sm:text-xs font-medium mt-1 ${trendUp ? "text-green-600" : "text-muted-foreground"}`}>{trend}</div>
      </CardContent>
    </Card>
  )
}

function GstRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center text-xs p-1.5 rounded ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
