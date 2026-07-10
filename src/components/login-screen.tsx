"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Receipt, Boxes, BarChart3, MessageCircle } from "lucide-react"
import { INDIAN_STATES } from "@/lib/indian-states"

export function LoginScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [signupData, setSignupData] = useState({ businessName: "", email: "", password: "", phone: "", gstin: "", city: "", state: "", stateCode: "" })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await signIn("credentials", { ...loginData, redirect: false })
    setLoading(false)
    console.log("[login] signIn result:", res)
    if (res?.error) {
      toast.error("Invalid credentials")
    } else {
      toast.success("Welcome back!")
      // Force full reload to ensure session cookie is applied
      setTimeout(() => window.location.reload(), 500)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Account created! Logging you in...")
        await signIn("credentials", { email: signupData.email, password: signupData.password, redirect: false })
        window.location.href = "/"
      } else {
        toast.error(data.error || "Signup failed")
      }
    } catch {
      toast.error("Server error")
    }
    setSignupLoading(false)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left marketing panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/70" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/kloudiotech-logo.png" alt="BillDesk Pro" className="w-12 h-12 rounded-lg object-contain bg-white/95 p-1" />
          <span className="text-2xl font-extrabold">BillDesk Pro</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold leading-tight mb-4">Run your business billing like a pro.</h1>
          <p className="text-lg opacity-90 max-w-md mb-8">
            Inventory, GST invoicing, parties, purchase &amp; reports — all in one place. Built for Indian businesses, ready in 2 minutes.
          </p>
          <div className="space-y-4">
            <Feature icon={<Receipt className="w-5 h-5" />} text="GST-compliant invoices with CGST/SGST/IGST auto-calc" />
            <Feature icon={<Boxes className="w-5 h-5" />} text="Real-time stock tracking with low-stock alerts" />
            <Feature icon={<BarChart3 className="w-5 h-5" />} text="GSTR-1 ready reports + sales/purchase summary" />
            <Feature icon={<MessageCircle className="w-5 h-5" />} text="WhatsApp & email invoices in one click" />
          </div>
        </div>

        <div className="relative z-10 text-sm opacity-80">
          Trusted by 5,000+ Indian businesses · ⭐ 4.8 on Google
        </div>

        <a
          href="https://kloudiotech.com"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-xs group"
        >
          <span>Developed by</span>
          <span className="font-bold text-white">KloudioTech</span>
          <svg className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 17L17 7M17 7H8M17 7V16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      {/* Right login/signup panel */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-6 sm:mb-8">
            <img src="/kloudiotech-logo.png" alt="BillDesk Pro" className="w-10 h-10 rounded-lg object-contain" />
            <span className="text-xl font-extrabold">BillDesk Pro</span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Start Free Trial</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Welcome back 👋</CardTitle>
                  <CardDescription>Log in to your billing dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" required value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} className="mt-1" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Continue
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Start your 14-day free trial</CardTitle>
                  <CardDescription>No credit card needed · Cancel anytime</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input id="businessName" required value={signupData.businessName} onChange={(e) => setSignupData({ ...signupData, businessName: e.target.value })} placeholder="e.g. Sharma Electronics" className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="gstin">GSTIN (optional)</Label>
                        <Input id="gstin" value={signupData.gstin} onChange={(e) => setSignupData({ ...signupData, gstin: e.target.value })} placeholder="27ABCDE1234F1Z5" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={signupData.phone} onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })} placeholder="+91 98765 43210" className="mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={signupData.city} onChange={(e) => setSignupData({ ...signupData, city: e.target.value })} placeholder="Mumbai" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Select
                          value={signupData.stateCode}
                          onValueChange={(v) => {
                            const stateName = INDIAN_STATES.find((s) => s.code === v)?.name || ""
                            setSignupData({ ...signupData, stateCode: v, state: stateName })
                          }}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select state..." /></SelectTrigger>
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
                    <div>
                      <Label htmlFor="signupEmail">Email</Label>
                      <Input id="signupEmail" type="email" required value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} placeholder="owner@business.in" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="signupPassword">Password</Label>
                      <Input id="signupPassword" type="password" required minLength={6} value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} placeholder="Min 6 characters" className="mt-1" />
                    </div>
                    <Button type="submit" className="w-full" disabled={signupLoading}>
                      {signupLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Account &amp; Start Trial
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <a
            href="https://kloudiotech.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span>Developed by</span>
            <span className="font-bold">KloudioTech</span>
            <svg className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H8M17 7V16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">{icon}</div>
      <span className="text-sm">{text}</span>
    </div>
  )
}
