"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export function ChangePasswordCard() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success("Password updated successfully!")
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setDone(true)
        setTimeout(() => setDone(false), 3000)
      } else {
        toast.error(data.error || "Failed to update password")
      }
    } catch {
      toast.error("Server error")
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="w-4 h-4" /> Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="currentPassword" className="text-xs">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              required
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              placeholder="Enter your current password"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="newPassword" className="text-xs">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              required
              minLength={6}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Min 6 characters"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="text-xs">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Re-enter new password"
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Updating...
              </>
            ) : done ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Updated!
              </>
            ) : (
              "Update Password"
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            💡 Use a strong password with at least 8 characters, including numbers and symbols.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
