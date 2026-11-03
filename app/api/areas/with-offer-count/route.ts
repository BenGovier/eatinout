// app/api/areas/with-offer-count/route.ts
import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";

// Supabase (PostgREST) returns max 1000 rows per request by default
const SUPABASE_PAGE_SIZE = 1000;
const fetchAllRows = async (buildQuery: () => any) => {
  const rows: any[] = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if ((data || []).length < SUPABASE_PAGE_SIZE) break;
  }
  return rows;
};

export async function GET() {
  try {
    const today = new Date();

    // Areas + active offers (ONLY restaurant_id for count) are fetched in parallel
    const [areas_, offerRows] = await Promise.all([
      fetchAllRows(() =>
        supabaseAdmin
          .from("areas")
          .select("id, name")
          .eq("is_active", true)
          .eq("hide_restaurant", false)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
      ),
      fetchAllRows(() =>
        supabaseAdmin
          .from("offers")
          .select("id, restaurant_id")
          .eq("status", "active")
          .eq("is_deactivated", false)
          .or(`expiry_date.is.null,expiry_date.gte.${today.toISOString()}`)
          .order("id", { ascending: true })
      ),
    ]);

    // Restaurants lookup (ONLY ids for performance)
    const areaIds = areas_.map((a: any) => a.id);
    const restaurantAreaRows = areaIds.length
      ? await fetchAllRows(() =>
          supabaseAdmin
            .from("restaurant_areas")
            .select("restaurant_id, area_id")
            .in("area_id", areaIds)
            .order("restaurant_id", { ascending: true })
            .order("area_id", { ascending: true })
        )
      : [];

    // Offers per restaurant (ONLY needed for count)
    const offersByRestaurant = new Map<string, number>();
    for (const o of offerRows) {
      offersByRestaurant.set(o.restaurant_id, (offersByRestaurant.get(o.restaurant_id) || 0) + 1);
    }
    const offersByArea = new Map<string, number>();
    for (const ra of restaurantAreaRows) {
      offersByArea.set(
        ra.area_id,
        (offersByArea.get(ra.area_id) || 0) + (offersByRestaurant.get(ra.restaurant_id) || 0)
      );
    }

    // Final response (FORMAT SAME)
    const areas = areas_.map((a: any) => ({
      _id: a.id,
      id: a.id,
      name: a.name,
      offers: offersByArea.get(a.id) || 0,
    }));

    return NextResponse.json(
      { success: true, areas },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );

  } catch (error: any) {
    console.error("Area API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}