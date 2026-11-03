// app/api/admin/restaurants/[id]/route.ts
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

const OFFER_DOC_SELECT = `
  id, restaurant_id, title, description, valid_days, valid_hours, start_date, expiry_date, terms, status,
  dine_in, dine_out, discount_percentage, free_item_name, other_offer_description, offer_type, offer_limit,
  associated_id, redeem_count, max_redemption_limit, is_unlimited, is_deactivated, run_until_further,
  booking_requirement, is_pinned, pinned_at, recurring_type, recurring_start_date, current_period_count,
  last_reset_date, created_at, updated_at,
  offer_areas(area_id), offer_tags(tag_id)
`

const mapOfferDoc = (o: any) => ({
  _id: o.id,
  restaurantId: o.restaurant_id,
  title: o.title,
  description: o.description,
  validDays: o.valid_days,
  validHours: o.valid_hours,
  startDate: o.start_date,
  expiryDate: o.expiry_date,
  terms: o.terms,
  status: o.status,
  dineIn: o.dine_in,
  dineOut: o.dine_out,
  areas: (o.offer_areas || []).map((x: any) => x.area_id),
  tags: (o.offer_tags || []).map((x: any) => x.tag_id),
  discountPercentage: o.discount_percentage,
  freeItemName: o.free_item_name,
  otherOfferDescription: o.other_offer_description,
  offerType: o.offer_type,
  offerLimit: o.offer_limit,
  associatedId: o.associated_id,
  redeemCount: o.redeem_count,
  maxRedemptionLimit: o.max_redemption_limit,
  isUnlimited: o.is_unlimited,
  deactivated: o.is_deactivated,
  runUntilFurther: o.run_until_further,
  bookingRequirement: o.booking_requirement,
  isPinned: o.is_pinned,
  pinnedAt: o.pinned_at,
  recurringType: o.recurring_type,
  recurringStartDate: o.recurring_start_date,
  currentPeriodCount: o.current_period_count,
  lastResetDate: o.last_reset_date,
  createdAt: o.created_at,
  updatedAt: o.updated_at,
})

// Replace a restaurant's rows in a plain junction table (restaurant_areas / restaurant_categories / restaurant_tags):
// insert the missing ones first, then delete the rest (so a failure never leaves the restaurant without links)
const replaceRestaurantLinks = async (
  table: string,
  restaurantId: string,
  column: string,
  values: any[]
) => {
  const unique = Array.from(new Set((values || []).filter(Boolean).map(String)))
  if (unique.length > 0) {
    const { error } = await supabaseAdmin
      .from(table)
      .upsert(
        unique.map((v) => ({ restaurant_id: restaurantId, [column]: v })),
        { onConflict: `restaurant_id,${column}`, ignoreDuplicates: true }
      )
    if (error) throw new Error(error.message)
  }
  let del: any = supabaseAdmin.from(table).delete().eq("restaurant_id", restaurantId)
  if (unique.length > 0) {
    del = del.not(
      column,
      "in",
      `(${unique.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")})`
    )
  }
  const { error: delError } = await del
  if (delError) throw new Error(delError.message)
}

// Replace a restaurant's rows in an ordered child table (restaurant_images / restaurant_menu_pdfs):
// insert the new rows first, then delete the old ones
const replaceRestaurantOrdered = async (
  table: string,
  restaurantId: string,
  column: string,
  values: any[]
) => {
  const { data: oldRows, error: oldError } = await supabaseAdmin
    .from(table)
    .select("id")
    .eq("restaurant_id", restaurantId)
  if (oldError) throw new Error(oldError.message)
  const list = (values || []).filter(Boolean)
  if (list.length > 0) {
    const { error } = await supabaseAdmin
      .from(table)
      .insert(list.map((v, i) => ({ restaurant_id: restaurantId, [column]: v, display_order: i + 1 })))
    if (error) throw new Error(error.message)
  }
  const oldIds = (oldRows || []).map((r: any) => r.id)
  if (oldIds.length > 0) {
    const { error } = await supabaseAdmin.from(table).delete().in("id", oldIds)
    if (error) throw new Error(error.message)
  }
}

// Supabase helpers: read the name of a category/tag by id, and throw on DB errors
const findNameById = async (table: string, id: string) => {
  const { data, error } = await supabaseAdmin.from(table).select("name").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}
const dbCheck = (res: { error: any }) => {
  if (res.error) throw new Error(res.error.message)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get restaurant details
    // const restaurant = await Restaurant.findById(id);
    const restaurant = await getRestaurantDocById(id); // 🔥 THIS IS THE FIX

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant not found",
        },
        { status: 404 }
      );
    }

    // Get restaurant offers
    const offerRows = await supabaseAdmin
      .from("offers")
      .select(OFFER_DOC_SELECT)
      .eq("restaurant_id", id)
    dbCheck(offerRows)
    const offers = (offerRows.data || []).map(mapOfferDoc);

    // Sort offers: pinned first by pinnedAt DESC (most recently pinned first), then unpinned by createdAt descending
    const sortedOffers = offers.sort((a: any, b: any) => {
      // If both are pinned, sort by pinnedAt descending (most recent first)
      if (a.isPinned && b.isPinned) {
        const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bTime - aTime; // DESC order
      }
      // Pinned offers come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Both unpinned: sort by createdAt descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Adjust offer status in-memory based on dates and deactivation
    const now = new Date();
    const offersWithAdjustedStatus = sortedOffers.map((offer: any) => {
      let adjustedStatus = offer.status;
      if (!offer.deactivated) {
        const startDate = offer.startDate ? new Date(offer.startDate) : null;
        const expiryDate = offer.expiryDate ? new Date(offer.expiryDate) : null;

        if (startDate && startDate > now) adjustedStatus = "inactive";
        else if (expiryDate && expiryDate < now) adjustedStatus = "expired";
        else if (startDate && startDate <= now && (!expiryDate || expiryDate > now)) adjustedStatus = "active";
        else if (!expiryDate) adjustedStatus = "active";
      }

      return { ...offer, status: adjustedStatus };
    });

    // Fetch category details (support array or single value)
    let categories = [];
    if (Array.isArray(restaurant.category)) {
      categories = await Promise.all(
        restaurant.category.map(async (catId: any) => {
          const category = await findNameById("categories", catId);
          return {
            id: catId,
            name: category ? category.name : null
          };
        })
      );
    } else if (restaurant.category) {
      const category = await findNameById("categories", restaurant.category);
      categories = [{
        id: restaurant.category,
        name: category ? category.name : null
      }];
    }


    // 🔥 Resolve searchTags (ID -> { _id, name })
    let resolvedSearchTags: Array<{ _id: string; name: string | null }> = [];

    if (Array.isArray(restaurant.searchTags) && restaurant.searchTags.length > 0) {
      resolvedSearchTags = await Promise.all(
        restaurant.searchTags.map(async (tagId: string) => {
          const tag = await findNameById("tags", tagId);
          return {
            _id: tagId,
            name: tag ? tag.name : null,
          };
        })
      );
    }

    // Convert restaurant to plain object and add categories array
    const restaurantWithCategory = {
      ...restaurant,
      category: categories,
      searchTags: resolvedSearchTags,
      homePriority: (restaurant as any).homePriority ?? 0, // ✅ ADD THIS LINE
    };

    return NextResponse.json({
      success: true,
      restaurant: restaurantWithCategory,
      offers: offersWithAdjustedStatus,
    })
  } catch (error: unknown) {
    console.error("Error fetching restaurant details:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurant details",
        error: errorMessage,
      },
      { status: 500 },
    )
  }
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

    const { id } = params

    // Get request data
    const data = await req.json()

    console.log("idd", id)
    // Check if restaurant exists
    const existingRestaurant = await getRestaurantDocById(id)
    if (!existingRestaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      )
    }

    // Create update object with only the fields that are provided in the request
    const updateData: Record<string, any> = {}

    // Check each field and only include it if it's provided in the request
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.website !== undefined) updateData.website = data.website
    if (data.area !== undefined) updateData.area = data.area
    if (data.address !== undefined) updateData.address = data.address
    if (data.city !== undefined) updateData.city = data.city
    if (data.state !== undefined) updateData.state = data.state
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode
    if (data.status !== undefined) updateData.status = data.status
    if (data.category !== undefined) updateData.category = data.category
    if (data.description !== undefined) updateData.description = data.description
    if (data.name !== undefined) updateData.name = data.name
    if (data.dineOut !== undefined) updateData.dineOut = data.dineOut
    if (data.deliveryAvailable !== undefined) updateData.deliveryAvailable = data.deliveryAvailable
    if (data.menuPdfUrls !== undefined) updateData.menuPdfUrls = data.menuPdfUrls;
    if (data.dineIn !== undefined) updateData.dineIn = data.dineIn
    if (data.images !== undefined) updateData.images = data.images
    if (data.searchTags !== undefined) updateData.searchTags = data.searchTags


    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date()

    // Geocoding logic: if address-related fields are updated, geocode them
    const addressChanged = data.address !== undefined && data.address !== existingRestaurant.address;
    const cityChanged = data.city !== undefined && data.city !== existingRestaurant.city;
    const zipCodeChanged = data.zipCode !== undefined && data.zipCode !== existingRestaurant.zipCode;
    const missingCoords = !existingRestaurant.lat || !existingRestaurant.lng;

    if (addressChanged || cityChanged || zipCodeChanged || missingCoords) {
      try {
        const { getCoordinatesFromAddress } = await import("@/utils/geocoding");
        const targetAddress = typeof data.address === "string" ? data.address : existingRestaurant.address || "";
        const targetCity = typeof data.city === "string" ? data.city : existingRestaurant.city || "";
        const targetZipCode = typeof data.zipCode === "string" ? data.zipCode : existingRestaurant.zipCode || "";
        
        const coords = await getCoordinatesFromAddress(targetAddress, targetCity, targetZipCode);
        if (coords) {
          updateData.lat = coords.lat;
          updateData.lng = coords.lng;
          updateData.location = {
            type: "Point" as const,
            coordinates: [coords.lng, coords.lat],
          };
        }
      } catch (geocodeError) {
        console.error("Geocoding failed during admin update:", geocodeError);
      }
    } else if (data.lat !== undefined && data.lng !== undefined) {
      // If admin explicitly provided lat/lng
      updateData.lat = data.lat;
      updateData.lng = data.lng;
      updateData.location = {
        type: "Point" as const,
        coordinates: [data.lng, data.lat],
      };
    }

    // Update restaurant in database with only the fields that were provided
    // (updateData keys -> restaurants columns; arrays live in their own tables; updated_at is set by a DB trigger)
    const columnMap: Record<string, string> = {
      email: "email",
      phone: "phone",
      website: "website",
      address: "address",
      city: "city",
      zipCode: "zip_code",
      status: "status",
      description: "description",
      name: "name",
      dineOut: "dine_out",
      deliveryAvailable: "delivery_available",
      dineIn: "dine_in",
      lat: "lat",
      lng: "lng",
    }
    const columnUpdate: Record<string, any> = {}
    for (const key of Object.keys(columnMap)) {
      if (updateData[key] !== undefined) columnUpdate[columnMap[key]] = updateData[key]
    }
    if (Object.keys(columnUpdate).length > 0) {
      dbCheck(await supabaseAdmin.from("restaurants").update(columnUpdate).eq("id", id))
    }
    if (Array.isArray(updateData.area)) {
      await replaceRestaurantLinks("restaurant_areas", id, "area_id", updateData.area)
    }
    if (Array.isArray(updateData.category)) {
      await replaceRestaurantLinks("restaurant_categories", id, "category_id", updateData.category)
    }
    if (Array.isArray(updateData.menuPdfUrls)) {
      await replaceRestaurantOrdered("restaurant_menu_pdfs", id, "pdf_url", updateData.menuPdfUrls)
    }
    if (Array.isArray(updateData.images)) {
      await replaceRestaurantOrdered("restaurant_images", id, "image_url", updateData.images)
    }

    if (data.searchTags !== undefined && Array.isArray(data.searchTags)) {
      // Remove restaurant from all tags first / Add restaurant to selected tags
      // (restaurant_tags is the single source now: missing links are added, the rest are removed)
      await replaceRestaurantLinks("restaurant_tags", id, "tag_id", data.searchTags)
    }

    const updatedRestaurant = await getRestaurantDocById(id)

    return NextResponse.json({
      success: true,
      message: "Restaurant updated successfully",
      restaurant: updatedRestaurant
    })

  } catch (error: unknown) {
    console.error("Error updating restaurant:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update restaurant",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Verify admin token
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    // ✅ Check if restaurant exists
    const existingRes = await supabaseAdmin.from("restaurants").select("id").eq("id", id).maybeSingle();
    dbCheck(existingRes);
    const existingRestaurant = existingRes.data;
    if (!existingRestaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    dbCheck(await supabaseAdmin.from("offers").delete().eq("restaurant_id", id));

    dbCheck(await supabaseAdmin.from("restaurants").delete().eq("id", id));

    return NextResponse.json({
      success: true,
      message: "Restaurant, offers, and associated user deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting restaurant:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete restaurant",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}