import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

function chunk<T>(arr: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getGlobalRestaurantStats() {
  const [
    totalRestRes,
    approvedRestRes,
    pendingRestRes,
    rejectedRestRes,
    totalOffersRes,
    activeOffersRes,
  ] = await Promise.all([
    supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabaseAdmin.from("offers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("offers").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  return {
    totalRestaurants: totalRestRes.count || 0,
    activeRestaurants: approvedRestRes.count || 0,
    pendingRestaurants: pendingRestRes.count || 0,
    rejectedRestaurants: rejectedRestRes.count || 0,
    totalOffers: totalOffersRes.count || 0,
    activeOffers: activeOffersRes.count || 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const isExport = searchParams.get("export") === "true";
    const skip = isExport ? 0 : (page - 1) * limit;
    const fetchLimit = isExport ? 10000 : limit;
    const rawSearch = searchParams.get("search")?.trim() || "";
    const areaFilter = searchParams.get("area")?.trim() || "";
    const sortParam = searchParams.get("sort") || "name-asc";

    const isOffersSort = sortParam === "offers-asc" || sortParam === "offers-desc";
    const isTagsSort = sortParam === "tags-asc" || sortParam === "tags-desc";

    // 1. Resolve matching restaurant IDs from search & area if needed
    let matchingIds: string[] | null = null;

    if (rawSearch) {
      // Find matching categories
      const { data: matchedCats } = await supabaseAdmin
        .from("categories")
        .select("id")
        .ilike("name", `%${rawSearch}%`);

      let catRestIds: string[] = [];
      if (matchedCats && matchedCats.length > 0) {
        const catIds = matchedCats.map((c) => c.id);
        const { data: restCatRows } = await supabaseAdmin
          .from("restaurant_categories")
          .select("restaurant_id")
          .in("category_id", catIds);
        catRestIds = (restCatRows || []).map((r) => r.restaurant_id);
      }

      // Find restaurants matching name
      const { data: nameRests } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .ilike("name", `%${rawSearch}%`);

      const nameRestIds = (nameRests || []).map((r) => r.id);
      const combined = Array.from(new Set([...nameRestIds, ...catRestIds]));
      matchingIds = combined;
    }

    if (areaFilter && areaFilter !== "all") {
      const { data: areaDoc } = await supabaseAdmin
        .from("areas")
        .select("id")
        .eq("name", areaFilter)
        .maybeSingle();

      if (areaDoc) {
        const { data: restAreaRows } = await supabaseAdmin
          .from("restaurant_areas")
          .select("restaurant_id")
          .eq("area_id", areaDoc.id);

        const areaRestIds = new Set((restAreaRows || []).map((r) => r.restaurant_id));
        if (matchingIds !== null) {
          matchingIds = matchingIds.filter((id) => areaRestIds.has(id));
        } else {
          matchingIds = Array.from(areaRestIds);
        }
      } else {
        matchingIds = [];
      }
    }

    // 2. Base restaurant query
    let baseQuery = supabaseAdmin
      .from("restaurants")
      .select("id, name, status, is_hidden", { count: "exact" })
      .eq("status", "approved")
      .eq("is_hidden", false);

    if (matchingIds !== null) {
      if (matchingIds.length === 0) {
        const globalStats = await getGlobalRestaurantStats();
        return NextResponse.json({
          success: true,
          restaurants: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0,
            hasMore: false,
          },
          stats: globalStats,
        });
      }
      baseQuery = baseQuery.in("id", matchingIds);
    }

    let restaurants: any[] = [];
    let totalRestaurants = 0;

    if (isOffersSort || isTagsSort) {
      // Need all matching restaurants to sort by offers or tags count
      const { data: allRests, count, error: allErr } = await baseQuery;
      if (allErr) throw new Error(allErr.message);

      totalRestaurants = count || 0;
      const allList = allRests || [];
      const allIds = allList.map((r) => r.id);

      const scoreMap = new Map<string, number>();

      if (isOffersSort && allIds.length > 0) {
        const idChunks = chunk(allIds, 100);
        const results = await Promise.all(
          idChunks.map((c) =>
            supabaseAdmin
              .from("offers")
              .select("restaurant_id")
              .in("restaurant_id", c)
              .eq("status", "active")
          )
        );
        for (const res of results) {
          for (const row of res.data || []) {
            scoreMap.set(row.restaurant_id, (scoreMap.get(row.restaurant_id) || 0) + 1);
          }
        }
      } else if (isTagsSort && allIds.length > 0) {
        const idChunks = chunk(allIds, 100);
        const results = await Promise.all(
          idChunks.map((c) =>
            supabaseAdmin
              .from("offer_tags")
              .select("tag_id, offers!inner(restaurant_id)")
              .in("offers.restaurant_id", c)
          )
        );
        const restTags = new Map<string, Set<string>>();
        for (const res of results) {
          for (const row of res.data || []) {
            const rId = (row as any).offers?.restaurant_id;
            const tId = row.tag_id;
            if (rId && tId) {
              if (!restTags.has(rId)) restTags.set(rId, new Set());
              restTags.get(rId)!.add(tId);
            }
          }
        }
        for (const [rId, set] of restTags.entries()) {
          scoreMap.set(rId, set.size);
        }
      }

      const asc = sortParam.endsWith("-asc");
      allList.sort((a, b) => {
        const sa = scoreMap.get(a.id) || 0;
        const sb = scoreMap.get(b.id) || 0;
        return asc ? sa - sb : sb - sa;
      });

      restaurants = allList.slice(skip, skip + fetchLimit);
    } else {
      // Name sorting
      const ascending = sortParam !== "name-desc";
      const { data: pagedRests, count, error: pagedErr } = await baseQuery
        .order("name", { ascending })
        .range(skip, skip + fetchLimit - 1);

      if (pagedErr) throw new Error(pagedErr.message);
      totalRestaurants = count || 0;
      restaurants = pagedRests || [];
    }

    const restaurantIds = restaurants.map((r) => r.id);
    const idChunks = chunk(restaurantIds, 100);

    // 3. Parallel fetch: per-restaurant offer counts, tag counts, global stats
    const [offerChunkResults, tagChunkResults, globalStats] = await Promise.all([
      restaurantIds.length > 0
        ? Promise.all(
            idChunks.map((c) =>
              supabaseAdmin
                .from("offers")
                .select("restaurant_id, status")
                .in("restaurant_id", c)
                .in("status", ["active", "inactive", "expired"])
            )
          )
        : Promise.resolve([]),

      restaurantIds.length > 0
        ? Promise.all(
            idChunks.map((c) =>
              supabaseAdmin
                .from("offer_tags")
                .select("tag_id, offers!inner(restaurant_id)")
                .in("offers.restaurant_id", c)
            )
          )
        : Promise.resolve([]),

      getGlobalRestaurantStats(),
    ]);

    // Build offer count map
    const activeOffersMap: Record<string, number> = {};
    const totalOffersMap: Record<string, number> = {};

    for (const res of offerChunkResults) {
      for (const row of (res as any).data || []) {
        const rId = row.restaurant_id;
        totalOffersMap[rId] = (totalOffersMap[rId] || 0) + 1;
        if (row.status === "active") {
          activeOffersMap[rId] = (activeOffersMap[rId] || 0) + 1;
        }
      }
    }

    // Build unique tag count per restaurant
    const restTagSetMap = new Map<string, Set<string>>();
    for (const res of tagChunkResults) {
      for (const row of (res as any).data || []) {
        const rId = (row as any).offers?.restaurant_id;
        const tId = row.tag_id;
        if (rId && tId) {
          if (!restTagSetMap.has(rId)) restTagSetMap.set(rId, new Set());
          restTagSetMap.get(rId)!.add(tId);
        }
      }
    }

    const formattedRestaurants = restaurants.map((r) => {
      const rid = r.id;
      return {
        _id: r.id,
        id: r.id,
        name: r.name,
        status: r.status,
        activeOffersCount: activeOffersMap[rid] || 0,
        totalOffersCount: totalOffersMap[rid] || 0,
        tagCount: restTagSetMap.get(rid)?.size || 0,
      };
    });

    const totalPages = Math.ceil(totalRestaurants / limit);

    return NextResponse.json({
      success: true,
      restaurants: formattedRestaurants,
      pagination: {
        total: totalRestaurants,
        page,
        limit,
        pages: totalPages,
        hasMore: page * limit < totalRestaurants,
      },
      stats: globalStats,
    });
  } catch (error: unknown) {
    console.error("Error fetching restaurants:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: "Failed to fetch restaurants", error: errorMessage },
      { status: 500 }
    );
  }
}