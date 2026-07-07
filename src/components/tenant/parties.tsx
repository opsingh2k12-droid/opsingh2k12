"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Search, Pencil, Trash2, UserCircle } from "lucide-react"
import { useState } from "react"
import { formatINR } from "@/lib/format"
import { toast } from "sonner"

export function TenantParties() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "customer" | "supplier">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editParty, setEditParty] = useState<any>(null)
  const [form, setForm] = useState({ name: "", type: "customer", gstin: "", phone: "", email: "", address: "", city: "", state: "Maharashtra", stateCode: "27", openingBalance: "0" })

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-parties"],
    queryFn: async () => (await fetch("/api/tenant/parties")).json(),
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = editParty ? "PUT" : "POST"
      const body = editParty ? { ...payload, id: editParty.id } : payload
      const res = await fetch("/api/tenant/parties", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-parties"] })
      toast.success(editParty ? "Party updated" : "Party added")
      setDialogOpen(false)
      setEditParty(null)
      setForm({ name: "", type: "customer", gstin: "", phone: "", email: "", address: "", city: "", state: "Maharashtra", stateCode: "27", openingBalance: "0" })
    },
    onError: () => toast.error("Failed to save"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await fetch(`/api/tenant/parties?id=${id}`, { method: "DELETE" })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-parties"] })
      toast.success("Party deleted")
    },
  })

  const openEdit = (p: any) => {
    setEditParty(p)
    setForm({
      name: p.name, type: p.type, gstin: p.gstin || "", phone: p.phone || "", email: p.email || "",
      address: p.address || "", city: p.city || "", state: p.state || "Maharashtra", stateCode: p.stateCode || "27",
      openingBalance: String(p.openingBalance || 0),
    })
    setDialogOpen(true)
  }

  const openNew = () => {
    setEditParty(null)
    setForm({ name: "", type: "customer", gstin: "", phone: "", email: "", address: "", city: "", state: "Maharashtra", stateCode: "27", openingBalance: "0" })
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  const parties = (data?.parties || []).filter((p: any) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.gstin?.toLowerCase().includes(search.toLowerCase()) && !p.phone?.includes(search)) return false
    if (filter === "customer" && p.type === "supplier") return false
    if (filter === "supplier" && p.type === "customer") return false
    return true
  })

  const customers = parties.filter((p: any) => p.type !== "supplier")
  const suppliers = parties.filter((p: any) => p.type !== "customer")
  const totalReceivable = customers.reduce((s: number, p: any) => s + Math.max(0, p.currentBalance), 0)
  const totalPayable = suppliers.reduce((s: number, p: any) => s + Math.max(0, -p.currentBalance), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Parties</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.parties?.length || 0} parties · Receivable: {formatINR(totalReceivable)} · Payable: {formatINR(totalPayable)}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-1.5"><Plus className="w-4 h-4" /> Add Party</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editParty ? "Edit Party" : "Add New Party"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input id="gstin" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="stateCode">State Code</Label>
                  <Input id="stateCode" value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="openingBalance">Opening Balance (₹) — positive = receivable, negative = payable</Label>
                  <Input id="openingBalance" type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} className="mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editParty ? "Update Party" : "Add Party"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search parties..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "customer", "supplier"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PartyCard title="Customers — Receivables" parties={customers} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} isLoading={isLoading} />
        <PartyCard title="Suppliers — Payables" parties={suppliers} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} isLoading={isLoading} />
      </div>
    </div>
  )
}

function PartyCard({ title, parties, onEdit, onDelete, isLoading }: { title: string; parties: any[]; onEdit: (p: any) => void; onDelete: (id: string) => void; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />)}</div>
        ) : parties.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No parties yet</div>
        ) : (
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {parties.map((p) => (
              <div key={p.id} className="p-3 flex items-center gap-3 hover:bg-muted/30">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.gstin ? `GSTIN: ${p.gstin} · ` : ""}{p.city || "—"}{p.phone ? ` · ${p.phone}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold tabular-nums text-sm ${p.currentBalance > 0 ? "text-destructive" : p.currentBalance < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    {formatINR(Math.abs(p.currentBalance))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {p.currentBalance > 0 ? "Receivable" : p.currentBalance < 0 ? "Payable" : "Cleared"}
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(p)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this party?")) onDelete(p.id) }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
