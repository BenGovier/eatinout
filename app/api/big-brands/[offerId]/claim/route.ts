import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { OFFER_ID_PATTERN, hasText, isOfferLive } from "@/lib/national/public-offer-rules"

export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" }

const REDEMPTION_REQUIREMENTS = {
  link: { url: true, code: false },
  code: { url: false, code: true },
  link_and_code: { url: true, code: true },
} as const

type RedemptionMethod = keyof typeof REDEMPTION_REQUIREMENTS

type OfferRow = {
  id: string
  brand_id: string
  title: string | null
  deal_label: string | null
  offer_image_url: string | null
  starts_at: string | null
  ends_at: string | null
  redemption_method: string | null
}

type DestinationRow = { destination_url: string | null; voucher_code: string | null }

function isRedemptionMethod(value: string | null): value is RedemptionMethod {
  return value !== null && Object.prototype.hasOwnProperty.call(REDEMPTION_REQUIREMENTS, value)
}

function respond(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

const unauthorized = () => respond(401, { error: "Please sign in to claim this offer." })
const notClaimable = () => respond(404, { error: "This offer is not available to claim." })
const unavailable = () => respond(503, { error: "This offer can't be claimed right now. Please try again shortly." })

function getAuthenticatedUserId(token: string | undefined): string | null {
  const secret = process.env.JWT_SECRET
  if (!token || !secret) return null
  try {
    const decoded = jwt.verify(token, secret)
    if (typeof decoded !== "object" || decoded === null) return null
    const userId = (decoded as { userId?: unknown }).userId
    return typeof userId === "string" && userId.trim() !== "" ? userId : null
  } catch {
    return null
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const cookieStore = await cookies()
  const userId = getAuthenticatedUserId(cookieStore.get("auth_token")?.value)
  if (!userId) return unauthorized()

  const { offerId } = await params
  if (!OFFER_ID_PATTERN.test(offerId)) return notClaimable()

  try {
    // Imported lazily because the shared admin client throws while loading when credentials are missing.
    const { supabaseAdmin } = await import("@/lib/supabase/admin")

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("is_deleted", false)
      .maybeSingle<{ id: string }>()

    if (userError) {
      console.error("[big-brands/claim] User lookup failed:", userError.message)
      return unavailable()
    }
    if (!user) return unauthorized()

    const nowDate = new Date()
    const nowIso = nowDate.toISOString()

    const { data: offer, error: offerError } = await supabaseAdmin
      .from("national_offers")
      .select("id, brand_id, title, deal_label, offer_image_url, starts_at, ends_at, redemption_method")
      .eq("id", offerId)
      .eq("publication_status", "published")
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gt."${nowIso}"`)
      .not("offer_image_url", "is", null)
      .neq("offer_image_url", "")
      .maybeSingle<OfferRow>()

    if (offerError) {
      console.error("[big-brands/claim] Offer lookup failed:", offerError.message)
      return unavailable()
    }
    if (!offer || !isOfferLive(offer, nowDate.getTime())) return notClaimable()
    if (!hasText(offer.title) || !hasText(offer.deal_label) || !hasText(offer.offer_image_url)) return notClaimable()
    if (!isRedemptionMethod(offer.redemption_method)) return notClaimable()
    const method = offer.redemption_method

    const { data: brand, error: brandError } = await supabaseAdmin
      .from("national_brands")
      .select("id, logo_url")
      .eq("id", offer.brand_id)
      .eq("status", "active")
      .maybeSingle<{ id: string; logo_url: string | null }>()

    if (brandError) {
      console.error("[big-brands/claim] Brand lookup failed:", brandError.message)
      return unavailable()
    }
    if (!brand || !hasText(brand.logo_url)) return notClaimable()

    const { data: destination, error: destinationError } = await supabaseAdmin
      .from("national_offer_destinations")
      .select("destination_url, voucher_code")
      .eq("offer_id", offer.id)
      .maybeSingle<DestinationRow>()

    if (destinationError) {
      console.error("[big-brands/claim] Redemption details lookup failed:", destinationError.message)
      return unavailable()
    }

    const needs = REDEMPTION_REQUIREMENTS[method]
    const destinationUrl = destination?.destination_url
    const voucherCode = destination?.voucher_code
    if (needs.url && !hasText(destinationUrl)) return notClaimable()
    if (needs.code && !hasText(voucherCode)) return notClaimable()

    const { error: claimError } = await supabaseAdmin
      .from("national_offer_claims")
      .insert({ user_id: user.id, offer_id: offer.id, redemption_method: method })

    if (claimError) {
      console.error("[big-brands/claim] Recording claim failed:", claimError.message)
      return respond(500, { error: "We couldn't complete your claim. Please try again." })
    }

    return respond(200, {
      redemption_method: method,
      ...(needs.url ? { destination_url: destinationUrl } : {}),
      ...(needs.code ? { voucher_code: voucherCode } : {}),
    })
  } catch (error) {
    console.error("[big-brands/claim] Unexpected failure:", error instanceof Error ? error.message : "unknown error")
    return unavailable()
  }
}
