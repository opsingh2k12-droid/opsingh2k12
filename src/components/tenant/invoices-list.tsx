"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Search, FileDown, Filter } from "lucide-react"
import { useState } from "react"
import { formatINR, formatDate } from "@/lib/format"
import { InvoiceDetail } from "@/components/tenant/invoice-detail"

export function InvoicesList({ onNew, docType = "invoice" }: { onNew: () => void; docType?: "invoice" | "estimate" }) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "partial" | "overdue">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isEstimate = docType === "estimate"
  const pageTitle = isEstimate ? "Estimates" : "Sales Invoices"
  const newButtonLabel = isEstimate ? "New Estimate" : "New Invoice"

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-invoices", docType],
    queryFn: async () => (await fetch(`/api/tenant/invoices?type=${docType}`)).json(),
    enabled: !selectedId, // Only fetch list when no invoice is selected
  })

  // If an invoice is selected, show detail view
  if (selectedId) {
    return <InvoiceDetail invoiceId={selectedId} onBack={() => setSelectedId(null)} docType={docType} />
  }

  const allDocs = (data?.invoices || []).filter((inv: any) => inv.type === docType)

  const invoices = allDocs.filter((inv: any) => {
    if (search && !inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) && !inv.party?.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== "all" && inv.status !== filter) return false
    return true
  })

  const total = invoices.reduce((s: number, inv: any) => s + inv.grandTotal, 0)
  const paidCount = allDocs.filter((i: any) => i.status === "paid").length
  const unpaidCount = allDocs.filter((i: any) => i.status === "unpaid").length
  const partialCount = allDocs.filter((i: any) => i.status === "partial").length
  const overdueCount = allDocs.filter((i: any) => i.status === "overdue").length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> {pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{allDocs.length} {isEstimate ? "estimates" : "invoices"} · {formatINR(total)} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-1.5" /> Export CSV</Button>
          <Button onClick={onNew} className="gap-1.5"><Plus className="w-4 h-4" /> {newButtonLabel}</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={`Search ${isEstimate ? "estimates" : "invoices"}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {([
            { id: "all", label: "All", count: allDocs.length },
            { id: "paid", label: "Paid", count: paidCount },
            { id: "unpaid", label: "Unpaid", count: unpaidCount },
            { id: "partial", label: "Partial", count: partialCount },
            { id: "overdue", label: "Overdue", count: overdueCount },
          ] as const).map((f) => (
            <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => setFilter(f.id as any)}>
              {f.label} ({f.count})
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{isEstimate ? "Estimate" : "Invoice"} #</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Party</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Date</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Taxable</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">GST</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Total</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="border-b"><td colSpan={7} className="p-4"><div className="h-6 bg-muted/40 rounded animate-pulse" /></td></tr>)
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No {isEstimate ? "estimates" : "invoices"} found. Click "{newButtonLabel}" to create one.</td></tr>
                ) : invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedId(inv.id)}>
                    <td className="p-3"><div className="font-semibold">{inv.invoiceNumber}</div><div className="text-xs text-muted-foreground">{inv.items.length} items</div></td>
                    <td className="p-3"><div className="font-medium">{inv.party?.name}</div><div className="text-xs text-muted-foreground">{inv.party?.gstin || "Walk-in"}</div></td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="p-3 hidden md:table-cell text-right tabular-nums">{formatINR(inv.taxableAmount)}</td>
                    <td className="p-3 hidden md:table-cell text-right tabular-nums">{formatINR(inv.totalGst)}</td>
                    <td className="p-3 text-right font-bold tabular-nums">{formatINR(inv.grandTotal)}</td>
                    <td className="p-3"><StatusPill status={inv.status} /></td>
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    partial: "bg-amber-100 text-amber-700",
    unpaid: "bg-slate-100 text-slate-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-400",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${map[status] || ""}`}>{status}</span>
}
