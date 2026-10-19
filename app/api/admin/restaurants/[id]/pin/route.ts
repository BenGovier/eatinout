// app/api/admin/restaurants/[id]/pin/route.ts
import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

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
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    const { pinType, priority, areaUpdates } = await req.json();
    const { id } = params;

    if (!["home", "area", "unpinHome", "unpinAll"].includes(pinType)) {
      return NextResponse.json(
        { success: false, message: "Invalid pin type" },
        { status: 400 }
      );
    }

    /** ================= HOME PIN ================= */
    if (pinType === "home") {
      const homePriority =
        typeof priority === "number" && priority >= 1 && priority <= 100
          ? priority
          : 1;

      const { data: pinnedRow, error: pinError } = await supabaseAdmin
        .from("restaurants")
        .update({
          home_is_pinned: true,
          home_pin_priority: homePriority,
          home_pinned_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (pinError) throw new Error(pinError.message);
      const restaurant = pinnedRow ? await getRestaurantDocById(id) : null;

      if (!restaurant) {
        return NextResponse.json(
          { success: false, message: "Restaurant not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Home pin updated successfully",
        restaurant,
      });
    }

    if (pinType === "unpinHome") {
      const { error: unpinError } = await supabaseAdmin
        .from("restaurants")
        .update({
          home_is_pinned: false,
          home_pin_priority: null,
          home_pinned_at: null,
        })
        .eq("id", id);
      if (unpinError) throw new Error(unpinError.message);
      const restaurant = await getRestaurantDocById(id);

      return NextResponse.json({
        success: true,
        message: "Home unpinned successfully",
        restaurant,
      });
    }

    /** ================= AREA PIN ================= */
  if (pinType === "area") {
      if (!Array.isArray(areaUpdates)) {
        return NextResponse.json(
          { success: false, message: "Invalid area updates" },
          { status: 400 }
        );
      }

      const areaPins =
        areaUpdates.length === 0
          ? []
          : areaUpdates.map((u) => ({
              areaId: u.areaId,
              isPinned: true,
              priority:
                typeof u.priority === "number" &&
                u.priority >= 1 &&
                u.priority <= 100
                  ? u.priority
                  : null,
              areaPinnedAt: new Date(),
            }));

      // restaurant_area_pins has one row per (restaurant, area): last entry wins for duplicates
      const pinRows = Array.from(
        new Map(
          areaPins.map((p) => [
            String(p.areaId),
            {
              restaurant_id: id,
              area_id: String(p.areaId),
              is_pinned: p.isPinned,
              priority: p.priority,
              pinned_at: p.areaPinnedAt.toISOString(),
            },
          ])
        ).values()
      );

      // Upsert the new pins first, then remove the pins that are no longer selected
      if (pinRows.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("restaurant_area_pins")
          .upsert(pinRows, { onConflict: "restaurant_id,area_id" });
        if (upsertError) throw new Error(upsertError.message);
      }
      let removeQuery: any = supabaseAdmin
        .from("restaurant_area_pins")
        .delete()
        .eq("restaurant_id", id);
      if (pinRows.length > 0) {
        removeQuery = removeQuery.not(
          "area_id",
          "in",
          `(${pinRows.map((p) => `"${p.area_id.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")})`
        );
      }
      const { error: removeError } = await removeQuery;
      if (removeError) throw new Error(removeError.message);
      const restaurant = await getRestaurantDocById(id);

      return NextResponse.json({
        success: true,
        message: "Area pins updated successfully",
        restaurant,
      });
    }

    /** ================= UNPIN ALL ================= */
    if (pinType === "unpinAll") {
      const { error: unpinAllError } = await supabaseAdmin
        .from("restaurants")
        .update({
          home_is_pinned: false,
          home_pin_priority: null,
          home_pinned_at: null,
        })
        .eq("id", id);
      if (unpinAllError) throw new Error(unpinAllError.message);
      const { error: clearPinsError } = await supabaseAdmin
        .from("restaurant_area_pins")
        .delete()
        .eq("restaurant_id", id);
      if (clearPinsError) throw new Error(clearPinsError.message);
      const restaurant = await getRestaurantDocById(id);

      return NextResponse.json({
        success: true,
        message: "Unpinned from all locations",
        restaurant,
      });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Pin failed" },
      { status: 500 }
    );
  }
}