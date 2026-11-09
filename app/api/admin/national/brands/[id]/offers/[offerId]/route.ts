import { NextResponse, type NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"
import { OFFER_EDITOR_COLUMNS } from "@/lib/national/offer-columns"

export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" }
const MAX_ID_LENGTH = 200
const BRAND_COLUMNS = "id, name, status, logo_url"

type RouteContext = { params: Promise<{ id: string; offerId: string }> }

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
