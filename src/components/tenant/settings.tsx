"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAppTheme, THEMES } from "@/lib/theme-context"
import { Building2, CreditCard, Palette, Bell, Database, Check, Lock, FileText, ImageIcon, LayoutTemplate } from "lucide-react"
import { useState } from "react"
import { formatINR, formatDate } from "@/lib/format"
import { toast } from "sonner"
import { ChangePasswordCard } from "@/components/change-password-card"
import { FileUpload } from "@/components/file-upload"
import { INVOICE_TEMPLATES, InvoiceTemplate } from "@/components/tenant/invoice-templates"

export function TenantSettings({ tenant: initialTenant }: { tenant: any }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"profile" | "invoice-settings" | "invoice-template" | "subscription" | "appearance" | "security">("profile")
  const { theme, setTheme } = useAppTheme()
  const sub = initialTenant.subscriptions?.[0]
  const plan = sub?.plan

  // Fetch fresh tenant data (includes logo, signature, etc.)
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: async () => (await fetch("/api/tenant/settings")).json(),
  })

  const [form, setForm] = useState<any>(null)

  // Initialize form when data loads
  if (data?.tenant && !form) {
    setForm({
      ...data.tenant,
      fiscalYearStartMonth: String(data.tenant.fiscalYearStartMonth || 4),
    })
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/tenant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] })
      queryClient.invalidateQueries({ queryKey: ["tenant-me"] })
      toast.success("Settings saved")
    },
    onError: () => toast.error("Failed to save"),
  })

  const handleSave = () => {
    saveMutation.mutate(form)
  }

  if (isLoading || !form) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading settings...</div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your business profile, invoice settings, subscription & appearance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        {/* Settings nav */}
        <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto">
          <SettingsTab active={tab === "profile"} onClick={() => setTab("profile")} icon={<Building2 className="w-4 h-4" />}>Business Profile</SettingsTab>
          <SettingsTab active={tab === "invoice-settings"} onClick={() => setTab("invoice-settings")} icon={<FileText className="w-4 h-4" />}>Invoice Settings</SettingsTab>
          <SettingsTab active={tab === "invoice-template"} onClick={() => setTab("invoice-template")} icon={<LayoutTemplate className="w-4 h-4" />}>Invoice Template</SettingsTab>
          <SettingsTab active={tab === "subscription"} onClick={() => setTab("subscription")} icon={<CreditCard className="w-4 h-4" />}>Subscription</SettingsTab>
          <SettingsTab active={tab === "appearance"} onClick={() => setTab("appearance")} icon={<Palette className="w-4 h-4" />}>Appearance & Theme</SettingsTab>
          <SettingsTab active={tab === "security"} onClick={() => setTab("security")} icon={<Lock className="w-4 h-4" />}>Security</SettingsTab>
        </div>

        <div>
          {/* ============ BUSINESS PROFILE ============ */}
          {tab === "profile" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-base">Business Profile</h3>
                  <p className="text-xs text-muted-foreground">This info appears on every invoice and estimate you generate.</p>
                </div>

                {/* Logo upload */}
                <FileUpload
                  type="logo"
                  label="Business Logo"
                  value={form.logo}
                  onChange={(filename) => setForm({ ...form, logo: filename })}
                  previewClass="w-28 h-28"
                />

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Business Name</Label>
                    <Input value={form.businessName || ""} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Legal Name</Label>
                    <Input value={form.legalName || ""} onChange={(e) => setForm({ ...form, legalName: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">GSTIN</Label>
                    <Input value={form.gstin || ""} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">PAN</Label>
                    <Input value={form.pan || ""} onChange={(e) => setForm({ ...form, pan: e.target.value })} className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Address</Label>
                    <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">State Code</Label>
                    <Input value={form.stateCode || ""} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Fiscal Year Start Month</Label>
                    <Select value={form.fiscalYearStartMonth} onValueChange={(v) => setForm({ ...form, fiscalYearStartMonth: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April (Indian FY default)</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  💡 Fiscal Year determines your financial year for reports. In India, it's April 1 to March 31 by default. Reports will use this to calculate yearly summaries.
                </p>

                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ============ INVOICE SETTINGS ============ */}
          {tab === "invoice-settings" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-base">Invoice & Estimate Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure prefixes, default terms, and signature for your invoices and estimates.</p>
                </div>

                {/* Prefixes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Invoice Prefix</Label>
                    <Input
                      value={form.invoicePrefix || ""}
                      onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                      placeholder="INV-"
                      className="mt-1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">e.g. INV- → INV-2026-0001</p>
                  </div>
                  <div>
                    <Label className="text-xs">Estimate Prefix</Label>
                    <Input
                      value={form.estimatePrefix || ""}
                      onChange={(e) => setForm({ ...form, estimatePrefix: e.target.value })}
                      placeholder="EST-"
                      className="mt-1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">e.g. EST- → EST-2026-0001</p>
                  </div>
                </div>

                <Separator />

                {/* Terms & Conditions */}
                <div>
                  <Label className="text-xs">Default Terms & Conditions</Label>
                  <Textarea
                    value={form.termsAndConditions || ""}
                    onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
                    placeholder="e.g. Payment due within 15 days. Interest @18% p.a. on delayed payments. Goods once sold will not be taken back."
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    This will be pre-filled when creating new invoices/estimates. You can edit per invoice.
                  </p>
                </div>

                <Separator />

                {/* Signature upload */}
                <FileUpload
                  type="signature"
                  label="Authorized Signature (appears on invoices)"
                  value={form.signature}
                  onChange={(filename) => setForm({ ...form, signature: filename })}
                  previewClass="w-40 h-20"
                />

                <Separator />

                {/* Bank Details */}
                <div>
                  <h4 className="font-semibold text-sm mb-1">Bank Details (shown on invoice)</h4>
                  <p className="text-xs text-muted-foreground mb-3">Customers can use these details to make payments.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Bank Name</Label>
                      <Input value={form.bankName || ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. State Bank of India" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Account Holder Name</Label>
                      <Input value={form.bankAccountName || ""} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} placeholder="e.g. Sharma Electronics" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Account Number</Label>
                      <Input value={form.bankAccountNumber || ""} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} placeholder="0000000000000" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">IFSC Code</Label>
                      <Input value={form.bankIfsc || ""} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })} placeholder="e.g. SBIN0001234" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Branch</Label>
                      <Input value={form.bankBranch || ""} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} placeholder="e.g. Bandra West" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">UPI ID (optional)</Label>
                      <Input value={form.bankUpi || ""} onChange={(e) => setForm({ ...form, bankUpi: e.target.value })} placeholder="e.g. sharma@upi" className="mt-1" />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Invoice Settings"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ============ INVOICE TEMPLATE ============ */}
          {tab === "invoice-template" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-base">Invoice Template</h3>
                  <p className="text-xs text-muted-foreground">Choose how your invoices and estimates look. Preview updates instantly.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {INVOICE_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setForm({ ...form, invoiceTemplate: t.id })}
                      className={`border-2 rounded-lg p-3 text-left transition-all hover:border-foreground/30 ${(form.invoiceTemplate || "modern") === t.id ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{t.name}</span>
                        {(form.invoiceTemplate || "modern") === t.id && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">{t.description}</p>
                      {/* Mini preview */}
                      <div className="border rounded bg-white p-1.5 text-[6px] leading-tight">
                        <div className="flex justify-between mb-1">
                          <div className="font-bold">{t.name}</div>
                          <div className="text-primary font-bold">INV</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="h-1 bg-muted rounded" style={{ width: "100%" }} />
                          <div className="h-1 bg-muted rounded" style={{ width: "80%" }} />
                          <div className="h-1 bg-muted rounded" style={{ width: "60%" }} />
                        </div>
                        <div className="flex justify-between mt-1 pt-1 border-t">
                          <span>Total</span>
                          <span className="font-bold text-primary">₹1,000</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <Separator />

                {/* Live preview */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Live Preview</h4>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <InvoiceTemplate
                      template={form.invoiceTemplate || "modern"}
                      invoice={{
                        invoiceNumber: "INV-2026-0001",
                        invoiceDate: new Date(),
                        supplyType: "intra",
                        type: "invoice",
                        status: "unpaid",
                        subtotal: 1000,
                        discountPct: 0,
                        discountAmount: 0,
                        taxableAmount: 1000,
                        cgst: 90,
                        sgst: 90,
                        igst: 0,
                        totalGst: 180,
                        grandTotal: 1180,
                        paidAmount: 0,
                        balanceDue: 1180,
                        notes: "Thank you for your business.",
                        terms: "Payment due within 15 days.",
                        items: [
                          { id: "1", name: "Sample Item", hsn: "8517", qty: 1, rate: 1000, gstRate: 18, gstType: "exclusive", amount: 1000 },
                        ],
                      }}
                      tenant={{
                        businessName: form.businessName || "Your Business",
                        legalName: form.legalName,
                        gstin: form.gstin,
                        address: form.address,
                        city: form.city,
                        state: form.state,
                        phone: form.phone,
                        email: form.email,
                        logo: form.logo,
                        signature: form.signature,
                        bankName: form.bankName,
                        bankAccountName: form.bankAccountName,
                        bankAccountNumber: form.bankAccountNumber,
                        bankIfsc: form.bankIfsc,
                        bankBranch: form.bankBranch,
                        bankUpi: form.bankUpi,
                      }}
                      party={{
                        name: "Sample Customer",
                        address: "123 Sample Street",
                        city: "Mumbai",
                        state: "Maharashtra",
                        phone: "+91 98765 43210",
                        gstin: "27ABCDE1234F1Z5",
                      }}
                    />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Template Choice"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ============ SUBSCRIPTION ============ */}
          {tab === "subscription" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-base">Subscription & Billing</h3>
                  <p className="text-xs text-muted-foreground">Your SaaS plan — billed by BillDesk Pro platform.</p>
                </div>

                <div className="border-2 border-primary bg-primary/5 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{plan?.name} Plan</span>
                      <Badge className="text-[10px] bg-primary/15 text-primary">Current</Badge>
                    </div>
                    <div className="text-lg font-bold mt-1">{formatINR(plan?.priceMonthly || 0)}<span className="text-xs text-muted-foreground font-normal">/month</span></div>
                    <div className="text-xs text-muted-foreground mt-1">{plan?.features ? JSON.parse(plan.features).join(" · ") : ""}</div>
                  </div>
                  <Button variant="outline" size="sm">Manage</Button>
                </div>

                {initialTenant.status === "trial" && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">⚠</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Trial {initialTenant.trialEndsAt && `ends in ${Math.ceil((new Date(initialTenant.trialEndsAt).getTime() - Date.now()) / 86400000)} days`}</div>
                      <div className="text-xs text-muted-foreground">Add a payment method to continue after trial</div>
                    </div>
                    <Button size="sm">Add Payment</Button>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billing History</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">{plan?.name} Plan — Monthly</div>
                        <div className="text-xs text-muted-foreground">Razorpay · {formatDate(sub?.currentPeriodEnd)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatINR(plan?.priceMonthly || 0)}</div>
                        <Badge variant="secondary" className="text-[10px]">Active</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============ APPEARANCE ============ */}
          {tab === "appearance" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-base">Appearance & Theme</h3>
                  <p className="text-xs text-muted-foreground">Pick a color theme for your dashboard. Changes apply instantly.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setTheme(t.name)}
                      className={`border-2 rounded-lg p-3 text-left transition-all hover:border-foreground/30 ${theme === t.name ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex gap-1 mb-2 h-10 rounded overflow-hidden">
                        {t.colors.map((c, i) => <div key={i} className="flex-1" style={{ background: c }} />)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.emoji} {t.label}</span>
                        {theme === t.name && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t.description}</div>
                    </button>
                  ))}
                </div>

                <Separator />

                <div className="p-3 bg-muted/40 rounded-lg border border-dashed border-border">
                  <div className="font-semibold text-sm mb-1">💡 Theme preferences</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    • Theme applies to your entire dashboard and reports.<br />
                    • Each user in your tenant can pick their own theme.<br />
                    • Theme is saved per device (localStorage).
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============ SECURITY ============ */}
          {tab === "security" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-base mb-1">Account Security</h3>
                  <p className="text-xs text-muted-foreground">Manage your login credentials and keep your account secure.</p>
                </CardContent>
              </Card>
              <ChangePasswordCard />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
