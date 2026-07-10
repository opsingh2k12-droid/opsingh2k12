"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, FileDown } from "lucide-react"
import { formatINR, formatDate } from "@/lib/format"

export function PurchasesList() {
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-purchases"],
    queryFn: async () => (await fetch("/api/tenant/purchases")).json(),
  })

  const purchases = data?.purchases || []
  const total = purchases.reduce((s: number, p: any) => s + p.grandTotal, 0)
  const itcTotal = purchases.reduce((s: number, p: any) => s + p.totalGst, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary" /> Purchase Bills</h1>
          <p className="text-sm text-muted-foreground mt-1">{purchases.length} bills · {formatINR(total)} total · ITC available: {formatINR(itcTotal)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-1.5" /> Export</Button>
          <Button className="gap-1.5"><Plus className="w-4 h-4" /> New Purchase Bill</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="default">All ({purchases.length})</Button>
        <Button size="sm" variant="outline">Paid ({purchases.filter((p: any) => p.status === "paid").length})</Button>
        <Button size="sm" variant="outline">Unpaid ({purchases.filter((p: any) => p.status === "unpaid").length})</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Bill No.</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Supplier</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Date</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Taxable</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">GST (ITC)</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Total</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => <tr key={i} className="border-b"><td colSpan={7} className="p-4"><div className="h-6 bg-muted/40 rounded animate-pulse" /></td></tr>)
                ) : purchases.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No purchase bills recorded</td></tr>
                ) : purchases.map((pur: any) => (
                  <tr key={pur.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-semibold">{pur.billNumber}</td>
                    <td className="p-3"><div className="font-medium">{pur.party?.name}</div><div className="text-xs text-muted-foreground">{pur.party?.gstin || "—"}</div></td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{formatDate(pur.billDate)}</td>
                    <td className="p-3 hidden md:table-cell text-right tabular-nums">{formatINR(pur.taxableAmount)}</td>
                    <td className="p-3 hidden md:table-cell text-right tabular-nums">{formatINR(pur.totalGst)}</td>
                    <td className="p-3 text-right font-bold tabular-nums">{formatINR(pur.grandTotal)}</td>
                    <td className="p-3">
                      <Badge variant={pur.status === "paid" ? "default" : pur.status === "overdue" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                        {pur.status}
                      </Badge>
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
