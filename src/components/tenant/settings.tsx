"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAppTheme, THEMES } from "@/lib/theme-context"
import { Building2, CreditCard, Palette, Bell, Database, Check, Lock } from "lucide-react"
import { useState } from "react"
import { formatINR, formatDate } from "@/lib/format"
import { toast } from "sonner"
import { ChangePasswordCard } from "@/components/change-password-card"

export function TenantSettings({ tenant }: { tenant: any }) {
  const [tab, setTab] = useState<"profile" | "subscription" | "appearance" | "security">("profile")
  const { theme, setTheme } = useAppTheme()
  const sub = tenant.subscriptions?.[0]
  const plan = sub?.plan

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your business profile, GST, subscription & appearance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        {/* Settings nav */}
        <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto">
          <SettingsTab active={tab === "profile"} onClick={() => setTab("profile")} icon={<Building2 className="w-4 h-4" />}>Business Profile</SettingsTab>
          <SettingsTab active={tab === "subscription"} onClick={() => setTab("subscription")} icon={<CreditCard className="w-4 h-4" />}>Subscription</SettingsTab>
          <SettingsTab active={tab === "appearance"} onClick={() => setTab("appearance")} icon={<Palette className="w-4 h-4" />}>Appearance & Theme</SettingsTab>
          <SettingsTab active={tab === "security"} onClick={() => setTab("security")} icon={<Lock className="w-4 h-4" />}>Security</SettingsTab>
        </div>

        <div>
          {tab === "profile" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-base">Business Profile</h3>
                  <p className="text-xs text-muted-foreground">This info appears on every invoice you generate.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Business Name</Label>
                    <Input defaultValue={tenant.businessName} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Legal Name</Label>
                    <Input defaultValue={tenant.legalName || ""} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">GSTIN</Label>
                    <Input defaultValue={tenant.gstin || ""} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">PAN</Label>
                    <Input defaultValue={tenant.pan || ""} className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Address</Label>
                    <Input defaultValue={tenant.address || ""} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input defaultValue={tenant.phone || ""} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input defaultValue={tenant.email || ""} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input defaultValue={tenant.city || ""} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">State Code</Label>
                    <Input defaultValue={tenant.stateCode || ""} className="mt-1" />
                  </div>
                </div>
                <Button onClick={() => toast.success("Profile saved (demo)")}>Save Changes</Button>
              </CardContent>
            </Card>
          )}

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

                {tenant.status === "trial" && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">⚠</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Trial {tenant.trialEndsAt && `ends in ${Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000)} days`}</div>
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
