"use client"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface FileUploadProps {
  type: "logo" | "signature"
  value?: string | null
  onChange: (filename: string | null) => void
  label: string
  previewClass?: string
}

export function FileUpload({ type, value, onChange, label, previewClass = "w-24 h-24" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value ? `/api/tenant/file?name=${value}` : null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      const res = await fetch("/api/tenant/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (res.ok) {
        onChange(data.filename)
        setPreview(`/api/tenant/file?name=${data.filename}`)
        toast.success(`${label} uploaded`)
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Upload failed")
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemove = () => {
    onChange(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt={label}
              className={`${previewClass} rounded-lg border border-border object-contain bg-white p-1`}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className={`${previewClass} rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30`}>
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          <span className="text-[10px] text-muted-foreground">PNG, JPG, WebP, SVG · Max 2MB</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    </div>
  )
}
