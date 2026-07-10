"use client"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Shield, LayoutDashboard, Building2, CreditCard, BarChart3, Settings, LogOut, Search, Bell, Menu, Palette, Receipt } from "lucide-react"
import { AdminDashboard } from "@/components/admin/dashboard"
import { AdminTenants } from "@/components/admin/tenants"
import { AdminRevenue } from "@/components/admin/revenue"
import { AdminPlans } from "@/components/admin/plans"
import { useAppTheme, THEMES, ThemeName } from "@/lib/theme-context"

export type AdminPage = "dashboard" | "tenants" | "revenue" | "plans" | "settings"

const navItems: { id: AdminPage; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "tenants", label: "Tenants", icon: <Building2 className="w-4 h-4" /> },
  { id: "revenue", label: "Revenue & Payments", icon: <CreditCard className="w-4 h-4" /> },
  { id: "plans", label: "Plans", icon: <BarChart3 className="w-4 h-4" /> },
]

export function AdminAppShell() {
  const { data: session } = useSession()
  const [page, setPage] = useState<AdminPage>("dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useAppTheme()

  const user = session?.user as any
  const initials = "AD"

  const navigate = (p: AdminPage) => {
    setPage(p)
    setMobileOpen(false)
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-4">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">B</div>
        <div>
          <div className="font-extrabold text-lg leading-tight">BillDesk Pro</div>
          <div className="text-[10px] text-muted-foreground">Admin Console</div>
        </div>
      </div>

      <div className="px-2 mb-3">
        <div className="p-3 rounded-lg bg-muted/60 border border-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold">Super Admin</div>
            <div className="text-[10px] text-muted-foreground">Platform Owner</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-2 py-2">Platform</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              page === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-2 py-2 mt-4">Account</div>
        <button onClick={() => signOut({ callbackUrl: "/", redirect: false }).then(() => window.location.href = "/")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        {SidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-border bg-background/80 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search tenants, payments..." className="pl-9 bg-muted/40 border-0" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Platform alerts</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-xs font-medium">⚠ Payment failed</span>
                  <span className="text-xs text-muted-foreground">Patel Wholesale — auto-renewal failed</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-xs font-medium">🎉 New signup</span>
                  <span className="text-xs text-muted-foreground">Gupta General Store joined trial</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Palette className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {THEMES.map((t) => (
                  <DropdownMenuItem key={t.name} onClick={() => setTheme(t.name)} className="gap-2 cursor-pointer">
                    <div className="flex gap-0.5">
                      {t.colors.slice(0, 2).map((c, i) => (
                        <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="flex-1">{t.emoji} {t.label}</span>
                    {theme === t.name && <span className="text-xs text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-xs text-left hidden sm:block">
                    <div className="font-semibold leading-tight">{user?.name}</div>
                    <div className="text-muted-foreground">Super Admin</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/", redirect: false }).then(() => window.location.href = "/")}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {page === "dashboard" && <AdminDashboard onNavigate={navigate} />}
          {page === "tenants" && <AdminTenants />}
          {page === "revenue" && <AdminRevenue />}
          {page === "plans" && <AdminPlans />}
          {page === "settings" && (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              Platform settings coming soon
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
