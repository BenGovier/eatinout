import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

export const dynamic = "force-dynamic"

const BRAND_COLUMNS =
  "id, name, slug, description, logo_url, website_url, affiliate_network, status, created_at, updated_at"

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
}

const AFFILIATE_NETWORKS = ["CJ", "Impact", "Direct", "Other"] as const
type AffiliateNetwork = (typeof AFFILIATE_NETWORKS)[number]

const BRAND_STATUSES = ["draft", "active", "paused", "archived"] as const
type BrandStatus = (typeof BRAND_STATUSES)[number]

const EDITABLE_FIELDS = ["name", "description", "website_url", "affiliate_network"] as const
type EditableField = (typeof EDITABLE_FIELDS)[number]

const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_URL_LENGTH = 2048
const MAX_ID_LENGTH = 200
const OFFER_SUMMARY_LIMIT = 100

type BrandRow = {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  affiliate_network: string | null
  status: BrandStatus
  created_at: string
  updated_at: string
}

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

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function isValidHttpUrl(value: string) {
  if (value.length > MAX_URL_LENGTH) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function hostOf(value: string | null) {
  if (!value) return null
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

// Only approved logos may be used for activation. No approval workflow exists yet,
// so no logo currently counts as approved.
function hasApprovedLogo(_brand: BrandRow) {
  return false
}

async function loadBrand(id: string) {
  return supabaseAdmin.from("national_brands").select(BRAND_COLUMNS).eq("id", id).maybeSingle<BrandRow>()
}

// Only non-sensitive display columns are selected; affiliate destinations are never included.
const OFFER_SUMMARY_COLUMNS = "id, title, publication_status, starts_at, ends_at, created_at"

type OfferRow = {
  id: string
  title: string | null
  publication_status: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string | null
}

function toOfferSummary(row: OfferRow) {
  return {
    id: String(row.id),
    title: row.title?.trim() || "Untitled offer",
    publication_status: row.publication_status,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    created_at: row.created_at,
  }
}

function safeBrandSummary(brand: Pick<BrandRow, EditableField>, fields: readonly EditableField[]) {
  const summary: Record<string, unknown> = {}
  for (const field of fields) {
    if (field === "name") summary.name = brand.name
    if (field === "affiliate_network") summary.affiliate_network = brand.affiliate_network
    if (field === "description") {
      summary.has_description = Boolean(brand.description)
      summary.description_length = brand.description?.length ?? 0
    }
    if (field === "website_url") {
      summary.has_website_url = Boolean(brand.website_url)
      summary.website_host = hostOf(brand.website_url)
    }
  }
  return summary
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) return adminFailureResponse(adminCheck.message)

    const { id } = await params
    if (!isValidId(id)) return json({ success: false, message: "Brand not found" }, 404)

    const { data: brand, error } = await loadBrand(id)
    if (error) {
      console.error("Error fetching national brand:", error)
      return json({ success: false, message: "Failed to fetch national brand" }, 500)
    }
    if (!brand) return json({ success: false, message: "Brand not found" }, 404)

    const {
      data: offerRows,
      count,
      error: offersError,
    } = await supabaseAdmin
      .from("national_offers")
      .select(OFFER_SUMMARY_COLUMNS, { count: "exact" })
      .eq("brand_id", id)
      .order("created_at", { ascending: false })
      .limit(OFFER_SUMMARY_LIMIT)
      .returns<OfferRow[]>()

    if (offersError) console.error(`Error fetching offers for national brand ${id}:`, offersError)

    return json({
      success: true,
      brand,
      canActivate: hasApprovedLogo(brand),
      offers: offersError ? [] : (offerRows ?? []).map(toOfferSummary),
      offerCount: offersError ? null : (count ?? offerRows?.length ?? 0),
      offersAvailable: !offersError,
    })
  } catch (error) {
    console.error("Error in national brand detail route:", error)
    return json({ success: false, message: "An error occurred" }, 500)
  }
}

type FieldUpdates = Partial<Pick<BrandRow, EditableField>>

function validateFieldUpdates(raw: Record<string, unknown>) {
  const errors: Record<string, string> = {}
  const updates: FieldUpdates = {}

  if ("name" in raw) {
    const name = typeof raw.name === "string" ? raw.name.trim() : ""
    if (!name) errors.name = "Brand name is required"
    else if (name.length > MAX_NAME_LENGTH) errors.name = `Brand name must be ${MAX_NAME_LENGTH} characters or fewer`
    else if (!/[a-z0-9]/i.test(name)) errors.name = "Brand name must contain letters or numbers"
    else updates.name = name
  }

  if ("description" in raw) {
    const description = optionalString(raw.description)
    if (description === undefined) errors.description = "Description must be text"
    else if (description && description.length > MAX_DESCRIPTION_LENGTH)
      errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`
    else updates.description = description
  }

  if ("website_url" in raw) {
    const websiteUrl = optionalString(raw.website_url)
    if (websiteUrl === undefined || (websiteUrl && !isValidHttpUrl(websiteUrl)))
      errors.website_url = "Website URL must be a valid http(s) URL"
    else updates.website_url = websiteUrl
  }

  if ("affiliate_network" in raw) {
    const network = optionalString(raw.affiliate_network)
    if (network === undefined || (network && !AFFILIATE_NETWORKS.includes(network as AffiliateNetwork)))
      errors.affiliate_network = `Affiliate network must be one of: ${AFFILIATE_NETWORKS.join(", ")}`
    else updates.affiliate_network = network
  }

  return { updates, errors }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) return adminFailureResponse(adminCheck.message)
    const adminUserId = String(adminCheck.userId)

    const { id } = await params
    if (!isValidId(id)) return json({ success: false, message: "Brand not found" }, 404)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, message: "Invalid request body" }, 400)
    }
    const raw = body as Record<string, unknown>

    const allowedKeys = new Set<string>([...EDITABLE_FIELDS, "status"])
    const unknownKeys = Object.keys(raw).filter((key) => !allowedKeys.has(key))
    if (unknownKeys.length > 0) {
      return json({ success: false, message: `Fields cannot be updated: ${unknownKeys.join(", ")}` }, 400)
    }

    const isStatusChange = "status" in raw
    const hasFieldEdits = EDITABLE_FIELDS.some((field) => field in raw)
    if (isStatusChange && hasFieldEdits) {
      return json({ success: false, message: "Change status separately from other brand details" }, 400)
    }
    if (!isStatusChange && !hasFieldEdits) {
      return json({ success: false, message: "No changes submitted" }, 400)
    }

    const { data: current, error: loadError } = await loadBrand(id)
    if (loadError) {
      console.error("Error loading national brand for update:", loadError)
      return json({ success: false, message: "Failed to update national brand" }, 500)
    }
    if (!current) return json({ success: false, message: "Brand not found" }, 404)

    let updatePayload: Record<string, unknown>
    let action: "brand.updated" | "brand.status_changed"
    let changedFields: string[]
    let beforeSummary: Record<string, unknown>
    let afterSummary: Record<string, unknown>

    if (isStatusChange) {
      const nextStatus = raw.status
      if (typeof nextStatus !== "string" || !BRAND_STATUSES.includes(nextStatus as BrandStatus)) {
        return json(
          {
            success: false,
            message: "Validation failed",
            errors: { status: `Status must be one of: ${BRAND_STATUSES.join(", ")}` },
          },
          400,
        )
      }
      if (nextStatus === current.status) {
        return json({ success: true, unchanged: true, brand: current, message: "Status is already set" })
      }
      if (nextStatus === "active" && !hasApprovedLogo(current)) {
        return json(
          {
            success: false,
            message: "A brand cannot be activated until it has an approved logo.",
            errors: { status: "Approved logo required" },
          },
          422,
        )
      }
      updatePayload = { status: nextStatus }
      action = "brand.status_changed"
      changedFields = ["status"]
      beforeSummary = { status: current.status }
      afterSummary = { status: nextStatus }
    } else {
      const { updates, errors } = validateFieldUpdates(raw)
      if (Object.keys(errors).length > 0) {
        return json({ success: false, message: "Validation failed", errors }, 400)
      }
      const changed = (Object.keys(updates) as EditableField[]).filter(
        (field) => (updates[field] ?? null) !== (current[field] ?? null),
      )
      if (changed.length === 0) {
        return json({ success: true, unchanged: true, brand: current, message: "No changes to save" })
      }
      updatePayload = Object.fromEntries(changed.map((field) => [field, updates[field] ?? null]))
      action = "brand.updated"
      changedFields = changed
      beforeSummary = safeBrandSummary(current, changed)
      afterSummary = safeBrandSummary({ ...current, ...updatePayload } as BrandRow, changed)
    }

    const { data: brand, error: updateError } = await supabaseAdmin
      .from("national_brands")
      .update({ ...updatePayload, updated_by: adminUserId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(BRAND_COLUMNS)
      .maybeSingle<BrandRow>()

    if (updateError) {
      console.error("Error updating national brand:", updateError)
      return json({ success: false, message: "Failed to update national brand" }, 500)
    }
    if (!brand) return json({ success: false, message: "Brand not found" }, 404)

    const { error: auditError } = await supabaseAdmin.from("national_admin_audit_logs").insert({
      actor_user_id: adminUserId,
      action,
      entity_type: "national_brand",
      entity_id: brand.id,
      changed_fields: changedFields,
      before_summary: beforeSummary,
      after_summary: afterSummary,
    })

    const label = action === "brand.status_changed" ? "Status changed" : "Brand updated"

    if (auditError) {
      console.error(`Audit log failed for ${action} on national brand ${brand.id}:`, auditError)
      return json({
        success: true,
        partial: true,
        auditLogged: false,
        brand,
        canActivate: hasApprovedLogo(brand),
        message: `${label} (ID: ${brand.id}), but the audit log entry could not be recorded.`,
      })
    }

    return json({
      success: true,
      partial: false,
      auditLogged: true,
      brand,
      canActivate: hasApprovedLogo(brand),
      message: `${label}.`,
    })
  } catch (error) {
    console.error("Error updating national brand:", error)
    return json({ success: false, message: "An error occurred" }, 500)
  }
}
