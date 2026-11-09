import { randomUUID } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"
import {
  MAX_OFFER_IMAGE_BYTES,
  OfferImageValidationError,
  parsePhotoCrop,
  parseTreatment,
  processOfferImage,
} from "@/lib/national/offer-image-processing"
import { OFFER_EDITOR_COLUMNS } from "@/lib/national/offer-columns"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }
const MAX_ID_LENGTH = 200
// Allows for multipart boundaries, headers and the crop field around a maximum-size file.
const MAX_REQUEST_BYTES = MAX_OFFER_IMAGE_BYTES + 64 * 1024
const STORAGE_PREFIX = "national/offer-images"

type RouteContext = { params: Promise<{ id: string; offerId: string }> }

type OfferRow = { id: string; brand_id: string; publication_status: string | null; offer_image_url: string | null }

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
  if (error) console.error(`Failed to remove orphaned national offer image ${path}:`, error)
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) return adminFailureResponse(adminCheck.message)
    const adminUserId = String(adminCheck.userId)

    const { id: brandId, offerId } = await params
    if (!isValidId(brandId) || !isValidId(offerId)) {
      return json({ success: false, message: "Offer not found" }, 404)
    }

    const declaredLength = Number(req.headers.get("content-length") ?? "0")
    if (declaredLength > MAX_REQUEST_BYTES) {
      return json({ success: false, message: "Offer images must be 4 MB or smaller." }, 413)
    }

    const { data: offer, error: offerError } = await supabaseAdmin
      .from("national_offers")
      .select("id, brand_id, publication_status, offer_image_url")
      .eq("id", offerId)
      .eq("brand_id", brandId)
      .maybeSingle<OfferRow>()
    if (offerError) {
      console.error("Error loading national offer for image upload:", offerError)
      return json({ success: false, message: "Failed to upload the offer image" }, 500)
    }
    if (!offer) return json({ success: false, message: "Offer not found" }, 404)
    if (offer.publication_status === "archived") {
      return json({ success: false, message: "Archived offers cannot be changed." }, 422)
    }

    const formData = await req.formData().catch(() => null)
    if (!formData) return json({ success: false, message: "Invalid upload." }, 400)

    const allowedFields = new Set(["file", "treatment", "crop"])
    const unknownFields = [...new Set(formData.keys())].filter((key) => !allowedFields.has(key))
    if (unknownFields.length > 0) {
      return json({ success: false, message: `Fields cannot be set: ${unknownFields.join(", ")}` }, 400)
    }

    const treatment = parseTreatment(formData.get("treatment"))
    if (!treatment) return json({ success: false, message: "Choose Photograph or Promotional artwork." }, 400)

    const rawCrop = formData.get("crop")
    const crop = treatment === "photo" ? parsePhotoCrop(rawCrop) : null
    if (treatment === "photo" && !crop) {
      return json({ success: false, message: "A valid 16:9 crop is required for photographs." }, 422)
    }
    if (treatment === "artwork" && rawCrop !== null) {
      return json({ success: false, message: "Artwork is never cropped; remove the crop." }, 400)
    }

    const file = formData.get("file")
    if (!file || typeof file === "string") {
      return json({ success: false, message: "Choose an image file to upload." }, 400)
    }
    if (file.size > MAX_OFFER_IMAGE_BYTES) {
      return json({ success: false, message: "Offer images must be 4 MB or smaller." }, 413)
    }

    const processed = await processOfferImage(Buffer.from(await file.arrayBuffer()), treatment, crop)

    const bucket = storageBucket()
    const path = `${STORAGE_PREFIX}/${offer.id}/${treatment}-${randomUUID()}.${processed.extension}`

    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, processed.buffer, {
      contentType: processed.contentType,
      cacheControl: "31536000",
      upsert: false,
    })
    if (uploadError) {
      console.error("Error storing national offer image:", uploadError)
      return json({ success: false, message: "Failed to store the image. Please try again." }, 500)
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("national_offers")
      .update({ offer_image_url: publicUrl, updated_by: adminUserId, updated_at: new Date().toISOString() })
      .eq("id", offer.id)
      .eq("brand_id", offer.brand_id)
      .select(OFFER_EDITOR_COLUMNS)
      .maybeSingle()

    if (updateError || !updated) {
      if (updateError) console.error("Error saving national offer image URL:", updateError)
      await removeUploadedFile(bucket, path)
      return updated === null && !updateError
        ? json({ success: false, message: "Offer not found" }, 404)
        : json({ success: false, message: "Failed to save the image. Nothing was changed." }, 500)
    }

    const image = {
      url: publicUrl,
      treatment: processed.treatment,
      format: processed.format,
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
      originalBytes: processed.originalBytes,
      sourceFormat: processed.sourceFormat,
      sourceWidth: processed.sourceWidth,
      sourceHeight: processed.sourceHeight,
    }

    const { error: auditError } = await supabaseAdmin.from("national_admin_audit_logs").insert({
      actor_user_id: adminUserId,
      action: "offer.image_updated",
      entity_type: "national_offer",
      entity_id: offer.id,
      changed_fields: ["offer_image_url"],
      before_summary: { has_image: Boolean(offer.offer_image_url) },
      after_summary: {
        has_image: true,
        brand_id: offer.brand_id,
        treatment: processed.treatment,
        format: processed.format,
        width: processed.width,
        height: processed.height,
        bytes: processed.bytes,
        original_bytes: processed.originalBytes,
        source_format: processed.sourceFormat,
        has_transparency: processed.hasAlpha,
      },
    })

    if (auditError) {
      console.error(`Audit log failed for offer.image_updated on national offer ${offer.id}:`, auditError)
      return json({
        success: true,
        partial: true,
        auditLogged: false,
        offer: updated,
        image,
        message: `Image saved (offer ID: ${offer.id}), but the audit log entry could not be recorded.`,
      })
    }

    return json({ success: true, partial: false, auditLogged: true, offer: updated, image, message: "Image saved." })
  } catch (error) {
    if (error instanceof OfferImageValidationError) {
      return json({ success: false, message: error.message }, error.status)
    }
    console.error("Error uploading national offer image:", error)
    return json({ success: false, message: "An error occurred while uploading the image." }, 500)
  }
}
