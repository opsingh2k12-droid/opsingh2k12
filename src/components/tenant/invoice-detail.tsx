"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ArrowLeft, Pencil, FileDown, MessageCircle, Mail, Trash2, CheckCircle2, X, IndianRupee, Clock } from "lucide-react"
import { formatINR, formatDate } from "@/lib/format"
import { useState } from "react"
import { toast } from "sonner"

export function InvoiceDetail({ invoiceId, onBack, docType = "invoice" }: { invoiceId: string; onBack: () => void; docType?: "invoice" | "estimate" }) {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ status: "", notes: "", terms: "", invoiceDate: "" })

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-detail", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/tenant/invoices/${invoiceId}`)
      if (!res.ok) throw new Error()
      return res.json()
    },
  })

  const invoice = data?.invoice
  const isEstimate = docType === "estimate" || invoice?.type === "estimate"
  const docLabel = isEstimate ? "Estimate" : "Invoice"

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/tenant/invoices/${invoiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] })
      queryClient.invalidateQueries({ queryKey: ["tenant-invoices"] })
      toast.success(`${docLabel} updated`)
      setEditOpen(false)
    },
    onError: () => toast.error("Update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenant/invoices/${invoiceId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invoices"] })
      queryClient.invalidateQueries({ queryKey: ["tenant-dashboard"] })
      toast.success(`${docLabel} deleted`)
      onBack()
    },
    onError: () => toast.error("Delete failed"),
  })

  const openEdit = () => {
    setEditForm({
      status: invoice.status,
      notes: invoice.notes || "",
      terms: invoice.terms || "",
      invoiceDate: new Date(invoice.invoiceDate).toISOString().slice(0, 10),
    })
    setEditOpen(true)
  }

  const handleWhatsApp = () => {
    if (!invoice?.party?.phone) return toast.error("No phone number")
    const msg = `Hello ${invoice.party.name}, your ${docLabel.toLowerCase()} ${invoice.invoiceNumber} for ${formatINR(invoice.grandTotal)} is ready. Thank you!`
    const phone = invoice.party.phone.replace(/[^0-9]/g, "")
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading {docLabel.toLowerCase()}...
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">{docLabel} not found</p>
        <Button onClick={onBack} variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back</Button>
      </div>
    )
  }

  const tenant = invoice.tenant
  const party = invoice.party

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to {isEstimate ? "Estimates" : "Invoices"}
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("PDF coming soon")} className="gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1FB855] hover:text-white border-0">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Email coming soon")} className="gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => { if (confirm(`Delete this ${docLabel.toLowerCase()}? This will restore stock.`)) deleteMutation.mutate() }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Invoice preview */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-3">
              {tenant?.logo && (
                <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-16 h-16 object-contain" />
              )}
              <div>
                <h2 className="text-xl font-bold">{tenant?.businessName}</h2>
                {tenant?.legalName && tenant.legalName !== tenant.businessName && (
                  <p className="text-xs text-muted-foreground">{tenant.legalName}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tenant?.phone && `📞 ${tenant.phone}`}
                  {tenant?.email && ` · ✉ ${tenant.email}`}
                </p>
                {tenant?.gstin && <p className="text-xs text-muted-foreground">GSTIN: {tenant.gstin}</p>}
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold uppercase text-primary">{docLabel}</h3>
              <p className="text-sm font-semibold mt-1">{invoice.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground">Date: {formatDate(invoice.invoiceDate)}</p>
              <div className="mt-2">
                <StatusPill status={invoice.status} />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Bill To</p>
              <p className="font-semibold">{party?.name}</p>
              {party?.address && <p className="text-xs text-muted-foreground">{party.address}</p>}
              <p className="text-xs text-muted-foreground">
                {party?.city}{party?.state ? `, ${party.state}` : ""}
              </p>
              {party?.phone && <p className="text-xs text-muted-foreground">📞 {party.phone}</p>}
              {party?.gstin && <p className="text-xs text-muted-foreground">GSTIN: {party.gstin}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Supply Type</p>
              <p className="text-sm">{invoice.supplyType === "inter" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-2 border-b text-xs font-medium uppercase">#</th>
                  <th className="text-left p-2 border-b text-xs font-medium uppercase">Item</th>
                  <th className="text-left p-2 border-b text-xs font-medium uppercase">HSN</th>
                  <th className="text-right p-2 border-b text-xs font-medium uppercase">Qty</th>
                  <th className="text-right p-2 border-b text-xs font-medium uppercase">Rate</th>
                  <th className="text-center p-2 border-b text-xs font-medium uppercase">GST</th>
                  <th className="text-right p-2 border-b text-xs font-medium uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, i: number) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2 font-medium">{item.name}</td>
                    <td className="p-2 text-muted-foreground">{item.hsn || "—"}</td>
                    <td className="p-2 text-right tabular-nums">{item.qty}</td>
                    <td className="p-2 text-right tabular-nums">{formatINR(item.rate)}</td>
                    <td className="p-2 text-center text-xs">
                      {item.gstRate}%
                      <span className={`ml-1 px-1 rounded text-[9px] ${item.gstType === "inclusive" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                        {item.gstType === "inclusive" ? "INCL" : "EXCL"}
                      </span>
                    </td>
                    <td className="p-2 text-right font-medium tabular-nums">{formatINR(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatINR(invoice.subtotal)}</span></div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Discount ({invoice.discountPct}%)</span><span className="text-destructive tabular-nums">− {formatINR(invoice.discountAmount)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span className="tabular-nums">{formatINR(invoice.taxableAmount)}</span></div>
              {invoice.supplyType === "intra" ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="tabular-nums">{formatINR(invoice.cgst)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="tabular-nums">{formatINR(invoice.sgst)}</span></div>
                </>
              ) : (
                <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="tabular-nums">{formatINR(invoice.igst)}</span></div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-bold"><span>Grand Total</span><span className="text-primary tabular-nums">{formatINR(invoice.grandTotal)}</span></div>
              {invoice.paidAmount > 0 && (
                <>
                  <div className="flex justify-between text-xs"><span className="text-green-600">Paid</span><span className="tabular-nums text-green-600">− {formatINR(invoice.paidAmount)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Balance Due</span><span className="text-destructive tabular-nums">{formatINR(invoice.balanceDue)}</span></div>
                </>
              )}
            </div>
          </div>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {invoice.notes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Terms & Conditions</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{invoice.terms}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Signature */}
          {tenant?.signature && (
            <div className="mt-8 flex justify-end">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">For {tenant.businessName}</p>
                <img src={`/api/tenant/file?name=${tenant.signature}`} alt="signature" className="h-16 object-contain" />
                <p className="text-xs text-muted-foreground mt-1">Authorized Signatory</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {docLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editForm) }} className="space-y-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={editForm.invoiceDate} onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Terms & Conditions</Label>
              <Textarea value={editForm.terms} onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })} rows={2} className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${map[status] || ""}`}>{status}</span>
}
