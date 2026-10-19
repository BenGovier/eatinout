// app/api/admin/categories/[id]/restaurants/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

// Supabase helpers: ids are 24-char hex strings (same format as the old ObjectIds)
const OBJECT_ID_FORMAT = /^[0-9a-fA-F]{24}$/;
const SUPABASE_PAGE_SIZE = 1000;
const ID_CHUNK = 100;
const dbCheck = (res: { error: any }) => {
  if (res.error) throw new Error(res.error.message);
};

// GET restaurants for a specific category
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    // if (!adminCheck.success) {
    //   return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    // }

    const { id } = await params;
    const categoryIdString = id;

    if (!categoryIdString) {
      return NextResponse.json(
        { success: false, message: "Category ID is required" },
        { status: 400 }
      );
    }

    // Convert string ID to ObjectId for proper comparison
    let categoryId: string;
    try {
      if (!OBJECT_ID_FORMAT.test(categoryIdString)) throw new Error("Invalid category ID format");
      categoryId = categoryIdString;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID format" },
        { status: 400 }
      );
    }

    // Find restaurants that have this category - use same approach as count query
    // Normalize category to array, then check if categoryId is in it
    const restaurantIds: string[] = [];
    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
      const res = await supabaseAdmin
        .from("restaurant_categories")
        .select("restaurant_id")
        .eq("category_id", categoryId)
        .order("restaurant_id", { ascending: true })
        .range(from, from + SUPABASE_PAGE_SIZE - 1);
      dbCheck(res);
      restaurantIds.push(...(res.data || []).map((r: any) => r.restaurant_id));
      if ((res.data || []).length < SUPABASE_PAGE_SIZE) break;
    }
    const idChunks: string[][] = [];
    for (let i = 0; i < restaurantIds.length; i += ID_CHUNK) {
      idChunks.push(restaurantIds.slice(i, i + ID_CHUNK));
    }
    const chunkResults = await Promise.all(
      idChunks.map((ids) =>
        supabaseAdmin
          .from("restaurants")
          .select("id, name, status, created_at, restaurant_categories(category_id)")
          .in("id", ids)
      )
    );
    const restaurantRows: any[] = [];
    for (const res of chunkResults) {
      dbCheck(res);
      restaurantRows.push(...(res.data || []));
    }
    const restaurants = restaurantRows
      .sort((a: any, b: any) =>
        a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : 1
      )
      .map((r: any) => ({
        _id: r.id,
        name: r.name,
        category: (r.restaurant_categories || []).map((rc: any) => rc.category_id),
        status: r.status,
      }));

    return NextResponse.json({
      success: true,
      restaurants: restaurants.map((restaurant: any) => ({
        _id: restaurant._id,
        id: restaurant._id.toString(),
        name: restaurant.name,
        category: restaurant.category,
        status: restaurant.status,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Unassign restaurant from category
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const { id } = await params;
    const categoryId = id;
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!categoryId || !restaurantId) {
      return NextResponse.json(
        { success: false, message: "Category ID and Restaurant ID are required" },
        { status: 400 }
      );
    }

    // Find the restaurant
    const restaurantRes = await supabaseAdmin
      .from("restaurants")
      .select("id, restaurant_categories(category_id)")
      .eq("id", restaurantId)
      .maybeSingle();
    dbCheck(restaurantRes);
    const restaurant: any = restaurantRes.data && {
      _id: restaurantRes.data.id,
      category: (restaurantRes.data.restaurant_categories || []).map((rc: any) => rc.category_id),
    };

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Remove category from restaurant's category field - handle both array and single string formats
    let updatedCategory: any[];
    if (Array.isArray(restaurant.category)) {
      // Case 1: category is an array - filter out the categoryId
      updatedCategory = restaurant.category.filter(
        (catId: any) => catId.toString() !== categoryId.toString()
      );
    } else if (restaurant.category) {
      // Case 2: category is a single value - if it matches, set to empty array
      if (restaurant.category.toString() === categoryId.toString()) {
        updatedCategory = [];
      } else {
        // Keep the existing single value if it doesn't match
        updatedCategory = [restaurant.category];
      }
    } else {
      // Case 3: category is null/undefined - set to empty array
      updatedCategory = [];
    }

    // Save: keep only the categories in updatedCategory (restaurant_categories rows)
    let removeQuery: any = supabaseAdmin
      .from("restaurant_categories")
      .delete()
      .eq("restaurant_id", restaurantId);
    if (updatedCategory.length > 0) {
      removeQuery = removeQuery.not(
        "category_id",
        "in",
        `(${updatedCategory
          .map((c: any) => `"${String(c).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
          .join(",")})`
      );
    }
    dbCheck(await removeQuery);

    return NextResponse.json({
      success: true,
      message: "Restaurant unassigned from category successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}