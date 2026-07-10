import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get("name")

  if (!name || name.includes("..") || name.includes("/")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 })
  }

  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), "uploads")
  const filepath = join(uploadDir, name)

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  const buffer = await readFile(filepath)

  // Determine content type
  const ext = name.split(".").pop()?.toLowerCase()
  const contentTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml",
  }
  const contentType = contentTypes[ext || ""] || "application/octet-stream"

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
