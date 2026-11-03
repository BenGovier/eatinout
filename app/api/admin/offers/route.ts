// app/api/admin/offers/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

// Supabase offer row (with its restaurant, areas and categories embedded) -> same shape
// the Mongoose docs had, so the code below stays unchanged
function toLegacyOffer(o: any) {
  const iso = (v: any) => (v ? new Date(v).toISOString() : v);
  const byId = (a: any, b: any) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0);
  const r = o.restaurants;
  return {
    _id: o.id,
    restaurantId: o.restaurant_id,
    title: o.title,
    description: o.description,
    validDays: o.valid_days,
    validHours: o.valid_hours,
    expiryDate: iso(o.expiry_date),
    terms: o.terms,
    status: o.status,
    createdAt: iso(o.created_at),
    updatedAt: iso(o.updated_at),
    restaurant: r && {
      _id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      images: (r.restaurant_images ?? [])
        .slice()
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((i: any) => i.image_url),
      category: (r.restaurant_categories ?? []).map((x: any) => x.category_id),
      areaDocs: (r.restaurant_areas ?? [])
        .map((x: any) => x.areas)
        .filter(Boolean)
        .map((a: any) => ({
          _id: a.id,
          name: a.name,
          isActive: a.is_active,
          hideRestaurant: a.hide_restaurant,
          createdAt: iso(a.created_at),
          updatedAt: iso(a.updated_at),
        }))
        .sort(byId),
      categoryDocs: (r.restaurant_categories ?? [])
        .map((x: any) => x.categories)
        .filter(Boolean)
        .map((c: any) => ({ _id: c.id, name: c.name }))
        .sort(byId),
    },
  };
}

// GET active offers with restaurant information
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    // Get query parameters for pagination
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    // Find active offers

    // Only include offers that are active and not expired, or have no expiryDate (unlimited)
    const now = new Date();
    // restaurant, areas and categories come back in the same query (offers.restaurant_id is a foreign key)
    const { data: activeOfferRows, error: activeOffersError } = await supabaseAdmin
      .from("offers")
      .select(
        "*, restaurants(*, restaurant_areas(area_id, areas(*)), restaurant_categories(category_id, categories(id, name)), restaurant_images(image_url, display_order))"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1);
    if (activeOffersError) throw new Error(activeOffersError.message);
    const activeOffers = (activeOfferRows || []).map(toLegacyOffer);

    // Get restaurant details for each offer
    const offersWithDetails = await Promise.all(
      activeOffers.map(async (offer) => {
        const restaurant = offer.restaurant;

        if (!restaurant) {
          return null;
        }

        // Get area details
        const areas = restaurant.areaDocs;

        // Get category details
        let categoryData = null;
        if (Array.isArray(restaurant.category)) {
          // If category is an array of IDs, fetch all
          const categories = restaurant.categoryDocs;
          categoryData = categories.map((cat: any) => ({
            _id: cat?._id || null,
            name: cat?.name || null
          }));
        } else {
          // If category is a single string ID
          const { data: categoryRow, error: categoryError } = await supabaseAdmin
            .from("categories")
            .select("id, name")
            .eq("id", restaurant.category)
            .maybeSingle();
          if (categoryError) throw new Error(categoryError.message);
          const category = categoryRow && { _id: categoryRow.id, name: categoryRow.name };
          categoryData = category
            ? { _id: category._id, name: category.name }
            : { _id: null, name: null };
        }

        return {
          _id: offer._id,
          title: offer.title,
          description: offer.description,
          validDays: offer.validDays,
          validHours: offer.validHours,
          expiryDate: offer.expiryDate,
          terms: offer.terms,
          isActive: offer.status === "active",
          createdAt: offer.createdAt,
          updatedAt: offer.updatedAt,
          restaurant: {
            _id: restaurant._id,
            name: restaurant.name,
            area: areas,
            cuisine: restaurant.cuisine,
            image: restaurant.images?.length > 0 ? restaurant.images[0] : null,
            category: categoryData
          },
        };
      })
    );

    // Filter out null values (offers with no restaurant)
    const validOffers = offersWithDetails.filter((offer) => offer !== null);

    // Get total count
    const { count: totalOffersCount, error: totalOffersError } = await supabaseAdmin
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if (totalOffersError) throw new Error(totalOffersError.message);
    const totalOffers = totalOffersCount || 0;

    return NextResponse.json({
      success: true,
      offers: validOffers,
      pagination: {
        total: totalOffers,
        page,
        limit,
        pages: Math.ceil(totalOffers / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching active offers:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch active offers",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}