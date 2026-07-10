"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Boxes, Plus, Search, Pencil, Trash2, AlertTriangle, Package } from "lucide-react"
import { useState } from "react"
import { formatINR } from "@/lib/format"
import { toast } from "sonner"

export function TenantItems() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "low" | "out">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ name: "", sku: "", hsn: "", category: "", unit: "pcs", salePrice: "", purchasePrice: "", gstRate: "18", stockQty: "", reorderLevel: "10" })

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-items"],
    queryFn: async () => (await fetch("/api/tenant/items")).json(),
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = editItem ? "PUT" : "POST"
      const body = editItem ? { ...payload, id: editItem.id } : payload
      const res = await fetch("/api/tenant/items", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-items"] })
      queryClient.invalidateQueries({ queryKey: ["tenant-dashboard"] })
      toast.success(editItem ? "Item updated" : "Item added")
      setDialogOpen(false)
      setEditItem(null)
      setForm({ name: "", sku: "", hsn: "", category: "", unit: "pcs", salePrice: "", purchasePrice: "", gstRate: "18", stockQty: "", reorderLevel: "10" })
    },
    onError: () => toast.error("Failed to save"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await fetch(`/api/tenant/items?id=${id}`, { method: "DELETE" })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-items"] })
      toast.success("Item deleted")
    },
  })

  const openEdit = (item: any) => {
    setEditItem(item)
    setForm({
      name: item.name, sku: item.sku || "", hsn: item.hsn || "", category: item.category || "",
      unit: item.unit || "pcs", salePrice: String(item.salePrice), purchasePrice: String(item.purchasePrice || 0),
      gstRate: String(item.gstRate), stockQty: String(item.stockQty), reorderLevel: String(item.reorderLevel),
    })
    setDialogOpen(true)
  }

  const openNew = () => {
    setEditItem(null)
    setForm({ name: "", sku: "", hsn: "", category: "", unit: "pcs", salePrice: "", purchasePrice: "", gstRate: "18", stockQty: "", reorderLevel: "10" })
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  const items = (data?.items || []).filter((it: any) => {
    if (search && !it.name.toLowerCase().includes(search.toLowerCase()) && !it.sku?.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === "low" && it.stockQty > it.reorderLevel) return false
    if (filter === "out" && it.stockQty > 0) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="w-6 h-6 text-primary" /> Items & Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.items?.length || 0} items · {items.length} showing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-1.5"><Plus className="w-4 h-4" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mi Power Bank 20000mAh" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="MI-PB20K" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="hsn">HSN Code</Label>
                  <Input id="hsn" value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} placeholder="8507" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Electronics" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="ltr">Litre</SelectItem>
                      <SelectItem value="mtr">Metre</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="salePrice">Sale Price (₹) *</Label>
                  <Input id="salePrice" type="number" step="0.01" required value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price (₹)</Label>
                  <Input id="purchasePrice" type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="gstRate">GST Rate</Label>
                  <Select value={form.gstRate} onValueChange={(v) => setForm({ ...form, gstRate: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Nil rated)</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stockQty">Stock Quantity</Label>
                  <Input id="stockQty" type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="reorderLevel">Reorder Level</Label>
                  <Input id="reorderLevel" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editItem ? "Update Item" : "Add Item"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "low", "out"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
              {f === "all" ? "All" : f === "low" ? "Low Stock" : "Out of Stock"}
            </Button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Card key={i} className="animate-pulse h-40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item: any) => {
            const isOut = item.stockQty === 0
            const isLow = !isOut && item.stockQty <= item.reorderLevel
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                    {isOut ? (
                      <Badge variant="destructive" className="text-[10px]">OUT · {item.stockQty}</Badge>
                    ) : isLow ? (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100">LOW · {item.stockQty}</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">IN STOCK · {item.stockQty}</Badge>
                    )}
                  </div>
                  <div className="font-semibold text-sm mb-1 line-clamp-1">{item.name}</div>
                  <div className="text-xs text-muted-foreground mb-3">HSN: {item.hsn || "—"} · GST {item.gstRate}% · {item.category || "Uncategorized"}</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg tabular-nums">{formatINR(item.salePrice)}</div>
                      <div className="text-[10px] text-muted-foreground">Sale price · {item.unit}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate(item.id) }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {items.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <div className="font-medium">No items found</div>
                <div className="text-xs mt-1">Add your first item to start invoicing</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
