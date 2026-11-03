import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken: { restaurantId?: string; userId?: string; role: string };
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.userId;

    // Fetch all restaurants associated with this user
    const { data: restaurants, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .or(`user_id.eq.${userId},id.in.(select restaurant_id from restaurants where user_id = '${userId}')`)
      .order("created_at", { ascending: false });

    // Fallback if OR query returned empty or error, query by user_id directly
    let restList = restaurants;
    if (!restList || restList.length === 0) {
      const { data: byUser } = await supabaseAdmin
        .from("restaurants")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      restList = byUser || [];
    }

    if (restList.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const restaurantIds = restList.map((r) => r.id);

    // Fetch categories, areas, offers count and user data in parallel
    const [categoriesRes, areasRes, restCatsRes, restAreasRes, offersRes, userRes] = await Promise.all([
      supabaseAdmin.from("categories").select("id, name"),
      supabaseAdmin.from("areas").select("id, name"),
      supabaseAdmin.from("restaurant_categories").select("restaurant_id, category_id").in("restaurant_id", restaurantIds),
      supabaseAdmin.from("restaurant_areas").select("restaurant_id, area_id").in("restaurant_id", restaurantIds),
      supabaseAdmin.from("offers").select("restaurant_id, status").in("restaurant_id", restaurantIds).in("status", ["active", "pending"]),
      supabaseAdmin.from("users").select("id, first_name, last_name").eq("id", userId).maybeSingle(),
    ]);

    const catNameMap = new Map((categoriesRes.data || []).map((c) => [c.id, c.name]));
    const areaNameMap = new Map((areasRes.data || []).map((a) => [a.id, a.name]));

    // Map categories by restaurant
    const restCategoryMap = new Map<string, { id: string; name: string }[]>();
    (restCatsRes.data || []).forEach((rc) => {
      const list = restCategoryMap.get(rc.restaurant_id) || [];
      const name = catNameMap.get(rc.category_id);
      if (name) list.push({ id: rc.category_id, name });
      restCategoryMap.set(rc.restaurant_id, list);
    });

    // Map areas by restaurant
    const restAreaMap = new Map<string, { id: string; name: string }[]>();
    (restAreasRes.data || []).forEach((ra) => {
      const list = restAreaMap.get(ra.restaurant_id) || [];
      const name = areaNameMap.get(ra.area_id);
      if (name) list.push({ id: ra.area_id, name });
      restAreaMap.set(ra.restaurant_id, list);
    });

    // Count active/pending offers per restaurant
    const offerCountMap = new Map<string, number>();
    (offersRes.data || []).forEach((off) => {
      const count = offerCountMap.get(off.restaurant_id) || 0;
      offerCountMap.set(off.restaurant_id, count + 1);
    });

    const ownerName = userRes.data ? `${userRes.data.first_name || ""} ${userRes.data.last_name || ""}`.trim() : null;

    const formattedRestaurants = restList.map((restaurant: any) => {
      const cats = restCategoryMap.get(restaurant.id) || [];
      const areas = restAreaMap.get(restaurant.id) || [];

      return {
        _id: restaurant.id,
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        address: restaurant.address,
        city: restaurant.city,
        zipCode: restaurant.zip_code,
        phone: restaurant.phone,
        email: restaurant.email,
        website: restaurant.website,
        userId: restaurant.user_id,
        status: restaurant.status,
        dineIn: restaurant.dine_in,
        dineOut: restaurant.dine_out,
        category: cats,
        areas: areas.length > 0 ? areas : null,
        area: areas.length > 0 ? areas : null,
        totalOffersCount: offerCountMap.get(restaurant.id) || 0,
        ownerName,
        createdAt: restaurant.created_at,
        updatedAt: restaurant.updated_at,
      };
    });

    return NextResponse.json({ data: formattedRestaurants });
  } catch (error: any) {
    console.error("Error exporting restaurants:", error);
    return NextResponse.json(
      { message: "Failed to export restaurants", error: error.message },
      { status: 500 }
    );
  }
}
