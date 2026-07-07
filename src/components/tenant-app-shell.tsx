"use client"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Receipt, LayoutDashboard, FileText, Plus, Boxes, Users, ShoppingCart, BarChart3, Settings, LogOut, Search, Bell, Menu, Palette } from "lucide-react"
import { TenantDashboard } from "@/components/tenant/dashboard"
import { TenantItems } from "@/components/tenant/items"
import { TenantParties } from "@/components/tenant/parties"
import { CreateInvoice } from "@/components/tenant/create-invoice"
import { InvoicesList } from "@/components/tenant/invoices-list"
import { PurchasesList } from "@/components/tenant/purchases"
import { TenantReports } from "@/components/tenant/reports"
import { TenantSettings } from "@/components/tenant/settings"
import { useAppTheme, THEMES, ThemeName } from "@/lib/theme-context"

export type TenantPage = "dashboard" | "items" | "parties" | "create-invoice" | "invoices" | "purchases" | "reports" | "settings"

const navItems: { id: TenantPage; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "invoices", label: "Sales / Invoices", icon: <FileText className="w-4 h-4" /> },
  { id: "create-invoice", label: "New Invoice", icon: <Plus className="w-4 h-4" /> },
  { id: "items", label: "Items / Inventory", icon: <Boxes className="w-4 h-4" /> },
  { id: "parties", label: "Parties", icon: <Users className="w-4 h-4" /> },
  { id: "purchases", label: "Purchase", icon: <ShoppingCart className="w-4 h-4" /> },
  { id: "reports", label: "Reports", icon: <BarChart3 className="w-4 h-4" /> },
]

export function TenantAppShell({ tenant }: { tenant: any }) {
  const { data: session } = useSession()
  const [page, setPage] = useState<TenantPage>("dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useAppTheme()

  const user = session?.user as any
  const initials = (user?.name || "U").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  const tenantInitials = tenant.businessName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  const sub = tenant.subscriptions?.[0]
  const planName = sub?.plan?.name || "Free"

  const navigate = (p: TenantPage) => {
    setPage(p)
    setMobileOpen(false)
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-4">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">B</div>
        <span className="font-extrabold text-lg">BillDesk Pro</span>
      </div>

      <div className="px-2 mb-3">
        <div className="p-3 rounded-lg bg-muted/60 border border-border flex items-center gap-2.5">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{tenantInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{tenant.businessName}</div>
            <div className="text-[10px] text-muted-foreground">{planName} Plan · {tenant.status === "trial" ? "Trial" : tenant.status}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-2 py-2">Main</div>
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
            {item.id === "invoices" && <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">3</Badge>}
          </button>
        ))}

        <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-2 py-2 mt-4">Account</div>
        <button
          onClick={() => navigate("settings")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            page === "settings" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/", redirect: false }).then(() => window.location.href = "/")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar sidebar-gradient">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-border bg-background/80 backdrop-blur">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoices, parties, items..." className="pl-9 bg-muted/40 border-0" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button onClick={() => navigate("create-invoice")} className="gap-1.5 h-9">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Invoice</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-xs font-medium">⚠ Low stock alert</span>
                  <span className="text-xs text-muted-foreground">3 items need restocking</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                  <span className="text-xs font-medium">💰 Payment received</span>
                  <span className="text-xs text-muted-foreground">₹28,450 from Verma Traders</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeSwitcher current={theme} onChange={setTheme} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-xs text-left hidden sm:block">
                    <div className="font-semibold leading-tight">{user?.name}</div>
                    <div className="text-muted-foreground capitalize">{user?.role}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("settings")}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/", redirect: false }).then(() => window.location.href = "/")}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {page === "dashboard" && <TenantDashboard onNavigate={navigate} />}
          {page === "items" && <TenantItems />}
          {page === "parties" && <TenantParties />}
          {page === "create-invoice" && <CreateInvoice onDone={() => navigate("invoices")} />}
          {page === "invoices" && <InvoicesList onNew={() => navigate("create-invoice")} />}
          {page === "purchases" && <PurchasesList />}
          {page === "reports" && <TenantReports />}
          {page === "settings" && <TenantSettings tenant={tenant} />}
        </main>
      </div>
    </div>
  )
}

function ThemeSwitcher({ current, onChange }: { current: ThemeName; onChange: (t: ThemeName) => void }) {
  return (
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
          <DropdownMenuItem key={t.name} onClick={() => onChange(t.name)} className="gap-2 cursor-pointer">
            <div className="flex gap-0.5">
              {t.colors.slice(0, 2).map((c, i) => (
                <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span className="flex-1">{t.emoji} {t.label}</span>
            {current === t.name && <span className="text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
