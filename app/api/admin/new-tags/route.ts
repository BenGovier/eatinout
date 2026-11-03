import { type NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const newId = () => randomBytes(12).toString("hex");

function calculateOfferStatus(
  status: string,
  startDate?: string | null,
  expiryDate?: string | null,
  runUntilFurther?: boolean,
  isDeactivated?: boolean
): "active" | "inactive" | "expired" | string {
  if (isDeactivated) return "inactive";
  if (status === "inactive" || status === "pending" || status === "rejected") return status;

  if (status === "active") {
    const now = new Date();
    if (startDate && new Date(startDate) > now) {
      return "inactive";
    }
    if (!runUntilFurther && expiryDate && new Date(expiryDate) < now) {
      return "expired";
    }
    return "active";
  }

  return status || "active";
}

async function fetchAll(build: (from: number, to: number) => PromiseLike<any>): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const sort = searchParams.get("sort") || "name-asc";
    const skip = (page - 1) * limit;

    // ── 1. Global Stats ──────────────────────────────────────────────────
    const [totalTagsRes, totalAssocRes, activeAssocRows] = await Promise.all([
      supabaseAdmin.from("tags").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("offer_tags").select("offer_id", { count: "exact", head: true }),
      fetchAll((from, to) =>
        supabaseAdmin
          .from("offer_tags")
          .select("tag_id, offers!inner(restaurant_id, status, restaurants!inner(id, is_hidden))")
          .eq("offers.restaurants.is_hidden", false)
          .range(from, to)
      ),
    ]);

    const totalTagsCount = totalTagsRes.count || 0;
    const totalAssocCount = totalAssocRes.count || 0;

    const tagsWithRestSet = new Set<string>();
    for (const row of activeAssocRows || []) {
      if (row.tag_id && (row as any).offers?.restaurant_id) {
        tagsWithRestSet.add(row.tag_id);
      }
    }
    const tagsWithRestCount = tagsWithRestSet.size;

    const globalStats = {
      totalTags: totalTagsCount,
      tagsWithRestaurants: tagsWithRestCount,
      totalAssociations: totalAssocCount,
      avgPerTag: totalTagsCount > 0 ? (totalAssocCount / totalTagsCount).toFixed(1) : "0",
    };

    // ── 2. Filtered Count for Pagination ──────────────────────────────────
    let countQuery = supabaseAdmin.from("tags").select("id", { count: "exact", head: true });
    if (search) {
      countQuery = countQuery.ilike("name", `%${search}%`);
    }
    const { count: filteredCount, error: countErr } = await countQuery;
    if (countErr) throw new Error(countErr.message);
    const total = filteredCount || 0;

    // ── 3. Query Tags & Related Offers ────────────────────────────────────
    const isOfferSort = sort === "offers-desc" || sort === "offers-asc";

    let tagsData: any[] = [];

    if (isOfferSort) {
      // Fetch all matching tags, enrich with offer counts, then sort in memory and slice
      let allQuery = supabaseAdmin
        .from("tags")
        .select("id, name, slug, is_active, created_at, updated_at");
      if (search) {
        allQuery = allQuery.ilike("name", `%${search}%`);
      }
      const { data: allTags, error: allErr } = await allQuery;
      if (allErr) throw new Error(allErr.message);
      tagsData = allTags || [];
    } else {
      // Sort in DB, then paginate
      let query = supabaseAdmin
        .from("tags")
        .select("id, name, slug, is_active, created_at, updated_at");
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      if (sort === "name-desc") {
        query = query.order("name", { ascending: false });
      } else if (sort === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sort === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else {
        query = query.order("name", { ascending: true });
      }

      query = query.range(skip, skip + limit - 1);
      const { data: pagedTags, error: pagedErr } = await query;
      if (pagedErr) throw new Error(pagedErr.message);
      tagsData = pagedTags || [];
    }

    const tagIds = tagsData.map((t) => t.id);

    // Fetch linked offers for these tags
    let offerTagsMap = new Map<string, any[]>();
    if (tagIds.length > 0) {
      const { data: offerRows, error: offerErr } = await supabaseAdmin
        .from("offer_tags")
        .select(
          `
          tag_id,
          offers!inner(
            id,
            title,
            status,
            start_date,
            expiry_date,
            run_until_further,
            is_deactivated,
            restaurant_id,
            restaurants!inner(
              id,
              name,
              city,
              status,
              is_hidden
            )
          )
        `
        )
        .in("tag_id", tagIds)
        .eq("offers.restaurants.is_hidden", false);

      if (offerErr) throw new Error(offerErr.message);

      for (const row of offerRows || []) {
        const tId = row.tag_id;
        const o = (row as any).offers;
        if (!tId || !o) continue;

        if (!offerTagsMap.has(tId)) {
          offerTagsMap.set(tId, []);
        }

        const calculatedStatus = calculateOfferStatus(
          o.status,
          o.start_date,
          o.expiry_date,
          o.run_until_further,
          o.is_deactivated
        );

        offerTagsMap.get(tId)!.push({
          offerId: String(o.id),
          offerTitle: o.title,
          offerStatus: calculatedStatus,
          startDate: o.start_date,
          expiryDate: o.expiry_date,
          restaurantId: String(o.restaurant_id),
          restaurantName: o.restaurants?.name || "",
          restaurantCity: o.restaurants?.city || "",
          restaurantStatus: o.restaurants?.status || "unknown",
        });
      }
    }

    // Format tags
    let enrichedTags = tagsData.map((t) => {
      const offers = offerTagsMap.get(t.id) || [];
      const activeOfferCount = offers.filter((o) => o.offerStatus === "active").length;
      const expiredOfferCount = offers.filter((o) => o.offerStatus === "expired").length;
      const totalOfferCount = offers.length;

      const restIds = new Set(offers.map((o) => o.restaurantId));
      const restaurantCount = restIds.size;

      return {
        _id: t.id,
        id: t.id,
        name: t.name,
        slug: t.slug,
        isActive: t.is_active,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        offers,
        activeOfferCount,
        expiredOfferCount,
        totalOfferCount,
        restaurantCount,
      };
    });

    if (isOfferSort) {
      enrichedTags.sort((a, b) => {
        if (sort === "offers-desc") {
          return b.totalOfferCount - a.totalOfferCount || a.name.localeCompare(b.name);
        }
        return a.totalOfferCount - b.totalOfferCount || a.name.localeCompare(b.name);
      });
      enrichedTags = enrichedTags.slice(skip, skip + limit);
    }

    return NextResponse.json({
      success: true,
      data: enrichedTags,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      stats: globalStats,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/new-tags]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Tag name is required" },
        { status: 400 }
      );
    }

    // Check duplicate name
    const { data: existing } = await supabaseAdmin
      .from("tags")
      .select("id")
      .ilike("name", name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Tag with this name already exists" },
        { status: 409 }
      );
    }

    const baseSlug =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "tag";

    let finalSlug = baseSlug;
    let suffix = 2;

    while (true) {
      const { data: slugCheck } = await supabaseAdmin
        .from("tags")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (!slugCheck) break;
      finalSlug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const tagId = newId();
    const { data: tag, error: insertErr } = await supabaseAdmin
      .from("tags")
      .insert({
        id: tagId,
        name: name.trim(),
        slug: finalSlug,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: tag.id,
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          isActive: tag.is_active,
          offers: [],
          activeOfferCount: 0,
          expiredOfferCount: 0,
          totalOfferCount: 0,
          restaurantCount: 0,
          createdAt: tag.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/new-tags]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}