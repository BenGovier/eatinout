import { randomUUID } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"
import { LogoValidationError, MAX_LOGO_BYTES, processBrandLogo } from "@/lib/national/image-processing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BRAND_COLUMNS =
  "id, name, slug, description, logo_url, website_url, affiliate_network, status, created_at, updated_at"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }
const MAX_ID_LENGTH = 200
// Allows for multipart boundaries and headers around a maximum-size file.
const MAX_REQUEST_BYTES = MAX_LOGO_BYTES + 64 * 1024
const STORAGE_PREFIX = "national/brand-logos"

type RouteContext = { params: Promise<{ id: string }> }

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

function adminFailureResponse(message: string | undefined) {
  // verifyAdminToken signals a valid session without the admin role via this message
  const isForbidden = message === "Unauthorized - Not an admin"
  return json(
    { success: false, message: isForbidden ? "Forbidden" : "Unauthorized" },
    isForbidden ? 403 : 401,
  )
}

function isValidId(id: string) {
  return id.length > 0 && id.length <= MAX_ID_LENGTH && /^[A-Za-z0-9_-]+$/.test(id)
}

function storageBucket() {
  return (process.env.SUPABASE_STORAGE_BUCKET || "eatinout-staging-storage").trim()
}

async function removeUploadedFile(bucket: string, path: string) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path])
  if (error) console.error(`Failed to remove orphaned national brand logo ${path}:`, error)
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) return adminFailureResponse(adminCheck.message)
    const adminUserId = String(adminCheck.userId)

    const { id } = await params
    if (!isValidId(id)) return json({ success: false, message: "Brand not found" }, 404)

    const declaredLength = Number(req.headers.get("content-length") ?? "0")
    if (declaredLength > MAX_REQUEST_BYTES) {
      return json({ success: false, message: "Logos must be 4 MB or smaller." }, 413)
    }

    const { data: brand, error: brandError } = await supabaseAdmin
      .from("national_brands")
      .select("id, logo_url")
      .eq("id", id)
      .maybeSingle<{ id: string; logo_url: string | null }>()
    if (brandError) {
      console.error("Error loading national brand for logo upload:", brandError)
      return json({ success: false, message: "Failed to upload logo" }, 500)
    }
    if (!brand) return json({ success: false, message: "Brand not found" }, 404)

    const formData = await req.formData().catch(() => null)
    const file = formData?.get("file")
    if (!file || typeof file === "string") {
      return json({ success: false, message: "Choose an image file to upload." }, 400)
    }
    if (file.size > MAX_LOGO_BYTES) {
      return json({ success: false, message: "Logos must be 4 MB or smaller." }, 413)
    }

    const processed = await processBrandLogo(Buffer.from(await file.arrayBuffer()))

    const bucket = storageBucket()
    const path = `${STORAGE_PREFIX}/${brand.id}/${randomUUID()}.${processed.extension}`

    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, processed.buffer, {
      contentType: processed.contentType,
      cacheControl: "31536000",
      upsert: false,
    })
    if (uploadError) {
      console.error("Error storing national brand logo:", uploadError)
      return json({ success: false, message: "Failed to store the logo. Please try again." }, 500)
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("national_brands")
      .update({ logo_url: publicUrl, updated_by: adminUserId, updated_at: new Date().toISOString() })
      .eq("id", brand.id)
      .select(BRAND_COLUMNS)
      .maybeSingle()

    if (updateError || !updated) {
      if (updateError) console.error("Error saving national brand logo URL:", updateError)
      await removeUploadedFile(bucket, path)
      return updated === null && !updateError
        ? json({ success: false, message: "Brand not found" }, 404)
        : json({ success: false, message: "Failed to save the logo. Nothing was changed." }, 500)
    }

    const logoDetails = {
      width: processed.width,
      height: processed.height,
      format: processed.format,
      bytes: processed.bytes,
    }

    const { error: auditError } = await supabaseAdmin.from("national_admin_audit_logs").insert({
      actor_user_id: adminUserId,
      action: "brand.logo_updated",
      entity_type: "national_brand",
      entity_id: brand.id,
      changed_fields: ["logo_url"],
      before_summary: { has_logo: Boolean(brand.logo_url) },
      after_summary: {
        has_logo: true,
        source_format: processed.sourceFormat,
        has_transparency: processed.hasAlpha,
        ...logoDetails,
      },
    })

    if (auditError) {
      console.error(`Audit log failed for brand.logo_updated on national brand ${brand.id}:`, auditError)
      return json({
        success: true,
        partial: true,
        auditLogged: false,
        brand: updated,
        logo: logoDetails,
        message: `Logo saved (brand ID: ${brand.id}), but the audit log entry could not be recorded.`,
      })
    }

    return json({
      success: true,
      partial: false,
      auditLogged: true,
      brand: updated,
      logo: logoDetails,
      message: "Logo saved.",
    })
  } catch (error) {
    if (error instanceof LogoValidationError) {
      return json({ success: false, message: error.message }, error.status)
    }
    console.error("Error uploading national brand logo:", error)
    return json({ success: false, message: "An error occurred while uploading the logo." }, 500)
  }
}
