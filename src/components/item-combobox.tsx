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
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 text-xs pl-7 pr-6"
        />
        <ChevronDown
          className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground cursor-pointer"
          onClick={() => setOpen(!open)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-border rounded-md shadow-lg">
          {filtered.map((item: any) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors ${itemId === item.id ? "bg-primary/10" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{item.name}</span>
                <span className="text-muted-foreground ml-2 flex-shrink-0">{formatINR(item.salePrice)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {item.hsn && `HSN: ${item.hsn} · `}Stock: {item.stockQty} · GST {item.gstRate}%
              </div>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && search && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-md shadow-lg px-3 py-2 text-xs text-muted-foreground">
          No items match. Custom name will be used: <span className="font-medium">"{search}"</span>
        </div>
      )}
    </div>
  )
}
