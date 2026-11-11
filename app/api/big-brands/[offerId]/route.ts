import { NextResponse } from "next/server"
import { OFFER_ID_PATTERN, hasText, isOfferLive as isLive } from "@/lib/national/public-offer-rules"

export const dynamic = "force-dynamic"

// Explicit public-safe columns only. Destinations, voucher codes, tracking and admin fields are never selected.
const PUBLIC_BRAND_COLUMNS = "id, name, slug, logo_url"
const PUBLIC_OFFER_COLUMNS = "id, brand_id, title, deal_label, description, terms, offer_image_url, starts_at, ends_at"

const UUID_PATTERN = OFFER_ID_PATTERN

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

export type PublicBigBrandOfferDetail = {
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

function notFound() {
  return NextResponse.json({ error: "Offer not found." }, { status: 404, headers: NO_STORE_HEADERS })
}

function unavailable() {
  return NextResponse.json(
    { error: "This offer is unavailable right now." },
    { status: 503, headers: NO_STORE_HEADERS },
  )
}

export async function GET(_request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params
  if (!UUID_PATTERN.test(offerId)) return notFound()

  try {
    // Imported lazily because the shared admin client throws while loading when credentials are missing.
    const { supabaseAdmin } = await import("@/lib/supabase/admin")

    const nowDate = new Date()
    const nowIso = nowDate.toISOString()
    const now = nowDate.getTime()

    const { data: offer, error: offerError } = await supabaseAdmin
      .from("national_offers")
      .select(PUBLIC_OFFER_COLUMNS)
      .eq("id", offerId)
      .eq("publication_status", "published")
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gt."${nowIso}"`)
      .not("offer_image_url", "is", null)
      .neq("offer_image_url", "")
      .maybeSingle<OfferRow>()

    if (offerError) {
      console.error("[big-brands/detail] Offer lookup failed:", offerError.message)
      return unavailable()
    }
    if (!offer || !isLive(offer, now)) return notFound()
    if (!hasText(offer.title) || !hasText(offer.deal_label) || !hasText(offer.offer_image_url)) return notFound()

    const { data: brand, error: brandError } = await supabaseAdmin
      .from("national_brands")
      .select(PUBLIC_BRAND_COLUMNS)
      .eq("id", offer.brand_id)
      .eq("status", "active")
      .maybeSingle<BrandRow>()

    if (brandError) {
      console.error("[big-brands/detail] Brand lookup failed:", brandError.message)
      return unavailable()
    }
    if (!brand || !hasText(brand.logo_url)) return notFound()

    const detail: PublicBigBrandOfferDetail = {
      id: offer.id,
      title: offer.title,
      deal_label: offer.deal_label,
      description: offer.description,
      terms: offer.terms,
      offer_image_url: offer.offer_image_url,
      starts_at: offer.starts_at as string,
      ends_at: offer.ends_at || null,
      brand: { name: brand.name, slug: brand.slug, logo_url: brand.logo_url },
    }

    return NextResponse.json({ offer: detail }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error("[big-brands/detail] Unexpected failure:", error instanceof Error ? error.message : error)
    return unavailable()
  }
}
