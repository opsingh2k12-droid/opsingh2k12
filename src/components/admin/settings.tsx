"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Shield, Palette } from "lucide-react"
import { ChangePasswordCard } from "@/components/change-password-card"
import { useAppTheme, THEMES } from "@/lib/theme-context"
import { Check } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export function AdminSettings() {
  const { theme, setTheme } = useAppTheme()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your super admin account & platform appearance</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Super Admin Account</h3>
              <p className="text-xs text-muted-foreground">Highest privilege level — full platform access</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <ChangePasswordCard />

      <Separator />

      {/* Theme picker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" /> Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">Pick a color theme for the admin console.</p>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Security Tips
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5 ml-6 list-disc">
            <li>Change your password every 90 days</li>
            <li>Use a strong password with at least 12 characters, mixing letters, numbers, and symbols</li>
            <li>Never share your super admin credentials with anyone</li>
            <li>For daily operations, create separate tenant accounts (owner role) instead of using super admin</li>
            <li>Review tenant activity logs regularly for any suspicious behavior</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
