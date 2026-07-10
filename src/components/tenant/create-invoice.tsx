"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Save, FileDown, MessageCircle, Mail, Printer, UserPlus, PackagePlus } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { formatINR } from "@/lib/format"
import { toast } from "sonner"

interface InvoiceLine {
  itemId?: string
  name: string
  hsn: string
  qty: number
  rate: number
  gstRate: number
}

export function CreateInvoice({ onDone, docType = "invoice" }: { onDone: () => void; docType?: "invoice" | "estimate" }) {
  const queryClient = useQueryClient()
  const [partyId, setPartyId] = useState("")
  const [supplyType, setSupplyType] = useState<"intra" | "inter">("intra")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [discountPct, setDiscountPct] = useState(0)
  const [notes, setNotes] = useState("Thank you for your business. Goods once sold will not be taken back.")
  const [terms, setTerms] = useState("Payment due within 15 days. Interest @18% p.a. on delayed payments.")
  const [lines, setLines] = useState<InvoiceLine[]>([{ name: "", hsn: "", qty: 1, rate: 0, gstRate: 18 }])

  // Inline add dialogs
  const [showAddParty, setShowAddParty] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newParty, setNewParty] = useState({ name: "", phone: "", gstin: "", city: "", state: "Maharashtra", stateCode: "27" })
  const [newItem, setNewItem] = useState({ name: "", hsn: "", salePrice: "", gstRate: "18", stockQty: "0" })

  const { data: partiesData } = useQuery({ queryKey: ["tenant-parties"], queryFn: async () => (await fetch("/api/tenant/parties")).json() })
  const { data: itemsData } = useQuery({ queryKey: ["tenant-items"], queryFn: async () => (await fetch("/api/tenant/items")).json() })
  const { data: settingsData } = useQuery({ queryKey: ["tenant-settings"], queryFn: async () => (await fetch("/api/tenant/settings")).json() })

  // Pre-fill terms from tenant settings
  useEffect(() => {
    if (settingsData?.tenant?.termsAndConditions && terms === "Payment due within 15 days. Interest @18% p.a. on delayed payments.") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTerms(settingsData.tenant.termsAndConditions)
    }
  }, [settingsData])

  const customers = (partiesData?.parties || []).filter((p: any) => p.type !== "supplier")
  const items = itemsData?.items || []

  const selectedParty = customers.find((p: any) => p.id === partyId)

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/tenant/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`${docType === "estimate" ? "Estimate" : "Invoice"} ${data.invoice.invoiceNumber} created!`)
      onDone()
    },
    onError: () => toast.error(`Failed to create ${docType}`),
  })

  // Inline add party mutation
  const addPartyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/tenant/parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-parties"] })
      setPartyId(data.party.id)
      setShowAddParty(false)
      setNewParty({ name: "", phone: "", gstin: "", city: "", state: "Maharashtra", stateCode: "27" })
      toast.success("Party added and selected")
    },
    onError: () => toast.error("Failed to add party"),
  })

  // Inline add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/tenant/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-items"] })
      // Auto-select the new item in the first empty line
      const newLine = {
        itemId: data.item.id,
        name: data.item.name,
        hsn: data.item.hsn || "",
        qty: 1,
        rate: data.item.salePrice,
        gstRate: data.item.gstRate,
      }
      setLines((prev) => {
        const idx = prev.findIndex((l) => !l.name)
        if (idx >= 0) {
          return prev.map((l, i) => (i === idx ? newLine : l))
        }
        return [...prev, newLine]
      })
      setShowAddItem(false)
      setNewItem({ name: "", hsn: "", salePrice: "", gstRate: "18", stockQty: "0" })
      toast.success("Item added and added to invoice")
    },
    onError: () => toast.error("Failed to add item"),
  })

  const updateLine = (i: number, patch: Partial<InvoiceLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  const selectItem = (i: number, itemId: string) => {
    const item = items.find((it: any) => it.id === itemId)
    if (item) {
      updateLine(i, { itemId: item.id, name: item.name, hsn: item.hsn || "", rate: item.salePrice, gstRate: item.gstRate })
    }
  }

  const addLine = () => setLines([...lines, { name: "", hsn: "", qty: 1, rate: 0, gstRate: 18 }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const totals = useMemo(() => {
    const isInter = supplyType === "inter"
    let subtotal = 0
    let totalGst = 0
    let taxableAmount = 0
    for (const l of lines) {
      const amount = l.qty * l.rate
      subtotal += amount
      const lineDiscount = (amount * discountPct) / 100
      const taxable = amount - lineDiscount
      taxableAmount += taxable
      totalGst += (taxable * l.gstRate) / 100
    }
    const discountAmount = (subtotal * discountPct) / 100
    const cgst = isInter ? 0 : totalGst / 2
    const sgst = isInter ? 0 : totalGst / 2
    const igst = isInter ? totalGst : 0
    const grandTotal = taxableAmount + totalGst
    return { subtotal, discountAmount, taxableAmount, cgst, sgst, igst, totalGst, grandTotal }
  }, [lines, discountPct, supplyType])

  const totalQty = lines.reduce((s, l) => s + l.qty, 0)

  const handleSave = (status: string = "unpaid") => {
    if (!partyId) return toast.error("Select a customer")
    if (lines.length === 0 || lines.some((l) => !l.name || l.qty <= 0)) return toast.error("Add at least one valid item")
    createMutation.mutate({ partyId, supplyType, invoiceDate, discountPct, items: lines, notes, terms, status, type: docType })
  }

  const handleWhatsApp = () => {
    if (!selectedParty?.phone) return toast.error("No phone number on party")
    const msg = `Hello ${selectedParty.name}, your invoice for ${formatINR(totals.grandTotal)} is ready. Thank you for your business!`
    const phone = selectedParty.phone.replace(/[^0-9]/g, "")
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Create Sales Invoice</h1>
          <p className="text-sm text-muted-foreground mt-1">GST-compliant · CGST/SGST/IGST auto-calculated</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave("unpaid")} disabled={createMutation.isPending}>
            <Save className="w-4 h-4 mr-1.5" /> Save as Draft
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Invoice meta */}
          <Card>
            <CardContent className="p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Invoice No.</Label>
                <Input value="Auto-generated" disabled className="mt-1 text-xs bg-muted/40" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Supply Type</Label>
                <Select value={supplyType} onValueChange={(v) => setSupplyType(v as any)}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intra">Intra-state (CGST+SGST)</SelectItem>
                    <SelectItem value="inter">Inter-state (IGST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Discount %</Label>
                <Input type="number" min="0" max="100" value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} className="mt-1 text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Label>Bill To (Customer)</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowAddParty(true)}>
                  <UserPlus className="w-3 h-3" /> New Party
                </Button>
              </div>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>
                  {customers.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} {p.gstin ? `· ${p.gstin}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedParty && (
                <div className="mt-2 text-xs text-muted-foreground grid grid-cols-2 gap-2">
                  <div>📞 {selectedParty.phone || "—"}</div>
                  <div>📍 {selectedParty.city || "—"}, {selectedParty.state || "—"}</div>
                  <div>🏛 GSTIN: {selectedParty.gstin || "Unregistered"}</div>
                  <div>💰 Balance: {formatINR(selectedParty.currentBalance)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items table */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base">Items</CardTitle>
              <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowAddItem(true)}>
                <PackagePlus className="w-3 h-3" /> New Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase">Item</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase w-20">HSN</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase w-16">Qty</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase w-24">Rate</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase w-24">GST</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase w-28">Amount</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => {
                      const amount = line.qty * line.rate
                      return (
                        <tr key={i} className="border-t hover:bg-muted/20">
                          <td className="p-2">
                            <Select value={line.itemId || ""} onValueChange={(v) => selectItem(i, v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select item..." /></SelectTrigger>
                              <SelectContent>
                                {items.map((it: any) => (
                                  <SelectItem key={it.id} value={it.id}>{it.name} · {formatINR(it.salePrice)} · Stock: {it.stockQty}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input value={line.name} onChange={(e) => updateLine(i, { name: e.target.value })} placeholder="Or type custom name" className="mt-1 h-7 text-xs" />
                          </td>
                          <td className="p-2"><Input value={line.hsn} onChange={(e) => updateLine(i, { hsn: e.target.value })} className="h-8 text-xs" /></td>
                          <td className="p-2"><Input type="number" min="1" step="0.01" value={line.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} className="h-8 text-xs text-right" /></td>
                          <td className="p-2"><Input type="number" step="0.01" value={line.rate} onChange={(e) => updateLine(i, { rate: Number(e.target.value) })} className="h-8 text-xs text-right" /></td>
                          <td className="p-2">
                            <Select value={String(line.gstRate)} onValueChange={(v) => updateLine(i, { gstRate: Number(v) })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                                <SelectItem value="28">28%</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-right font-semibold tabular-nums">{formatINR(amount)}</td>
                          <td className="p-2">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-2">
                <Button variant="outline" size="sm" onClick={addLine} className="w-full border-dashed text-primary">
                  <Plus className="w-3 h-3 mr-1.5" /> Add Another Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes & terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <Label className="text-xs">Notes (visible on invoice)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 text-xs" rows={2} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Label className="text-xs">Terms & Conditions</Label>
                <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1 text-xs" rows={2} />
              </CardContent>
            </Card>
          </div>

          {/* Totals */}
          <Card>
            <CardContent className="p-4 bg-muted/30">
              <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold tabular-nums">{formatINR(totals.subtotal)}</span></div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount ({discountPct}%)</span><span className="font-semibold text-destructive tabular-nums">− {formatINR(totals.discountAmount)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span className="font-semibold tabular-nums">{formatINR(totals.taxableAmount)}</span></div>
                {supplyType === "intra" ? (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="tabular-nums">{formatINR(totals.cgst)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="tabular-nums">{formatINR(totals.sgst)}</span></div>
                  </>
                ) : (
                  <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="tabular-nums">{formatINR(totals.igst)}</span></div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold"><span>Total Payable</span><span className="tabular-nums text-primary">{formatINR(totals.grandTotal)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-20">
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Total Invoice Value</div>
                <div className="text-2xl font-bold text-primary tabular-nums">{formatINR(totals.grandTotal)}</div>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground">Items Count</div>
                <div className="text-sm font-semibold">{lines.length} items · {totalQty} qty</div>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground mb-1">GST Breakdown</div>
                <div className="text-xs space-y-1">
                  {supplyType === "intra" ? (
                    <>
                      <div className="flex justify-between"><span>CGST</span><span className="tabular-nums">{formatINR(totals.cgst)}</span></div>
                      <div className="flex justify-between"><span>SGST</span><span className="tabular-nums">{formatINR(totals.sgst)}</span></div>
                    </>
                  ) : (
                    <div className="flex justify-between"><span>IGST</span><span className="tabular-nums">{formatINR(totals.igst)}</span></div>
                  )}
                  <div className="flex justify-between font-semibold"><span>Total GST</span><span className="tabular-nums">{formatINR(totals.totalGst)}</span></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Button className="w-full" onClick={() => handleSave("unpaid")} disabled={createMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Save & Generate {docType === "estimate" ? "Estimate" : "Invoice"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast.info("PDF will be available after saving")}>
                  <FileDown className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button variant="outline" className="w-full bg-[#25D366] text-white hover:bg-[#1FB855] hover:text-white border-0" onClick={handleWhatsApp}>
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast.info("Email coming soon")}>
                  <Mail className="w-4 h-4 mr-2" /> Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inline Add Party Dialog */}
      <Dialog open={showAddParty} onOpenChange={setShowAddParty}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Party</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addPartyMutation.mutate({ ...newParty, type: "customer", openingBalance: 0 }) }} className="space-y-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input required value={newParty.name} onChange={(e) => setNewParty({ ...newParty, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={newParty.phone} onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">GSTIN</Label>
                <Input value={newParty.gstin} onChange={(e) => setNewParty({ ...newParty, gstin: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={newParty.city} onChange={(e) => setNewParty({ ...newParty, city: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">State Code</Label>
                <Input value={newParty.stateCode} onChange={(e) => setNewParty({ ...newParty, stateCode: e.target.value })} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddParty(false)}>Cancel</Button>
              <Button type="submit" disabled={addPartyMutation.isPending}>
                {addPartyMutation.isPending ? "Adding..." : "Add & Select"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inline Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addItemMutation.mutate({ ...newItem, unit: "pcs", purchasePrice: 0, reorderLevel: 10 }) }} className="space-y-3">
            <div>
              <Label className="text-xs">Item Name *</Label>
              <Input required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">HSN Code</Label>
                <Input value={newItem.hsn} onChange={(e) => setNewItem({ ...newItem, hsn: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Sale Price (₹) *</Label>
                <Input type="number" step="0.01" required value={newItem.salePrice} onChange={(e) => setNewItem({ ...newItem, salePrice: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">GST Rate</Label>
                <Select value={newItem.gstRate} onValueChange={(v) => setNewItem({ ...newItem, gstRate: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Stock Qty</Label>
                <Input type="number" value={newItem.stockQty} onChange={(e) => setNewItem({ ...newItem, stockQty: e.target.value })} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
              <Button type="submit" disabled={addItemMutation.isPending}>
                {addItemMutation.isPending ? "Adding..." : "Add to Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
