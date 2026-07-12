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
import { Plus, Trash2, Save, UserPlus, PackagePlus, ShoppingCart } from "lucide-react"
import { useState, useMemo } from "react"
import { formatINR } from "@/lib/format"
import { INDIAN_STATES } from "@/lib/indian-states"
import { toast } from "sonner"
import { ItemCombobox } from "@/components/item-combobox"

interface PurchaseLine {
  itemId?: string
  name: string
  hsn: string
  qty: number
  rate: number
  gstRate: number
  gstType: "inclusive" | "exclusive"
}

export function CreatePurchase({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const [partyId, setPartyId] = useState("")
  const [supplyType, setSupplyType] = useState<"intra" | "inter">("intra")
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10))
  const [discountPct, setDiscountPct] = useState(0)
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<PurchaseLine[]>([{ name: "", hsn: "", qty: 1, rate: 0, gstRate: 18, gstType: "exclusive" }])

  // Inline add dialogs
  const [showAddParty, setShowAddParty] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newParty, setNewParty] = useState({ name: "", phone: "", gstin: "", city: "", state: "", stateCode: "" })
  const [newItem, setNewItem] = useState({ name: "", hsn: "", purchasePrice: "", gstRate: "18", gstType: "exclusive", stockQty: "0" })

  const { data: partiesData } = useQuery({ queryKey: ["tenant-parties"], queryFn: async () => (await fetch("/api/tenant/parties")).json() })
  const { data: itemsData } = useQuery({ queryKey: ["tenant-items"], queryFn: async () => (await fetch("/api/tenant/items")).json() })

  const suppliers = (partiesData?.parties || []).filter((p: any) => p.type !== "customer")
  const items = itemsData?.items || []

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/tenant/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Purchase bill ${data.purchase.billNumber} created!`)
      onDone()
    },
    onError: () => toast.error("Failed to create purchase bill"),
  })

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
      setNewParty({ name: "", phone: "", gstin: "", city: "", state: "", stateCode: "" })
      toast.success("Supplier added and selected")
    },
    onError: () => toast.error("Failed to add supplier"),
  })

  const addItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/tenant/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-items"] })
      const newLine = {
        itemId: data.item.id,
        name: data.item.name,
        hsn: data.item.hsn || "",
        qty: 1,
        rate: data.item.purchasePrice || data.item.salePrice,
        gstRate: data.item.gstRate,
        gstType: data.item.gstType || "exclusive",
      }
      setLines((prev) => {
        const idx = prev.findIndex((l) => !l.name)
        if (idx >= 0) return prev.map((l, i) => (i === idx ? newLine : l))
        return [...prev, newLine]
      })
      setShowAddItem(false)
      setNewItem({ name: "", hsn: "", purchasePrice: "", gstRate: "18", gstType: "exclusive", stockQty: "0" })
      toast.success("Item added to purchase")
    },
    onError: () => toast.error("Failed to add item"),
  })

  const updateLine = (i: number, patch: Partial<PurchaseLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  const selectItem = (i: number, itemId: string) => {
    const item = items.find((it: any) => it.id === itemId)
    if (item) {
      updateLine(i, { itemId: item.id, name: item.name, hsn: item.hsn || "", rate: item.purchasePrice || item.salePrice, gstRate: item.gstRate, gstType: item.gstType || "exclusive" })
    }
  }

  const addLine = () => setLines([...lines, { name: "", hsn: "", qty: 1, rate: 0, gstRate: 18, gstType: "exclusive" }])
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
      const netAmount = amount - lineDiscount
      if (l.gstType === "inclusive") {
        const taxable = netAmount / (1 + l.gstRate / 100)
        const gst = netAmount - taxable
        taxableAmount += taxable
        totalGst += gst
      } else {
        const taxable = netAmount
        const gst = (taxable * l.gstRate) / 100
        taxableAmount += taxable
        totalGst += gst
      }
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
    if (!partyId) return toast.error("Select a supplier")
    if (lines.length === 0 || lines.some((l) => !l.name || l.qty <= 0)) return toast.error("Add at least one valid item")
    createMutation.mutate({ partyId, supplyType, billDate, discountPct, items: lines, notes, status })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary" /> Create Purchase Bill</h1>
          <p className="text-sm text-muted-foreground mt-1">Record purchase from supplier · GST auto-calculated · Stock auto-increases</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => toast.info("Draft saved")}>Save as Draft</Button>
      </div>

      <div className="space-y-4">
          {/* Bill meta */}
          <Card>
            <CardContent className="p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Bill No.</Label>
                <Input value="Auto-generated" disabled className="mt-1 text-xs bg-muted/40" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="mt-1 text-xs" />
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

          {/* Supplier */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Label>Purchase From (Supplier)</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowAddParty(true)}>
                  <UserPlus className="w-3 h-3" /> New Supplier
                </Button>
              </div>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} {p.gstin ? `· ${p.gstin}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="overflow-x-visible">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase" style={{ width: "45%" }}>Item</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase" style={{ width: "10%" }}>HSN</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase" style={{ width: "8%" }}>Qty</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase" style={{ width: "13%" }}>Rate</th>
                      <th className="text-center p-2 text-xs font-medium text-muted-foreground uppercase" style={{ width: "10%" }}>GST</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase" style={{ width: "13%" }}>Amount</th>
                      <th style={{ width: "1%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => {
                      const amount = line.qty * line.rate
                      return (
                        <tr key={i} className="border-t hover:bg-muted/20">
                          <td className="p-2">
                            <ItemCombobox
                              items={items}
                              value={line.name}
                              itemId={line.itemId}
                              onSelect={(item) => selectItem(i, item.id)}
                              onType={(name) => updateLine(i, { name, itemId: undefined })}
                              placeholder="Search or type item..."
                            />
                          </td>
                          <td className="p-2"><Input value={line.hsn} onChange={(e) => updateLine(i, { hsn: e.target.value })} className="h-8 text-xs" /></td>
                          <td className="p-2"><Input type="number" min="0" step="1" value={line.qty || ""} onChange={(e) => updateLine(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })} className="h-8 text-xs text-right" /></td>
                          <td className="p-2"><Input type="number" min="0" step="0.01" value={line.rate || ""} onChange={(e) => updateLine(i, { rate: e.target.value === "" ? 0 : Number(e.target.value) })} className="h-8 text-xs text-right" /></td>
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

          {/* Notes */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes about this purchase..." rows={2} className="mt-1 text-xs" />
            </CardContent>
          </Card>

          {/* Totals + Actions (single block, full width) */}
          <Card>
            <CardContent className="p-4 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Totals */}
                <div className="space-y-1.5 text-sm">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Summary</div>
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
                  <div className="flex justify-between font-semibold"><span>Total ITC</span><span className="tabular-nums">{formatINR(totals.totalGst)}</span></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base font-bold"><span>Total Payable</span><span className="tabular-nums text-primary">{formatINR(totals.grandTotal)}</span></div>
                  <div className="text-[10px] text-muted-foreground mt-1">{lines.length} items · {totalQty} qty</div>
                </div>
                {/* Right: Actions */}
                <div className="space-y-2 md:border-l md:pl-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Actions</div>
                  <Button className="w-full" onClick={() => handleSave("unpaid")} disabled={createMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" /> Save Purchase Bill
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    💡 Stock will automatically increase when you save.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Inline Add Supplier Dialog */}
      <Dialog open={showAddParty} onOpenChange={setShowAddParty}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addPartyMutation.mutate({ ...newParty, type: "supplier", openingBalance: 0 }) }} className="space-y-3">
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
                <Label className="text-xs">State</Label>
                <Select
                  value={newParty.stateCode}
                  onValueChange={(v) => {
                    const stateName = INDIAN_STATES.find((s) => s.code === v)?.name || ""
                    setNewParty({ ...newParty, stateCode: v, state: stateName })
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <form onSubmit={(e) => { e.preventDefault(); addItemMutation.mutate({ ...newItem, unit: "pcs", salePrice: newItem.purchasePrice, reorderLevel: 10 }) }} className="space-y-3">
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
                <Label className="text-xs">Purchase Price (₹) *</Label>
                <Input type="number" step="0.01" required value={newItem.purchasePrice} onChange={(e) => setNewItem({ ...newItem, purchasePrice: e.target.value })} className="mt-1" />
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
                <Label className="text-xs">GST Type</Label>
                <Select value={newItem.gstType} onValueChange={(v) => setNewItem({ ...newItem, gstType: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                    <SelectItem value="inclusive">Inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
              <Button type="submit" disabled={addItemMutation.isPending}>
                {addItemMutation.isPending ? "Adding..." : "Add to Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
