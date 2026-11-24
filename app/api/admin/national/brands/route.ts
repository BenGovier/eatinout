import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

export const dynamic = "force-dynamic"

const BRAND_COLUMNS =
  "id, name, slug, description, logo_url, website_url, affiliate_network, status, created_at, updated_at"

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

const AFFILIATE_NETWORKS = ["CJ", "Impact", "Direct", "Other"] as const
type AffiliateNetwork = (typeof AFFILIATE_NETWORKS)[number]

const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_URL_LENGTH = 2048
const POSTGRES_UNIQUE_VIOLATION = "23505"

function adminFailureResponse(message: string | undefined) {
  // verifyAdminToken signals a valid session without the admin role via this message
  const isForbidden = message === "Unauthorized - Not an admin"
  return json(
    { success: false, message: isForbidden ? "Forbidden" : "Unauthorized" },
    isForbidden ? 403 : 401,
  )
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "")
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

type BrandInput = {
  name: string
  slug: string
  description: string | null
  website_url: string | null
  affiliate_network: AffiliateNetwork | null
}

function validateBrandInput(body: unknown): { input?: BrandInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: { form: "Invalid request body" } }
  }
  const raw = body as Record<string, unknown>

  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  if (!name) errors.name = "Brand name is required"
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Brand name must be ${MAX_NAME_LENGTH} characters or fewer`

  const slug = name ? slugify(name) : ""
  if (name && !errors.name && !slug) errors.name = "Brand name must contain letters or numbers"

  const description = optionalString(raw.description)
  if (description === undefined) errors.description = "Description must be text"
  else if (description && description.length > MAX_DESCRIPTION_LENGTH)
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`

  const websiteUrl = optionalString(raw.website_url)
  if (websiteUrl === undefined || (websiteUrl && !isValidHttpUrl(websiteUrl)))
    errors.website_url = "Website URL must be a valid http(s) URL"

  // Logos will only be set through the dedicated uploader, never from a submitted URL
  if (raw.logo_url !== undefined && raw.logo_url !== null && raw.logo_url !== "")
    errors.logo_url = "Logo URLs cannot be submitted. Logo upload is handled separately."

  const network = optionalString(raw.affiliate_network)
  if (network === undefined || (network && !AFFILIATE_NETWORKS.includes(network as AffiliateNetwork)))
    errors.affiliate_network = `Affiliate network must be one of: ${AFFILIATE_NETWORKS.join(", ")}`

  if (Object.keys(errors).length > 0) return { errors }

  return {
    errors,
    input: {
      name,
      slug,
      description: description ?? null,
      website_url: websiteUrl ?? null,
      affiliate_network: (network as AffiliateNetwork | null) ?? null,
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success || !adminCheck.userId) {
      return adminFailureResponse(adminCheck.message)
    }
    const adminUserId = String(adminCheck.userId)

    const body = await req.json().catch(() => null)
    const { input, errors } = validateBrandInput(body)
    if (!input) {
      return json({ success: false, message: "Validation failed", errors }, 400)
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("national_brands")
      .select("id")
      .eq("slug", input.slug)
      .maybeSingle()

    if (lookupError) {
      console.error("Error checking national brand slug:", lookupError)
      return json({ success: false, message: "Failed to create national brand" }, 500)
    }
    if (existing) {
      return json(
        {
          success: false,
          message: "A brand with this name already exists",
          errors: { name: `The slug "${input.slug}" is already in use` },
        },
        409,
      )
    }

    const { data: brand, error: insertError } = await supabaseAdmin
      .from("national_brands")
      .insert({
        ...input,
        status: "draft",
        created_by: adminUserId,
        updated_by: adminUserId,
      })
      .select(BRAND_COLUMNS)
      .single()

    if (insertError || !brand) {
      if (insertError?.code === POSTGRES_UNIQUE_VIOLATION) {
        return json(
          {
            success: false,
            message: "A brand with this name already exists",
            errors: { name: `The slug "${input.slug}" is already in use` },
          },
          409,
        )
      }
      console.error("Error creating national brand:", insertError)
      return json({ success: false, message: "Failed to create national brand" }, 500)
    }

    const changedFields: string[] = [
      ...(Object.keys(input) as (keyof BrandInput)[]).filter((key) => input[key] !== null),
      "status",
      "created_by",
    ]

    const { error: auditError } = await supabaseAdmin.from("national_admin_audit_logs").insert({
      actor_user_id: adminUserId,
      action: "brand.created",
      entity_type: "national_brand",
      entity_id: brand.id,
      changed_fields: changedFields,
      before_summary: null,
      after_summary: {
        name: brand.name,
        slug: brand.slug,
        status: brand.status,
        affiliate_network: brand.affiliate_network,
        has_description: Boolean(brand.description),
        has_website_url: Boolean(brand.website_url),
        has_logo_url: Boolean(brand.logo_url),
      },
    })

    if (auditError) {
      console.error(`Audit log failed for created national brand ${brand.id}:`, auditError)
      return json(
        {
          success: true,
          partial: true,
          auditLogged: false,
          brand,
          message: `Brand created (ID: ${brand.id}), but the audit log entry could not be recorded.`,
        },
        201,
      )
    }

    return json({ success: true, partial: false, auditLogged: true, brand }, 201)
  } catch (error) {
    console.error("Error creating national brand:", error)
    return json({ success: false, message: "An error occurred" }, 500)
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return adminFailureResponse(adminCheck.message)
    }

    const { data, error } = await supabaseAdmin
      .from("national_brands")
      .select(BRAND_COLUMNS)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching national brands:", error)
      return json({ success: false, message: "Failed to fetch national brands" }, 500)
    }

    return json({ success: true, brands: data ?? [] })
  } catch (error) {
    console.error("Error in national brands route:", error)
    return json({ success: false, message: "An error occurred" }, 500)
  }
}
