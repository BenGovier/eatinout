import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"
import { OFFER_EDITOR_COLUMNS } from "@/lib/national/offer-columns"

export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }
const MAX_ID_LENGTH = 200
const BRAND_COLUMNS = "id, name, status, logo_url"

// These rules mirror the Create Offer endpoint (../route.ts) and must stay in step with it.
const REDEMPTION_METHODS = ["link", "code", "link_and_code"] as const
type RedemptionMethod = (typeof REDEMPTION_METHODS)[number]

const EDITABLE_FIELDS = ["title", "deal_label", "description", "terms", "starts_at", "ends_at", "redemption_method"] as const
type EditableField = (typeof EDITABLE_FIELDS)[number]

const MAX_TITLE_LENGTH = 160
const MAX_DEAL_LABEL_LENGTH = 40
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_TERMS_LENGTH = 5000

type RouteContext = { params: Promise<{ id: string; offerId: string }> }

type ValidatedOffer = {
  title: string
  deal_label: string | null
  description: string | null
  terms: string | null
  starts_at: string
  ends_at: string | null
  redemption_method: RedemptionMethod
}

type StoredOffer = {
  id: string
  brand_id: string
  publication_status: string | null
} & { [K in EditableField]: string | null }

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

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function parseTimestamp(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string") return undefined
  const date = new Date(value)
  return isNaN(date.getTime()) ? undefined : date
}

function validateOffer(raw: Record<string, unknown>) {
  const errors: Record<string, string> = {}

  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  if (!title) errors.title = "Offer title is required"
  else if (title.length > MAX_TITLE_LENGTH) errors.title = `Offer title must be ${MAX_TITLE_LENGTH} characters or fewer`
  else if (!/[a-z0-9]/i.test(title)) errors.title = "Offer title must contain letters or numbers"

  const dealLabel = optionalText(raw.deal_label)
  if (dealLabel === undefined) errors.deal_label = "Deal label must be text"
  else if (dealLabel && dealLabel.length > MAX_DEAL_LABEL_LENGTH)
    errors.deal_label = `Deal label must be ${MAX_DEAL_LABEL_LENGTH} characters or fewer`

  const description = optionalText(raw.description)
  if (description === undefined) errors.description = "Description must be text"
  else if (description && description.length > MAX_DESCRIPTION_LENGTH)
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`

  const terms = optionalText(raw.terms)
  if (terms === undefined) errors.terms = "Terms must be text"
  else if (terms && terms.length > MAX_TERMS_LENGTH) errors.terms = `Terms must be ${MAX_TERMS_LENGTH} characters or fewer`

  const redemptionMethod = raw.redemption_method
  if (typeof redemptionMethod !== "string" || !REDEMPTION_METHODS.includes(redemptionMethod as RedemptionMethod))
    errors.redemption_method = "Choose Link, Code, or Link + Code"

  const startsAt = parseTimestamp(raw.starts_at)
  if (!startsAt) errors.starts_at = "Enter a valid start date and time"

  const endsAt = parseTimestamp(raw.ends_at)
  if (endsAt === undefined) errors.ends_at = "Enter a valid expiry date and time"
  else if (endsAt && startsAt && endsAt.getTime() <= startsAt.getTime())
    errors.ends_at = "Expiry must be later than the start date"

  if (Object.keys(errors).length > 0) return { errors, offer: null }

  const offer: ValidatedOffer = {
    title,
    deal_label: dealLabel ?? null,
    description: description ?? null,
    terms: terms ?? null,
    starts_at: (startsAt as Date).toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    redemption_method: redemptionMethod as RedemptionMethod,
  }
  return { errors, offer }
}

function normalizeTimestamp(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date.getTime()) ? value : date.toISOString()
}

function isSameValue(field: EditableField, stored: string | null, next: string | null) {
  if (field === "starts_at" || field === "ends_at") return normalizeTimestamp(stored) === normalizeTimestamp(next)
  return (stored ?? null) === (next ?? null)
}

// Long free text is summarised so the audit log never stores full copy.
function auditValue(field: EditableField, value: string | null) {
  if (field === "description" || field === "terms") return { set: Boolean(value), length: value?.length ?? 0 }
  return value
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) return adminFailureResponse(adminCheck.message)

    const { id: brandId, offerId } = await params
    if (!isValidId(brandId) || !isValidId(offerId)) {
      return json({ success: false, message: "Offer not found" }, 404)
    }

    const [brandResult, offerResult] = await Promise.all([
      supabaseAdmin.from("national_brands").select(BRAND_COLUMNS).eq("id", brandId).maybeSingle(),
      supabaseAdmin
        .from("national_offers")
        .select(OFFER_EDITOR_COLUMNS)
        .eq("id", offerId)
        .eq("brand_id", brandId)
        .maybeSingle(),
    ])

    if (brandResult.error || offerResult.error) {
      console.error("Error loading national offer for editing:", brandResult.error ?? offerResult.error)
      return json({ success: false, message: "Failed to load offer" }, 500)
    }
    if (!brandResult.data || !offerResult.data) {
      return json({ success: false, message: "Offer not found" }, 404)
    }

    return json({ success: true, brand: brandResult.data, offer: offerResult.data })
  } catch (error) {
    console.error("Error loading national offer for editing:", error)
    return json({ success: false, message: "An error occurred" }, 500)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) return adminFailureResponse(adminCheck.message)
    const adminUserId = String(adminCheck.userId)

    const { id: brandId, offerId } = await params
    if (!isValidId(brandId) || !isValidId(offerId)) {
      return json({ success: false, message: "Offer not found" }, 404)
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, message: "Invalid request body" }, 400)
    }
    const raw = body as Record<string, unknown>

    const allowed = new Set<string>(EDITABLE_FIELDS)
    const unknownKeys = Object.keys(raw).filter((key) => !allowed.has(key))
    if (unknownKeys.length > 0) {
      return json({ success: false, message: `Fields cannot be set: ${unknownKeys.join(", ")}` }, 400)
    }

    const { errors, offer: validated } = validateOffer(raw)
    if (!validated) return json({ success: false, message: "Validation failed", errors }, 400)

    const { data: current, error: loadError } = await supabaseAdmin
      .from("national_offers")
      .select(`id, brand_id, publication_status, ${EDITABLE_FIELDS.join(", ")}`)
      .eq("id", offerId)
      .eq("brand_id", brandId)
      .maybeSingle<StoredOffer>()

    if (loadError) {
      console.error("Error loading national offer for update:", loadError)
      return json({ success: false, message: "Failed to update offer" }, 500)
    }
    if (!current) return json({ success: false, message: "Offer not found" }, 404)
    if (current.publication_status === "archived") {
      return json({ success: false, message: "Archived offers cannot be edited." }, 422)
    }

    const changedFields = EDITABLE_FIELDS.filter((field) => !isSameValue(field, current[field], validated[field]))

    if (changedFields.length === 0) {
      const { data: unchanged } = await supabaseAdmin
        .from("national_offers")
        .select(OFFER_EDITOR_COLUMNS)
        .eq("id", offerId)
        .eq("brand_id", brandId)
        .maybeSingle()
      return json({ success: true, changed: false, offer: unchanged, message: "No changes to save." })
    }

    const updates: Record<string, string | null> = {}
    for (const field of changedFields) updates[field] = validated[field]

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("national_offers")
      .update({ ...updates, updated_by: adminUserId, updated_at: new Date().toISOString() })
      .eq("id", offerId)
      .eq("brand_id", brandId)
      .select(OFFER_EDITOR_COLUMNS)
      .maybeSingle()

    if (updateError) {
      console.error("Error updating national offer:", updateError)
      return json({ success: false, message: "Failed to update offer" }, 500)
    }
    if (!updated) return json({ success: false, message: "Offer not found" }, 404)

    const beforeSummary: Record<string, unknown> = { brand_id: brandId }
    const afterSummary: Record<string, unknown> = { brand_id: brandId }
    for (const field of changedFields) {
      beforeSummary[field] = auditValue(field, current[field])
      afterSummary[field] = auditValue(field, validated[field])
    }

    const { error: auditError } = await supabaseAdmin.from("national_admin_audit_logs").insert({
      actor_user_id: adminUserId,
      action: "offer.updated",
      entity_type: "national_offer",
      entity_id: offerId,
      changed_fields: changedFields,
      before_summary: beforeSummary,
      after_summary: afterSummary,
    })

    if (auditError) {
      console.error(`Audit log failed for offer.updated on national offer ${offerId}:`, auditError)
      return json({
        success: true,
        changed: true,
        partial: true,
        auditLogged: false,
        offer: updated,
        message: `Offer details saved (ID: ${offerId}), but the audit log entry could not be recorded.`,
      })
    }

    return json({
      success: true,
      changed: true,
      partial: false,
      auditLogged: true,
      offer: updated,
      message: "Offer details saved.",
    })
  } catch (error) {
    console.error("Error updating national offer:", error)
    return json({ success: false, message: "An error occurred" }, 500)
  }
}
