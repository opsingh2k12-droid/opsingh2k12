export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0"
  // Indian number format
  const num = Math.round(amount)
  const isNegative = num < 0
  const absNum = Math.abs(num)
  const str = absNum.toString()
  let lastThree = str.slice(-3)
  let otherNumbers = str.slice(0, -3)
  if (otherNumbers !== "") lastThree = "," + lastThree
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree
  return (isNegative ? "-" : "") + "₹" + formatted
}

export function formatINRDecimal(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0.00"
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(d)
}

export function daysBetween(date1: Date | string, date2: Date | string = new Date()): number {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1
  const d2 = typeof date2 === "string" ? new Date(date2) : date2
  return Math.ceil((d1.getTime() - d2.getTime()) / 86400000)
}
