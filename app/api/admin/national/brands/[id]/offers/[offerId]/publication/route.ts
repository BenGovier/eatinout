import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"
import { OFFER_EDITOR_COLUMNS } from "@/lib/national/offer-columns"

export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }
const MAX_ID_LENGTH = 200

const ACTIONS = ["publish", "pause", "draft"] as const
type PublicationAction = (typeof ACTIONS)[number]
type PublicationStatus = "draft" | "published" | "paused" | "archived"

// Which stored statuses each action may start from. Archived offers are never accepted.
const ALLOWED_FROM: Record<PublicationAction, PublicationStatus[]> = {
  publish: ["draft", "paused"],
  pause: ["published"],
  draft: ["published", "paused"],
}

const TARGET_STATUS: Record<PublicationAction, PublicationStatus> = {
  publish: "published",
  pause: "paused",
  draft: "draft",
}

const AUDIT_ACTION: Record<PublicationAction, string> = {
  publish: "offer.published",
  pause: "offer.paused",
  draft: "offer.unpublished",
}

type RouteContext = { params: Promise<{ id: string; offerId: string }> }

type BrandRow = { id: string; status: string | null; logo_url: string | null }

type OfferRow = {
  id: string
  brand_id: string
  title: string | null
  deal_label: string | null
  description: string | null
  terms: string | null
  starts_at: string | null
  ends_at: string | null
  redemption_method: string | null
  publication_status: string | null
  offer_image_url: string | null
}

// Only presence is read from the secret columns; their values never leave this module.
type DestinationPresence = { destination_url: string | null; voucher_code: string | null }

type ReadinessCheck = { key: string; label: string; ok: boolean; reason: string | null }

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

function logDbError(context: string, error: { code?: string; message?: string } | null) {
  console.error(context, { code: error?.code, message: error?.message })
}

function hasText(value: string | null) {
  return typeof value === "string" && value.trim().length > 0
}

function parseDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : date
}

function dateCheck(offer: OfferRow, now: Date): { ok: boolean; reason: string | null } {
  const startsAt = parseDate(offer.starts_at)
  if (!startsAt) return { ok: false, reason: "Set a valid start date and time." }
  if (offer.ends_at === null || offer.ends_at === "") return { ok: true, reason: null }
  const endsAt = parseDate(offer.ends_at)
  if (!endsAt) return { ok: false, reason: "The expiry date is not a valid date." }
  if (endsAt.getTime() <= startsAt.getTime()) return { ok: false, reason: "The expiry must be later than the start date." }
  if (endsAt.getTime() <= now.getTime()) return { ok: false, reason: "The expiry date has already passed." }
  return { ok: true, reason: null }
}

function redemptionCheck(method: string | null, destination: DestinationPresence | null) {
  const needsUrl = method === "link" || method === "link_and_code"
  const needsCode = method === "code" || method === "link_and_code"
  if (!needsUrl && !needsCode) return { ok: false, reason: "Choose and save a redemption method." }
  if (!destination) return { ok: false, reason: "Save the redemption details for this offer." }
  const missing: string[] = []
  if (needsUrl && !hasText(destination.destination_url)) missing.push("an affiliate destination URL")
  if (needsCode && !hasText(destination.voucher_code)) missing.push("a voucher code")
  if (missing.length > 0) return { ok: false, reason: `The saved redemption method needs ${missing.join(" and ")}.` }
  return { ok: true, reason: null }
}

function evaluateReadiness(
  brand: BrandRow,
  offer: OfferRow,
  destination: DestinationPresence | null,
  now: Date,
): ReadinessCheck[] {
  const check = (key: string, label: string, ok: boolean, reason: string): ReadinessCheck => ({
    key,
    label,
    ok,
    reason: ok ? null : reason,
  })
  const dates = dateCheck(offer, now)
  const redemption = redemptionCheck(offer.redemption_method, destination)

  return [
    check("brand_active", "Brand is active", brand.status === "active", "Activate the brand before publishing its offers."),
    check("brand_logo", "Brand has a saved logo", hasText(brand.logo_url), "Upload and save a brand logo."),
    check("title", "Offer has a title", hasText(offer.title), "Add an offer title."),
    check("deal_label", "Offer has a deal label", hasText(offer.deal_label), "Add a deal label, for example “20% off”."),
    check("description", "Offer has a description", hasText(offer.description), "Add a description."),
    check("terms", "Offer has terms and conditions", hasText(offer.terms), "Add terms and conditions."),
    check("image", "Offer has a saved main image", hasText(offer.offer_image_url), "Upload and save the main offer image."),
    { key: "dates", label: "Start and expiry dates are valid", ok: dates.ok, reason: dates.reason },
    {
      key: "redemption",
      label: "Redemption details match the redemption method",
      ok: redemption.ok,
      reason: redemption.reason,
    },
    check("not_archived", "Offer is not archived", offer.publication_status !== "archived", "Archived offers cannot be published."),
  ]
}

async function loadContext(brandId: string, offerId: string) {
  const [brandResult, offerResult] = await Promise.all([
    supabaseAdmin.from("national_brands").select("id, status, logo_url").eq("id", brandId).maybeSingle<BrandRow>(),
    supabaseAdmin
      .from("national_offers")
      .select(
        "id, brand_id, title, deal_label, description, terms, starts_at, ends_at, redemption_method, publication_status, offer_image_url",
      )
      .eq("id", offerId)
      .eq("brand_id", brandId)
      .maybeSingle<OfferRow>(),
  ])
  if (brandResult.error || offerResult.error) {
    return { error: brandResult.error ?? offerResult.error, brand: null, offer: null, destination: null }
  }
  if (!brandResult.data || !offerResult.data) return { error: null, brand: null, offer: null, destination: null }

  const destinationResult = await supabaseAdmin
    .from("national_offer_destinations")
    .select("destination_url, voucher_code")
    .eq("offer_id", offerId)
    .maybeSingle<DestinationPresence>()
  if (destinationResult.error) {
    return { error: destinationResult.error, brand: null, offer: null, destination: null }
  }

  return {
    error: null,
    brand: brandResult.data,
    offer: offerResult.data,
    destination: destinationResult.data ?? null,
  }
}

function readinessResponse(checks: ReadinessCheck[]) {
  return { ready: checks.every((check) => check.ok), checks }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) return adminFailureResponse(adminCheck.message)

    const { id: brandId, offerId } = await params
    if (!isValidId(brandId) || !isValidId(offerId)) {
      return json({ success: false, message: "Offer not found" }, 404)
    }

    const { error, brand, offer, destination } = await loadContext(brandId, offerId)
    if (error) {
      logDbError("Error loading national offer publication readiness:", error)
      return json({ success: false, message: "Failed to load publication readiness" }, 500)
    }
    if (!brand || !offer) return json({ success: false, message: "Offer not found" }, 404)

    return json({
      success: true,
      publication_status: offer.publication_status ?? "draft",
      readiness: readinessResponse(evaluateReadiness(brand, offer, destination, new Date())),
    })
  } catch (error) {
    console.error("Error loading national offer publication readiness:", error instanceof Error ? error.message : "unknown")
    return json({ success: false, message: "An error occurred" }, 500)
  }
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

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, message: "Invalid request body" }, 400)
    }
    const raw = body as Record<string, unknown>
    const unknownKeys = Object.keys(raw).filter((key) => key !== "action")
    if (unknownKeys.length > 0) {
      return json({ success: false, message: `Fields cannot be set: ${unknownKeys.join(", ")}` }, 400)
    }
    const action = raw.action
    if (typeof action !== "string" || !ACTIONS.includes(action as PublicationAction)) {
      return json({ success: false, message: "Choose publish, pause or draft" }, 400)
    }
    const publicationAction = action as PublicationAction

    const { error, brand, offer, destination } = await loadContext(brandId, offerId)
    if (error) {
      logDbError("Error loading national offer for publication change:", error)
      return json({ success: false, message: "Failed to change publication status" }, 500)
    }
    if (!brand || !offer) return json({ success: false, message: "Offer not found" }, 404)

    const currentStatus = (offer.publication_status ?? "draft") as PublicationStatus
    if (currentStatus === "archived") {
      return json({ success: false, message: "Archived offers are locked and cannot change status." }, 422)
    }
    if (!ALLOWED_FROM[publicationAction].includes(currentStatus)) {
      return json(
        { success: false, message: `This action is not available while the offer is ${currentStatus}.` },
        409,
      )
    }

    const checks = evaluateReadiness(brand, offer, destination, new Date())
    const readiness = readinessResponse(checks)
    if (publicationAction === "publish" && !readiness.ready) {
      const missing = checks.filter((check) => !check.ok).map((check) => check.reason)
      return json(
        {
          success: false,
          message: `The offer cannot be published yet: ${missing.join(" ")}`,
          readiness,
        },
        422,
      )
    }

    const targetStatus = TARGET_STATUS[publicationAction]

    // The status filter stops a concurrent change from being silently overwritten.
    let update = supabaseAdmin
      .from("national_offers")
      .update({ publication_status: targetStatus, updated_by: adminUserId, updated_at: new Date().toISOString() })
      .eq("id", offerId)
      .eq("brand_id", brandId)
    update = offer.publication_status === null ? update.is("publication_status", null) : update.eq("publication_status", currentStatus)

    const { data: updated, error: updateError } = await update.select(OFFER_EDITOR_COLUMNS).maybeSingle()

    if (updateError) {
      logDbError("Error changing national offer publication status:", updateError)
      return json({ success: false, message: "Failed to change publication status" }, 500)
    }
    if (!updated) {
      return json(
        { success: false, message: "The offer changed while you were working. Reload the page and try again." },
        409,
      )
    }

    const nextReadiness = readinessResponse(
      evaluateReadiness(brand, { ...offer, publication_status: targetStatus }, destination, new Date()),
    )

    const { error: auditError } = await supabaseAdmin.from("national_admin_audit_logs").insert({
      actor_user_id: adminUserId,
      action: AUDIT_ACTION[publicationAction],
      entity_type: "national_offer",
      entity_id: offerId,
      changed_fields: ["publication_status"],
      before_summary: { brand_id: brandId, publication_status: currentStatus },
      after_summary: {
        brand_id: brandId,
        publication_status: targetStatus,
        starts_at: offer.starts_at,
        ends_at: offer.ends_at,
        redemption_method: offer.redemption_method,
      },
    })

    const verb = targetStatus === "published" ? "published" : targetStatus === "paused" ? "paused" : "moved to draft"

    if (auditError) {
      logDbError(`Audit log failed for ${AUDIT_ACTION[publicationAction]} on national offer ${offerId}:`, auditError)
      return json({
        success: true,
        partial: true,
        auditLogged: false,
        offer: updated,
        readiness: nextReadiness,
        message: `Offer ${verb} (ID: ${offerId}), but the audit log entry could not be recorded.`,
      })
    }

    return json({
      success: true,
      partial: false,
      auditLogged: true,
      offer: updated,
      readiness: nextReadiness,
      message: `Offer ${verb}.`,
    })
  } catch (error) {
    console.error("Error changing national offer publication status:", error instanceof Error ? error.message : "unknown")
    return json({ success: false, message: "An error occurred" }, 500)
  }
}
