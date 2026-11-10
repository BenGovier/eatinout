import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const HOMEPAGE_OFFER_LIMIT = 12
const BRAND_LOOKUP_LIMIT = 200

// Explicit public-safe columns only. Destinations, voucher codes, tracking and admin fields are never selected.
const PUBLIC_BRAND_COLUMNS = "id, name, slug, logo_url"
const PUBLIC_OFFER_COLUMNS = "id, brand_id, title, deal_label, description, terms, offer_image_url, starts_at, ends_at"

// Short shared cache with no stale-serving window, so paused or expired offers drop off within ~30s.
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=30, must-revalidate",
}

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

type BrandRow = { id: string; name: string; slug: string; logo_url: string | null }

type OfferRow = {
  id: string
  brand_id: string
  title: string | null
  deal_label: string | null
  description: string | null
  terms: string | null
  offer_image_url: string | null
  starts_at: string | null
  ends_at: string | null
}

export type PublicBigBrandOffer = {
  id: string
  title: string
  deal_label: string
  description: string | null
  terms: string | null
  offer_image_url: string
  starts_at: string
  ends_at: string | null
  brand: { name: string; slug: string; logo_url: string }
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function isLive(offer: OfferRow, now: number) {
  if (!hasText(offer.starts_at)) return false
  const startsAt = Date.parse(offer.starts_at)
  if (Number.isNaN(startsAt) || startsAt > now) return false
  if (offer.ends_at === null || offer.ends_at === "") return true
  const endsAt = Date.parse(offer.ends_at)
  return !Number.isNaN(endsAt) && endsAt > now
}

function unavailable() {
  return NextResponse.json(
    { error: "Big Brand offers are unavailable right now." },
    { status: 503, headers: NO_STORE_HEADERS },
  )
}

export async function GET() {
  try {
    // Imported lazily because the shared admin client throws while loading when credentials are missing;
    // a static import would fail before this handler's error handling could run.
    const { supabaseAdmin } = await import("@/lib/supabase/admin")

    const nowDate = new Date()
    const nowIso = nowDate.toISOString()
    const now = nowDate.getTime()

    const { data: brands, error: brandsError } = await supabaseAdmin
      .from("national_brands")
      .select(PUBLIC_BRAND_COLUMNS)
      .eq("status", "active")
      .not("logo_url", "is", null)
      .neq("logo_url", "")
      .limit(BRAND_LOOKUP_LIMIT)
      .returns<BrandRow[]>()

    if (brandsError) {
      console.error("[big-brands] Brand lookup failed:", brandsError.message)
      return unavailable()
    }

    const brandsById = new Map((brands ?? []).filter((b) => hasText(b.logo_url)).map((b) => [b.id, b]))
    if (brandsById.size === 0) {
      return NextResponse.json({ offers: [] }, { headers: CACHE_HEADERS })
    }

    const { data: offers, error: offersError } = await supabaseAdmin
      .from("national_offers")
      .select(PUBLIC_OFFER_COLUMNS)
      .eq("publication_status", "published")
      .in("brand_id", [...brandsById.keys()])
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gt."${nowIso}"`)
      .not("offer_image_url", "is", null)
      .neq("offer_image_url", "")
      .order("starts_at", { ascending: false })
      .limit(HOMEPAGE_OFFER_LIMIT)
      .returns<OfferRow[]>()

    if (offersError) {
      console.error("[big-brands] Offer lookup failed:", offersError.message)
      return unavailable()
    }

    const publicOffers: PublicBigBrandOffer[] = []
    for (const offer of offers ?? []) {
      const brand = brandsById.get(offer.brand_id)
      if (!brand || !hasText(brand.logo_url)) continue
      if (!hasText(offer.title) || !hasText(offer.deal_label) || !hasText(offer.offer_image_url)) continue
      if (!isLive(offer, now)) continue

      publicOffers.push({
        id: offer.id,
        title: offer.title,
        deal_label: offer.deal_label,
        description: offer.description,
        terms: offer.terms,
        offer_image_url: offer.offer_image_url,
        starts_at: offer.starts_at as string,
        ends_at: offer.ends_at || null,
        brand: { name: brand.name, slug: brand.slug, logo_url: brand.logo_url },
      })
    }

    return NextResponse.json({ offers: publicOffers }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error("[big-brands] Unexpected failure:", error instanceof Error ? error.message : error)
    return unavailable()
  }
}
