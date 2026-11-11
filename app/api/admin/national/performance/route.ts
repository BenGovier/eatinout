import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
}

const PAGE_SIZE = 25
const MAX_PAGE = 10_000
const TOP_LIMIT = 10
const DEFAULT_RANGE_DAYS = 30
const MAX_RANGE_DAYS = 731
const DAY_MS = 24 * 60 * 60 * 1000
const BUCKETS = ["day", "week", "month"] as const
type Bucket = (typeof BUCKETS)[number]
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/
// Keeps the .in() filter URL well within PostgREST limits
const MAX_BRAND_OFFERS = 300
const POSTGREST_RANGE_NOT_SATISFIABLE = "PGRST103"

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

function unavailable() {
  return json({ success: false, message: "Reporting is temporarily unavailable" }, 500)
}

type Filters = {
  from: Date
  to: Date
  brandId: string | null
  bucket: Bucket
  page: number
}

// Date-only "to" values include the whole day, so they become the next midnight (UTC) as the exclusive bound
function parseBoundary(raw: string, kind: "from" | "to"): Date | null {
  if (DATE_ONLY_PATTERN.test(raw)) {
    const date = new Date(`${raw}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) return null
    return kind === "to" ? new Date(date.getTime() + DAY_MS) : date
  }
  if (ISO_DATETIME_PATTERN.test(raw)) {
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function parseFilters(params: URLSearchParams): { filters?: Filters; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  const rawTo = params.get("to")?.trim()
  const rawFrom = params.get("from")?.trim()
  const to = rawTo ? parseBoundary(rawTo, "to") : new Date()
  if (!to) errors.to = "Use YYYY-MM-DD or an ISO 8601 date-time with a timezone"
  const from = rawFrom
    ? parseBoundary(rawFrom, "from")
    : to
      ? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS)
      : null
  if (!from) errors.from = "Use YYYY-MM-DD or an ISO 8601 date-time with a timezone"
  if (from && to) {
    if (from.getTime() >= to.getTime()) errors.range = "'from' must be before 'to'"
    else if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS)
      errors.range = `Date range cannot exceed ${MAX_RANGE_DAYS} days`
  }

  const rawBrandId = params.get("brandId")?.trim() || null
  if (rawBrandId !== null && !ID_PATTERN.test(rawBrandId)) errors.brandId = "Invalid brand id"

  const rawBucket = params.get("bucket")?.trim() || "day"
  const bucket = (BUCKETS as readonly string[]).includes(rawBucket) ? (rawBucket as Bucket) : null
  if (!bucket) errors.bucket = "Bucket must be day, week or month"

  const rawPage = params.get("page")?.trim() || "1"
  const page = /^\d{1,5}$/.test(rawPage) ? Number(rawPage) : NaN
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) errors.page = `Page must be between 1 and ${MAX_PAGE}`

  if (Object.keys(errors).length > 0 || !from || !to || !bucket) return { errors }
  return { filters: { from, to, brandId: rawBrandId, bucket, page }, errors }
}

function toCount(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : value
  return typeof number === "number" && Number.isFinite(number) && number >= 0 ? number : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function mapArray<T>(value: unknown, mapItem: (item: Record<string, unknown>) => T | null): T[] | null {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) return null
  const items: T[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null
    const item = mapItem(raw as Record<string, unknown>)
    if (item === null) return null
    items.push(item)
  }
  return items
}

function withClaims<T extends object>(fields: T, claims: unknown): (T & { claims: number }) | null {
  const count = toCount(claims)
  return count === null ? null : { ...fields, claims: count }
}

function parseStats(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const stats = raw as Record<string, unknown>

  const totalClaims = toCount(stats.total_claims)
  const uniqueCustomers = toCount(stats.unique_customers)
  const claimsOverTime = mapArray(stats.claims_over_time, (row) =>
    withClaims({ period: asString(row.period) }, row.claims),
  )
  const topBrands = mapArray(stats.top_brands, (row) =>
    withClaims(
      { brandId: asString(row.brand_id), brandName: asString(row.brand_name), brandSlug: asString(row.brand_slug) },
      row.claims,
    ),
  )
  const topOffers = mapArray(stats.top_offers, (row) =>
    withClaims(
      { offerId: asString(row.offer_id), offerTitle: asString(row.offer_title), brandName: asString(row.brand_name) },
      row.claims,
    ),
  )
  const byMethod = mapArray(stats.by_method, (row) => withClaims({ method: asString(row.method) }, row.claims))

  if (
    totalClaims === null ||
    uniqueCustomers === null ||
    !claimsOverTime ||
    !topBrands ||
    !topOffers ||
    !byMethod
  ) {
    return null
  }
  return { totalClaims, uniqueCustomers, claimsOverTime, topBrands, topOffers, byMethod }
}

type ClaimRow = {
  user_id: string
  offer_id: string
  redemption_method: string | null
  claimed_at: string
}
type OfferRow = { id: string; title: string | null; brand_id: string | null }
type BrandRow = { id: string; name: string | null }
type UserRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  subscription_status: string | null
}

async function fetchByIds<T extends { id: string }>(table: string, columns: string, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map<string, T>()
  const { data, error } = await supabaseAdmin.from(table).select(columns).in("id", unique)
  if (error) throw new Error(`${table} lookup failed: ${error.message}`)
  return new Map(((data ?? []) as unknown as T[]).map((row) => [row.id, row]))
}

async function loadActivity(filters: Filters, brandOfferIds: string[] | null) {
  const offset = (filters.page - 1) * PAGE_SIZE
  const empty = { page: filters.page, pageSize: PAGE_SIZE, total: 0, totalPages: 0, items: [] }
  if (brandOfferIds && brandOfferIds.length === 0) return empty

  let query = supabaseAdmin
    .from("national_offer_claims")
    .select("user_id, offer_id, redemption_method, claimed_at", { count: "exact" })
    .gte("claimed_at", filters.from.toISOString())
    .lt("claimed_at", filters.to.toISOString())
  if (brandOfferIds) query = query.in("offer_id", brandOfferIds)

  const { data, error, count } = await query
    .order("claimed_at", { ascending: false })
    .order("offer_id", { ascending: true })
    .order("user_id", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (error) {
    // PostgREST rejects ranges that start past the last row; that is an empty page, not a failure
    if (error.code === POSTGREST_RANGE_NOT_SATISFIABLE) return { ...empty, total, totalPages }
    throw new Error(`Claims lookup failed: ${error.message}`)
  }

  const claims = (data ?? []) as ClaimRow[]
  const [offers, users] = await Promise.all([
    fetchByIds<OfferRow>("national_offers", "id, title, brand_id", claims.map((c) => c.offer_id)),
    fetchByIds<UserRow>(
      "users",
      "id, first_name, last_name, email, subscription_status",
      claims.map((c) => c.user_id),
    ),
  ])
  const brands = await fetchByIds<BrandRow>(
    "national_brands",
    "id, name",
    [...offers.values()].map((o) => o.brand_id ?? ""),
  )

  const items = claims.map((claim) => {
    const offer = offers.get(claim.offer_id)
    const brand = offer?.brand_id ? brands.get(offer.brand_id) : undefined
    const user = users.get(claim.user_id)
    return {
      claimedAt: claim.claimed_at,
      redemptionMethod: claim.redemption_method,
      offerId: claim.offer_id,
      offerTitle: offer?.title ?? null,
      brandId: offer?.brand_id ?? null,
      brandName: brand?.name ?? null,
      customer: {
        userId: claim.user_id,
        firstName: user?.first_name ?? null,
        lastName: user?.last_name ?? null,
        email: user?.email ?? null,
        currentSubscriptionStatus: user?.subscription_status ?? null,
      },
    }
  })

  return { page: filters.page, pageSize: PAGE_SIZE, total, totalPages, items }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req)
  if (!admin.success) return adminFailureResponse(admin.message)

  const { filters, errors } = parseFilters(req.nextUrl.searchParams)
  if (!filters) return json({ success: false, message: "Invalid filters", errors }, 400)

  try {
    let brandOfferIds: string[] | null = null
    if (filters.brandId) {
      const [brandResult, offersResult] = await Promise.all([
        supabaseAdmin.from("national_brands").select("id").eq("id", filters.brandId).maybeSingle(),
        supabaseAdmin
          .from("national_offers")
          .select("id")
          .eq("brand_id", filters.brandId)
          .limit(MAX_BRAND_OFFERS + 1),
      ])
      if (brandResult.error || offersResult.error) {
        console.error(
          "[admin/national/performance] Brand filter lookup failed:",
          brandResult.error?.message ?? offersResult.error?.message,
        )
        return unavailable()
      }
      if (!brandResult.data) return json({ success: false, message: "Brand not found" }, 404)
      const ids = (offersResult.data ?? []).map((row: { id: string }) => row.id)
      if (ids.length > MAX_BRAND_OFFERS) {
        console.error("[admin/national/performance] Brand has too many offers to filter activity safely")
        return unavailable()
      }
      brandOfferIds = ids
    }

    const [statsResult, activity] = await Promise.all([
      supabaseAdmin.rpc("national_offer_claim_stats", {
        p_from: filters.from.toISOString(),
        p_to: filters.to.toISOString(),
        p_brand_id: filters.brandId,
        p_bucket: filters.bucket,
        p_limit: TOP_LIMIT,
      }),
      loadActivity(filters, brandOfferIds),
    ])

    if (statsResult.error) {
      console.error("[admin/national/performance] Stats function failed:", statsResult.error.message)
      return unavailable()
    }
    const summary = parseStats(statsResult.data)
    if (!summary) {
      console.error("[admin/national/performance] Stats function returned an unexpected shape")
      return unavailable()
    }

    return json({
      success: true,
      filters: {
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        brandId: filters.brandId,
        bucket: filters.bucket,
      },
      summary,
      activity,
    })
  } catch (error) {
    console.error(
      "[admin/national/performance] Unexpected failure:",
      error instanceof Error ? error.message : "unknown error",
    )
    return unavailable()
  }
}
