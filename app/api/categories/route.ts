// app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";

/**
 * PERFORMANCE OPTIMIZATIONS APPLIED:
 * 1. Server-side filtering of categories with 0 offers (reduces data transfer)
 * 2. Aggregation pipeline optimization with early filtering
 * 3. Caching headers (5 minutes cache, 10 minutes stale-while-revalidate)
 * 4. Request deduplication on frontend
 * 
 * RECOMMENDED DATABASE INDEXES (add via MongoDB):
 * - Category: { name: 1 }
 * - Restaurant: { category: 1, status: 1 }
 * - Offer: { restaurantId: 1, status: 1 }
 */

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

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    // Check if we need to return all categories (for offer forms)
    const { searchParams } = new URL(req.url);
    const returnAll = searchParams.get('all') === 'true';

    // If returning all categories, use a simpler query
    if (returnAll) {
      const categoryRows = await fetchAllRows(() =>
        supabaseAdmin
          .from("categories")
          .select("id, name")
          .eq("is_active", true)
          .order("name", { ascending: true })
          .order("id", { ascending: true })
      );
      const categories = categoryRows.map((c: any) => ({ _id: c.id, name: c.name }));

      const response = NextResponse.json({ success: true, categories });
      // No caching for all categories to ensure fresh data
      response.headers.set('Cache-Control', 'no-cache');
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

      return response;
    }

    const today = new Date();

    // Optimized aggregation pipeline - filter out categories with 0 offers early
    const [categoryRows, restaurantCategoryRows, offerRows] = await Promise.all([
      fetchAllRows(() =>
        supabaseAdmin
          .from("categories")
          .select("id, name, priority")
          .order("id", { ascending: true })
      ),
      fetchAllRows(() =>
        supabaseAdmin
          .from("restaurant_categories")
          .select("restaurant_id, category_id")
          .order("restaurant_id", { ascending: true })
          .order("category_id", { ascending: true })
      ),
      fetchAllRows(() =>
        supabaseAdmin
          .from("offers")
          .select("id, restaurant_id")
          .eq("status", "active")
          // { $gte: ["$expiryDate", today] },
          .order("id", { ascending: true })
      ),
    ]);

    const offersByRestaurant = new Map<string, number>();
    for (const o of offerRows) {
      offersByRestaurant.set(o.restaurant_id, (offersByRestaurant.get(o.restaurant_id) || 0) + 1);
    }
    const restaurantCountByCategory = new Map<string, number>();
    const offersCountByCategory = new Map<string, number>();
    for (const rc of restaurantCategoryRows) {
      restaurantCountByCategory.set(rc.category_id, (restaurantCountByCategory.get(rc.category_id) || 0) + 1);
      offersCountByCategory.set(
        rc.category_id,
        (offersCountByCategory.get(rc.category_id) || 0) + (offersByRestaurant.get(rc.restaurant_id) || 0)
      );
    }

    const categories = categoryRows
      .map((c: any) => ({
        _id: c.id,
        name: c.name,
        priority: c.priority,
        restaurantCount: restaurantCountByCategory.get(c.id) || 0,
        offersCount: offersCountByCategory.get(c.id) || 0,
      }))
      .sort((a: any, b: any) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      })
      // Filter out categories with 0 offers on the server side for better performance
      .filter((c: any) => c.offersCount > 0);

    const response = NextResponse.json({ success: true, categories });

    // Reduced cache time to ensure priority changes are reflected quickly
    // Cache for 30 seconds, stale-while-revalidate for 60 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=60');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=60');
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

    return response;
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}