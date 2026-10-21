// app/api/admin/carousels/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
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

async function fetchCarousel(id: string) {
  const { data, error } = await supabaseAdmin
    .from("carousels")
    .select(CAROUSEL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return toLegacyCarousel(data);
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const updateRow: any = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updateRow.name = body.name;
    if (body.isGlobal !== undefined) updateRow.is_global = body.isGlobal;
    if (body.globalOrder !== undefined) updateRow.global_order = body.globalOrder;
    if (body.isActive !== undefined) updateRow.is_active = body.isActive;

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("carousels")
      .update(updateRow)
      .eq("id", id)
      .select("id");
    if (updateError) throw new Error(updateError.message);

    let carousel: any = null;
    if (updatedRows && updatedRows.length > 0) {
      // arrays live in their own tables in Supabase: replace them when they are sent
      if (body.areaIds !== undefined || body.areaOrders !== undefined) {
        let newAreaIds = body.areaIds;
        let newAreaOrders = body.areaOrders;
        if (newAreaIds === undefined || newAreaOrders === undefined) {
          const { data: existing, error: existingError } = await supabaseAdmin
            .from("carousel_areas")
            .select("area_id, display_order")
            .eq("carousel_id", id);
          if (existingError) throw new Error(existingError.message);
          if (newAreaIds === undefined) {
            newAreaIds = (existing || []).map((a: any) => a.area_id);
          }
          if (newAreaOrders === undefined) {
            newAreaOrders = (existing || []).map((a: any) => ({
              areaId: a.area_id,
              order: a.display_order,
            }));
          }
        }
        const { error: deleteAreasError } = await supabaseAdmin
          .from("carousel_areas")
          .delete()
          .eq("carousel_id", id);
        if (deleteAreasError) throw new Error(deleteAreasError.message);
        const areaRows = buildAreaRows(id, newAreaIds, newAreaOrders);
        if (areaRows.length > 0) {
          const { error: insertAreasError } = await supabaseAdmin
            .from("carousel_areas")
            .insert(areaRows);
          if (insertAreasError) throw new Error(insertAreasError.message);
        }
      }
      if (body.restaurants !== undefined) {
        const { error: deleteRestaurantsError } = await supabaseAdmin
          .from("carousel_restaurants")
          .delete()
          .eq("carousel_id", id);
        if (deleteRestaurantsError) throw new Error(deleteRestaurantsError.message);
        const restaurantRows = buildRestaurantRows(id, body.restaurants);
        if (restaurantRows.length > 0) {
          const { error: insertRestaurantsError } = await supabaseAdmin
            .from("carousel_restaurants")
            .insert(restaurantRows);
          if (insertRestaurantsError) throw new Error(insertRestaurantsError.message);
        }
      }
      carousel = await fetchCarousel(id);
    }

    if (!carousel) {
      return NextResponse.json(
        { success: false, message: "Carousel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Carousel updated successfully",
      carousel,
    });
  } catch (error: any) {
    console.error("Error updating carousel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update carousel",
        error: error.message,
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
    const { id } = params;

    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("carousels")
      .delete()
      .eq("id", id)
      .select("id");
    if (deleteError) throw new Error(deleteError.message);
    const carousel = deletedRows && deletedRows.length > 0 ? deletedRows[0] : null;

    if (!carousel) {
      return NextResponse.json(
        { success: false, message: "Carousel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Carousel deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting carousel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete carousel",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const carousel = await fetchCarousel(id);

    if (!carousel) {
      return NextResponse.json(
        { success: false, message: "Carousel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      carousel,
    });
  } catch (error: any) {
    console.error("Error fetching carousel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch carousel",
        error: error.message,
      },
      { status: 500 }
    );
  }
}