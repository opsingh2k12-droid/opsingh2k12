"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Check, X } from "lucide-react"
import { formatINR } from "@/lib/format"

export function AdminPlans() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => (await fetch("/api/admin/plans")).json(),
  })

  const plans = data?.plans || []
  const colors: Record<string, string> = {
    Free: "from-slate-500 to-slate-700",
    Starter: "from-blue-500 to-blue-700",
    Pro: "from-purple-500 to-purple-700",
    Enterprise: "from-amber-500 to-amber-700",
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Subscription Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage pricing & features offered to tenants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Card key={i} className="animate-pulse h-80" />)
        ) : plans.map((plan: any) => (
          <Card key={plan.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className={`h-1.5 -mx-5 -mt-5 mb-4 bg-gradient-to-r ${colors[plan.name] || "from-primary to-primary/70"} rounded-t-lg`} />
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-lg">{plan.name}</div>
                <Badge variant={plan.isActive ? "default" : "secondary"} className="text-[10px]">{plan.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mb-4">
                <span className="text-2xl font-bold">{formatINR(plan.priceMonthly)}</span>
                <span className="text-xs text-muted-foreground">/month</span>
                <span className="block text-xs text-muted-foreground">{formatINR(plan.priceYearly)}/year</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Invoices:</span>
                  <span className="font-medium">{plan.invoiceLimit === 0 ? "Unlimited" : plan.invoiceLimit + "/mo"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Users:</span>
                  <span className="font-medium">{plan.userLimit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Subscribers:</span>
                  <span className="font-medium">{plan.activeSubs}</span>
                </div>
              </div>
              <div className="border-t mt-4 pt-3">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Features</div>
                <ul className="space-y-1 text-xs">
                  {(plan.features || []).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Monthly Revenue</div>
                <div className="font-bold text-primary">{formatINR(plan.activeSubs * plan.priceMonthly)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
