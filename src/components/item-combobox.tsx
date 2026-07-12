"use client"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { formatINR } from "@/lib/format"
import { Search, ChevronDown } from "lucide-react"

interface ItemComboboxProps {
  items: any[]
  value: string
  itemId?: string
  onSelect: (item: any) => void
  onType: (name: string) => void
  placeholder?: string
}

export function ItemCombobox({ items, value, itemId, onSelect, onType, placeholder = "Search or type item name..." }: ItemComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync external value changes
  useEffect(() => {
    setSearch(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter items based on search
  const filtered = items.filter((it: any) =>
    it.name.toLowerCase().includes(search.toLowerCase()) ||
    it.sku?.toLowerCase().includes(search.toLowerCase()) ||
    it.hsn?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (item: any) => {
    onSelect(item)
    setSearch(item.name)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    onType(e.target.value)
    if (!open) setOpen(true)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 text-xs pl-7 pr-6 relative"
        />
        <ChevronDown
          className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground cursor-pointer z-10"
          onClick={() => setOpen(!open)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-60 min-w-[300px] overflow-y-auto bg-white border border-border rounded-md shadow-xl"
          style={{ width: "max-content", maxWidth: "380px" }}
        >
          {filtered.map((item: any) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors border-b border-border last:border-0 ${itemId === item.id ? "bg-primary/10" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate flex-1">{item.name}</span>
                <span className="text-muted-foreground flex-shrink-0">{formatINR(item.salePrice)}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                {item.hsn && <span>HSN: <span className="font-medium text-foreground">{item.hsn}</span></span>}
                <span>Stock: <span className="font-medium text-foreground">{item.stockQty}</span></span>
                <span>GST: <span className="font-medium text-foreground">{item.gstRate}%</span></span>
                <span className="ml-auto capitalize">{item.gstType || "exclusive"}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && search && (
        <div
          className="absolute z-50 mt-1 min-w-[300px] bg-white border border-border rounded-md shadow-xl px-3 py-2 text-xs text-muted-foreground"
          style={{ width: "max-content", maxWidth: "380px" }}
        >
          No items match. Custom name will be used: <span className="font-medium">"{search}"</span>
        </div>
      )}
    </div>
  )
}
