import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }
const MAX_ID_LENGTH = 200
const MAX_URL_LENGTH = 2048
const MAX_VOUCHER_CODE_LENGTH = 100
const MAX_TRACKING_REFERENCE_LENGTH = 200

const REDEMPTION_METHODS = ["link", "code", "link_and_code"] as const
type RedemptionMethod = (typeof REDEMPTION_METHODS)[number]

const DESTINATION_FIELDS = ["destination_url", "voucher_code", "tracking_reference"] as const
type DestinationField = (typeof DESTINATION_FIELDS)[number]
type DestinationValues = Record<DestinationField, string | null>

const DESTINATION_COLUMNS = "offer_id, destination_url, voucher_code, tracking_reference, updated_at"

type RouteContext = { params: Promise<{ id: string; offerId: string }> }

type OfferRow = {
  id: string
  brand_id: string
  publication_status: string | null
  redemption_method: string | null
}

type DestinationRow = DestinationValues & { offer_id: string; updated_at: string | null }

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

function isRedemptionMethod(value: string | null): value is RedemptionMethod {
  return value !== null && REDEMPTION_METHODS.includes(value as RedemptionMethod)
}

function requirements(method: RedemptionMethod) {
  return {
    url: method === "link" || method === "link_and_code",
    code: method === "code" || method === "link_and_code",
  }
}

// Database errors can echo the failing row (including private values), so only the code and message are logged.
function logDbError(context: string, error: { code?: string; message?: string } | null) {
  console.error(context, { code: error?.code, message: error?.message })
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function hasControlCharacters(value: string) {
  return /[\u0000-\u001F\u007F]/.test(value)
}

function normalizeHttpsUrl(value: string): { url: string } | { error: string } {
  if (value.length > MAX_URL_LENGTH) return { error: `Destination URL must be ${MAX_URL_LENGTH} characters or fewer` }
  if (/\s/.test(value) || hasControlCharacters(value)) return { error: "Destination URL must not contain spaces" }
  if (!/^https:\/\//i.test(value)) return { error: "Destination URL must start with https://" }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { error: "Enter a valid destination URL" }
  }
  if (parsed.protocol !== "https:") return { error: "Destination URL must use HTTPS" }
  if (!parsed.hostname || !parsed.hostname.includes(".")) return { error: "Destination URL must include a valid domain" }
  if (parsed.username || parsed.password) return { error: "Destination URL must not contain login details" }

  const url = parsed.href
  if (url.length > MAX_URL_LENGTH) return { error: `Destination URL must be ${MAX_URL_LENGTH} characters or fewer` }
  return { url }
}

function validateDestination(raw: Record<string, unknown>, method: RedemptionMethod) {
  const errors: Partial<Record<DestinationField, string>> = {}
  const needs = requirements(method)
  const values: DestinationValues = { destination_url: null, voucher_code: null, tracking_reference: null }

  if (needs.url) {
    const url = optionalString(raw.destination_url)
    if (url === undefined) errors.destination_url = "Destination URL must be text"
    else if (!url) errors.destination_url = "Affiliate destination URL is required for this redemption method"
    else {
      const result = normalizeHttpsUrl(url)
      if ("error" in result) errors.destination_url = result.error
      else values.destination_url = result.url
    }
  }

  if (needs.code) {
    const code = optionalString(raw.voucher_code)
    if (code === undefined) errors.voucher_code = "Voucher code must be text"
    else if (!code) errors.voucher_code = "Voucher or promo code is required for this redemption method"
    else if (code.length > MAX_VOUCHER_CODE_LENGTH)
      errors.voucher_code = `Voucher code must be ${MAX_VOUCHER_CODE_LENGTH} characters or fewer`
    else if (hasControlCharacters(code)) errors.voucher_code = "Voucher code must be on a single line"
    else values.voucher_code = code
  }

  const tracking = optionalString(raw.tracking_reference)
  if (tracking === undefined) errors.tracking_reference = "Tracking reference must be text"
  else if (tracking && tracking.length > MAX_TRACKING_REFERENCE_LENGTH)
    errors.tracking_reference = `Tracking reference must be ${MAX_TRACKING_REFERENCE_LENGTH} characters or fewer`
  else if (tracking && hasControlCharacters(tracking))
    errors.tracking_reference = "Tracking reference must be on a single line"
  else values.tracking_reference = tracking

  return { errors, values: Object.keys(errors).length > 0 ? null : values }
}

function isConfigured(row: DestinationValues | null, method: string | null) {
  if (!row || !isRedemptionMethod(method)) return false
  const needs = requirements(method)
  return (!needs.url || Boolean(row.destination_url)) && (!needs.code || Boolean(row.voucher_code))
}

function presenceSummary(row: DestinationValues | null, method: string | null) {
  return {
    redemption_method: method,
    has_destination_url: Boolean(row?.destination_url),
    has_voucher_code: Boolean(row?.voucher_code),
    has_tracking_reference: Boolean(row?.tracking_reference),
  }
}

function destinationResponse(row: DestinationRow | null, method: string | null) {
  return {
    exists: Boolean(row),
    configured: isConfigured(row, method),
    destination_url: row?.destination_url ?? null,
    voucher_code: row?.voucher_code ?? null,
    tracking_reference: row?.tracking_reference ?? null,
    updated_at: row?.updated_at ?? null,
  }
}

async function loadOffer(brandId: string, offerId: string) {
  return supabaseAdmin
    .from("national_offers")
    .select("id, brand_id, publication_status, redemption_method")
    .eq("id", offerId)
    .eq("brand_id", brandId)
    .maybeSingle<OfferRow>()
}

async function loadDestination(offerId: string) {
  return supabaseAdmin
    .from("national_offer_destinations")
    .select(DESTINATION_COLUMNS)
    .eq("offer_id", offerId)
    .maybeSingle<DestinationRow>()
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) return adminFailureResponse(adminCheck.message)

    const { id: brandId, offerId } = await params
    if (!isValidId(brandId) || !isValidId(offerId)) {
      return json({ success: false, message: "Offer not found" }, 404)
    }

    const { data: offer, error: offerError } = await loadOffer(brandId, offerId)
    if (offerError) {
      logDbError("Error loading national offer for redemption details:", offerError)
      return json({ success: false, message: "Failed to load redemption details" }, 500)
    }
    if (!offer) return json({ success: false, message: "Offer not found" }, 404)

    const { data: destination, error: destinationError } = await loadDestination(offerId)
    if (destinationError) {
      logDbError("Error loading national offer redemption details:", destinationError)
      return json({ success: false, message: "Failed to load redemption details" }, 500)
    }

    return json({
      success: true,
      redemption_method: offer.redemption_method,
      destination: destinationResponse(destination ?? null, offer.redemption_method),
    })
  } catch (error) {
    console.error("Error loading national offer redemption details:", error instanceof Error ? error.message : "unknown")
    return json({ success: false, message: "An error occurred" }, 500)
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
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

    const allowed = new Set<string>(DESTINATION_FIELDS)
    const unknownKeys = Object.keys(raw).filter((key) => !allowed.has(key))
    if (unknownKeys.length > 0) {
      return json({ success: false, message: `Fields cannot be set: ${unknownKeys.join(", ")}` }, 400)
    }

    const { data: offer, error: offerError } = await loadOffer(brandId, offerId)
    if (offerError) {
      logDbError("Error loading national offer for redemption update:", offerError)
      return json({ success: false, message: "Failed to save redemption details" }, 500)
    }
    if (!offer) return json({ success: false, message: "Offer not found" }, 404)
    if (offer.publication_status === "archived") {
      return json({ success: false, message: "Archived offers cannot be changed." }, 422)
    }
    const method = offer.redemption_method
    if (!isRedemptionMethod(method)) {
      return json(
        { success: false, message: "Set the offer's redemption method before adding redemption details." },
        422,
      )
    }

    const { errors, values } = validateDestination(raw, method)
    if (!values) return json({ success: false, message: "Validation failed", errors }, 400)

    const { data: existing, error: existingError } = await loadDestination(offerId)
    if (existingError) {
      logDbError("Error loading existing redemption details:", existingError)
      return json({ success: false, message: "Failed to save redemption details" }, 500)
    }

    const changedFields = DESTINATION_FIELDS.filter(
      (field) => (existing?.[field] ?? null) !== (values[field] ?? null),
    )
    if (existing && changedFields.length === 0) {
      return json({
        success: true,
        changed: false,
        destination: destinationResponse(existing, method),
        message: "No changes to save.",
      })
    }

    const now = new Date().toISOString()
    let saved: DestinationRow | null = null

    if (!existing) {
      const { data, error } = await supabaseAdmin
        .from("national_offer_destinations")
        .insert({ offer_id: offerId, ...values, created_by: adminUserId, updated_by: adminUserId })
        .select(DESTINATION_COLUMNS)
        .single<DestinationRow>()

      // A concurrent save created the row first; fall through to an update so it is not duplicated.
      if (error && error.code !== "23505") {
        logDbError("Error creating redemption details:", error)
        return json({ success: false, message: "Failed to save redemption details" }, 500)
      }
      saved = data ?? null
    }

    if (!saved) {
      const { data, error } = await supabaseAdmin
        .from("national_offer_destinations")
        .update({ ...values, updated_by: adminUserId, updated_at: now })
        .eq("offer_id", offerId)
        .select(DESTINATION_COLUMNS)
        .maybeSingle<DestinationRow>()

      if (error) {
        logDbError("Error updating redemption details:", error)
        return json({ success: false, message: "Failed to save redemption details" }, 500)
      }
      if (!data) return json({ success: false, message: "Failed to save redemption details" }, 500)
      saved = data
    }

    const { error: auditError } = await supabaseAdmin.from("national_admin_audit_logs").insert({
      actor_user_id: adminUserId,
      action: "offer.destination_updated",
      entity_type: "national_offer",
      entity_id: offerId,
      changed_fields: changedFields,
      before_summary: { ...presenceSummary(existing ?? null, method), brand_id: brandId, existed: Boolean(existing) },
      after_summary: { ...presenceSummary(saved, method), brand_id: brandId },
    })

    if (auditError) {
      logDbError(`Audit log failed for offer.destination_updated on national offer ${offerId}:`, auditError)
      return json({
        success: true,
        changed: true,
        partial: true,
        auditLogged: false,
        destination: destinationResponse(saved, method),
        message: `Redemption details saved (offer ID: ${offerId}), but the audit log entry could not be recorded.`,
      })
    }

    return json({
      success: true,
      changed: true,
      partial: false,
      auditLogged: true,
      destination: destinationResponse(saved, method),
      message: "Redemption details saved.",
    })
  } catch (error) {
    console.error("Error saving national offer redemption details:", error instanceof Error ? error.message : "unknown")
    return json({ success: false, message: "An error occurred" }, 500)
  }
}
