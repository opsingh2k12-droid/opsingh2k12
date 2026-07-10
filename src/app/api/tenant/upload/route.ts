import { NextRequest, NextResponse } from "next/server"
import { getTenantContext } from "@/lib/session"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx || ctx.role === "super_admin" || !ctx.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const type = (formData.get("type") as string) || "logo" // logo | signature

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use PNG, JPG, WebP, or SVG." }, { status: 400 })
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 400 })
    }

    // Create uploads directory (persistent, outside .next)
    const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), "uploads")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename: {tenantId}_{type}_{timestamp}.{ext}
    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    const filename = `${ctx.tenantId}_${type}_${Date.now()}.${ext}`
    const filepath = join(uploadDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    return NextResponse.json({ filename, type, url: `/api/tenant/file?name=${filename}` })
  } catch (e) {
    console.error("[upload]", e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
