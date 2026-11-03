// app/api/admin/restaurants/[id]/hide/route.ts
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

const RESTAURANT_DOC_SELECT = `
  id, name, slug, description, address, city, zip_code, phone, email, website, user_id, status,
  dine_in, dine_out, delivery_available, associated_id, address_link, is_hidden,
  subscription_status, stripe_customer_id, lat, lng,
  home_is_pinned, home_pin_priority, home_pinned_at, created_at, updated_at,
  restaurant_areas(area_id),
  restaurant_categories(category_id),
  restaurant_tags(tag_id),
  restaurant_images(image_url, display_order),
  restaurant_menu_pdfs(pdf_url, display_order),
  restaurant_area_pins(area_id, is_pinned, priority, pinned_at)
`

const mapRestaurantDoc = (r: any) => ({
  _id: r.id as string,
  name: r.name,
  slug: r.slug,
  description: r.description,
  address: r.address,
  city: r.city,
  zipCode: r.zip_code,
  area: (r.restaurant_areas || []).map((ra: any) => ra.area_id) as string[],
  phone: r.phone,
  email: r.email,
  website: r.website,
  userId: r.user_id as string | null,
  images: (r.restaurant_images || [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((i: any) => i.image_url) as string[],
  status: r.status as string,
  dineIn: r.dine_in,
  dineOut: r.dine_out,
  deliveryAvailable: r.delivery_available,
  category: (r.restaurant_categories || []).map((rc: any) => rc.category_id) as string[],
  associatedId: r.associated_id as string | null,
  addressLink: r.address_link,
  menuPdfUrls: (r.restaurant_menu_pdfs || [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((p: any) => p.pdf_url) as string[],
  hidden: r.is_hidden,
  subscriptionStatus: r.subscription_status,
  stripeCustomerId: r.stripe_customer_id,
  homePin: {
    isPinned: r.home_is_pinned,
    priority: r.home_pin_priority,
    pinnedAt: r.home_pinned_at,
  },
  areaPins: (r.restaurant_area_pins || []).map((p: any) => ({
    areaId: p.area_id,
    isPinned: p.is_pinned,
    priority: p.priority,
    areaPinnedAt: p.pinned_at,
  })),
  searchTags: (r.restaurant_tags || []).map((t: any) => t.tag_id) as string[],
  lat: r.lat,
  lng: r.lng,
  ...(r.lat != null && r.lng != null
    ? { location: { type: "Point", coordinates: [r.lng, r.lat] } }
    : {}),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const getRestaurantDocById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select(RESTAURANT_DOC_SELECT)
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRestaurantDoc(data) : null
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const { hidden } = await req.json()

    // Validate the hidden value
    if (typeof hidden !== 'boolean') {
      return NextResponse.json(
        { success: false, message: "Invalid hidden value" },
        { status: 400 }
      )
    }

    // Update the restaurant's hidden status
    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ is_hidden: hidden })
      .eq("id", params.id)
      .select("id")
      .maybeSingle()
    if (updateError) throw new Error(updateError.message)
    const restaurant = updatedRow ? await getRestaurantDocById(params.id) : null

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Restaurant ${hidden ? 'hidden' : 'unhidden'} successfully`,
      restaurant
    })
  } catch (error: unknown) {
    console.error("Error updating restaurant hidden status:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update restaurant hidden status",
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}