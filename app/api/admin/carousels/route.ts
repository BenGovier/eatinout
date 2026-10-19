// app/api/admin/carousels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

// carousel with its areas and restaurants (name + images) in one query, like the old populate
const CAROUSEL_SELECT =
  "*, carousel_areas(area_id, display_order), carousel_restaurants(restaurant_id, display_order, restaurants(id, name, restaurant_images(image_url, display_order)))";

// Supabase row -> same shape the Mongoose carousel had (so the responses stay unchanged)
function toLegacyCarousel(c: any) {
  if (!c) return c;
  const iso = (v: any) => (v ? new Date(v).toISOString() : v);
  const byOrder = (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0);
  return {
    _id: c.id,
    name: c.name,
    isGlobal: c.is_global,
    areaIds: (c.carousel_areas ?? []).map((a: any) => a.area_id),
    areaOrders: (c.carousel_areas ?? []).map((a: any) => ({
      areaId: a.area_id,
      order: a.display_order,
    })),
    globalOrder: c.global_order,
    restaurants: (c.carousel_restaurants ?? [])
      .slice()
      .sort(byOrder)
      .map((r: any) => ({
        restaurantId: r.restaurants
          ? {
              _id: r.restaurants.id,
              name: r.restaurants.name,
              images: (r.restaurants.restaurant_images ?? [])
                .slice()
                .sort(byOrder)
                .map((i: any) => i.image_url),
            }
          : null,
        order: r.display_order,
      })),
    isActive: c.is_active,
    createdAt: iso(c.created_at),
    updatedAt: iso(c.updated_at),
  };
}

// areaIds + areaOrders -> carousel_areas rows
function buildAreaRows(carouselId: string, areaIds: any, areaOrders: any) {
  const orders = new Map<string, number>();
  (Array.isArray(areaOrders) ? areaOrders : []).forEach((ao: any) =>
    orders.set(String(ao.areaId), ao.order ?? 1)
  );
  const ids = new Set<string>([
    ...(Array.isArray(areaIds) ? areaIds : []).map(String),
    ...Array.from(orders.keys()),
  ]);
  return Array.from(ids).map((area_id) => ({
    carousel_id: carouselId,
    area_id,
    display_order: orders.get(area_id) ?? 1,
  }));
}

// restaurants [{ restaurantId, order }] -> carousel_restaurants rows
function buildRestaurantRows(carouselId: string, restaurants: any) {
  const rows = new Map<string, any>();
  (Array.isArray(restaurants) ? restaurants : []).forEach((r: any) => {
    const rid =
      r?.restaurantId && typeof r.restaurantId === "object"
        ? r.restaurantId._id
        : r?.restaurantId;
    if (rid) {
      rows.set(String(rid), {
        carousel_id: carouselId,
        restaurant_id: String(rid),
        display_order: r.order ?? 1,
      });
    }
  });
  return Array.from(rows.values());
}

// replacement for Carousel.countDocuments(filter)
async function countCarousels(apply?: (q: any) => any): Promise<number> {
  let q: any = supabaseAdmin
    .from("carousels")
    .select("id", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const areaFilter = searchParams.get("area") || "all";
    const statusFilter = searchParams.get("status") || "all";

    // Build query
    let query: any = supabaseAdmin.from("carousels").select(CAROUSEL_SELECT);

    // Search filter
    if (search) {
      query = query.ilike("name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
    }

    // Status filter
    if (statusFilter !== "all") {
      query = query.eq("is_active", statusFilter === "active");
    }

    // Area filter
    if (areaFilter !== "all") {
      if (areaFilter === "global") {
        query = query.eq("is_global", true);
      } else {
        const { data: areaCarouselRows, error: areaCarouselError } = await supabaseAdmin
          .from("carousel_areas")
          .select("carousel_id")
          .eq("area_id", areaFilter);
        if (areaCarouselError) throw new Error(areaCarouselError.message);
        const areaCarouselIds = (areaCarouselRows || []).map((r: any) => r.carousel_id);
        query =
          areaCarouselIds.length > 0
            ? query.or(`is_global.eq.true,id.in.(${areaCarouselIds.join(",")})`)
            : query.eq("is_global", true);
      }
    }

    const { data: carouselRows, error: carouselsError } = await query.order(
      "created_at",
      { ascending: false }
    );
    if (carouselsError) throw new Error(carouselsError.message);
    const carousels = (carouselRows || []).map(toLegacyCarousel);

    // Get stats
    const [totalCount, globalCount, areaCount, activeCount] = await Promise.all([
      countCarousels(),
      countCarousels((q) => q.eq("is_global", true)),
      countCarousels((q) => q.eq("is_global", false)),
      countCarousels((q) => q.eq("is_active", true)),
    ]);

    return NextResponse.json({
      success: true,
      carousels,
      stats: {
        total: totalCount,
        global: globalCount,
        area: areaCount,
        active: activeCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching carousels:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch carousels",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      isGlobal,
      areaIds,
      areaOrders,
      restaurants,
      isActive,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    // Calculate global order for new carousel
    let globalOrder = 1;
    if (isGlobal) {
      const { data: lastGlobalRow, error: lastGlobalError } = await supabaseAdmin
        .from("carousels")
        .select("global_order")
        .eq("is_global", true)
        .order("global_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastGlobalError) throw new Error(lastGlobalError.message);
      const lastGlobalCarousel = lastGlobalRow && { globalOrder: lastGlobalRow.global_order };
      globalOrder = lastGlobalCarousel ? lastGlobalCarousel.globalOrder + 1 : 1;
    }

    // Create carousel
    const carouselId = randomBytes(12).toString("hex");
    const { error: saveError } = await supabaseAdmin.from("carousels").insert({
      id: carouselId,
      name,
      is_global: isGlobal ?? true,
      global_order: globalOrder,
      is_active: isActive ?? true,
    });
    if (saveError) throw new Error(saveError.message);

    // areas and restaurants live in their own tables in Supabase
    const areaRows = buildAreaRows(carouselId, areaIds || [], areaOrders || []);
    if (areaRows.length > 0) {
      const { error: areaRowsError } = await supabaseAdmin
        .from("carousel_areas")
        .insert(areaRows);
      if (areaRowsError) throw new Error(areaRowsError.message);
    }
    const restaurantRows = buildRestaurantRows(carouselId, restaurants || []);
    if (restaurantRows.length > 0) {
      const { error: restaurantRowsError } = await supabaseAdmin
        .from("carousel_restaurants")
        .insert(restaurantRows);
      if (restaurantRowsError) throw new Error(restaurantRowsError.message);
    }

    // Populate the created carousel
    const { data: populatedRow, error: populatedError } = await supabaseAdmin
      .from("carousels")
      .select(CAROUSEL_SELECT)
      .eq("id", carouselId)
      .maybeSingle();
    if (populatedError) throw new Error(populatedError.message);
    const populatedCarousel = toLegacyCarousel(populatedRow);

    return NextResponse.json({
      success: true,
      message: "Carousel created successfully",
      carousel: populatedCarousel,
    });
  } catch (error: any) {
    console.error("Error creating carousel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create carousel",
        error: error.message,
      },
      { status: 500 }
    );
  }
}