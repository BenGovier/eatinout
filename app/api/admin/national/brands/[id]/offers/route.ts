import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
}

const REDEMPTION_METHODS = ["link", "code", "link_and_code"] as const
type RedemptionMethod = (typeof REDEMPTION_METHODS)[number]

const ALLOWED_FIELDS = ["title", "deal_label", "description", "terms", "starts_at", "ends_at", "redemption_method"] as const

const MAX_TITLE_LENGTH = 160
const MAX_DEAL_LABEL_LENGTH = 40
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_TERMS_LENGTH = 5000
const MAX_ID_LENGTH = 200

const OFFER_COLUMNS = "id, title, publication_status, starts_at, ends_at, created_at"

type RouteContext = { params: Promise<{ id: string }> }

type CreatedOffer = {
  id: string
  title: string
  publication_status: string
  starts_at: string | null
  ends_at: string | null
  created_at: string | null
}

type ValidatedOffer = {
  title: string
  deal_label: string | null
  description: string | null
  terms: string | null
  starts_at: string
  ends_at: string | null
  redemption_method: RedemptionMethod
}

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

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) return adminFailureResponse(adminCheck.message)
    const adminUserId = String(adminCheck.userId)

    const { id: brandId } = await params
    if (!isValidId(brandId)) return json({ success: false, message: "Brand not found" }, 404)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, message: "Invalid request body" }, 400)
    }
    const raw = body as Record<string, unknown>

    const allowed = new Set<string>(ALLOWED_FIELDS)
    const unknownKeys = Object.keys(raw).filter((key) => !allowed.has(key))
    if (unknownKeys.length > 0) {
      return json({ success: false, message: `Fields cannot be set: ${unknownKeys.join(", ")}` }, 400)
    }

    const { errors, offer } = validateOffer(raw)
    if (!offer) return json({ success: false, message: "Validation failed", errors }, 400)

    const { data: brand, error: brandError } = await supabaseAdmin
      .from("national_brands")
      .select("id, name, status")
      .eq("id", brandId)
      .maybeSingle<{ id: string; name: string; status: string }>()

    if (brandError) {
      console.error("Error loading national brand for offer creation:", brandError)
      return json({ success: false, message: "Failed to create offer" }, 500)
    }
    if (!brand) return json({ success: false, message: "Brand not found" }, 404)
    if (brand.status === "archived") {
      return json(
        { success: false, message: "Offers cannot be added to an archived brand. Restore the brand to draft first." },
        422,
      )
    }

    const now = new Date().toISOString()
    const { data: created, error: insertError } = await supabaseAdmin
      .from("national_offers")
      .insert({
        ...offer,
        brand_id: brand.id,
        publication_status: "draft",
        offer_image_url: null,
        is_featured: false,
        sort_order: 0,
        created_by: adminUserId,
        updated_by: adminUserId,
        created_at: now,
        updated_at: now,
      })
      .select(OFFER_COLUMNS)
      .single<CreatedOffer>()

    if (insertError || !created) {
      console.error("Error creating national offer:", insertError)
      return json({ success: false, message: "Failed to create offer" }, 500)
    }

    const { error: auditError } = await supabaseAdmin.from("national_admin_audit_logs").insert({
      actor_user_id: adminUserId,
      action: "offer.created",
      entity_type: "national_offer",
      entity_id: created.id,
      changed_fields: [...ALLOWED_FIELDS],
      before_summary: null,
      after_summary: {
        brand_id: brand.id,
        title: offer.title,
        deal_label: offer.deal_label,
        redemption_method: offer.redemption_method,
        publication_status: "draft",
        starts_at: offer.starts_at,
        ends_at: offer.ends_at,
        has_description: Boolean(offer.description),
        has_terms: Boolean(offer.terms),
      },
    })

    if (auditError) {
      console.error(`Audit log failed for offer.created on national offer ${created.id}:`, auditError)
      return json(
        {
          success: true,
          partial: true,
          auditLogged: false,
          offer: created,
          message: `Draft offer created (ID: ${created.id}), but the audit log entry could not be recorded.`,
        },
        201,
      )
    }

    return json({ success: true, partial: false, auditLogged: true, offer: created, message: "Draft offer created." }, 201)
  } catch (error) {
    console.error("Error creating national offer:", error)
    return json({ success: false, message: "An error occurred" }, 500)
  }
}
