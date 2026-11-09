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

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      // verifyAdminToken signals a valid session without the admin role via this message
      const isForbidden = adminCheck.message === "Unauthorized - Not an admin"
      return json(
        { success: false, message: isForbidden ? "Forbidden" : "Unauthorized" },
        isForbidden ? 403 : 401,
      )
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
