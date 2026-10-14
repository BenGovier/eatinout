import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Mongo serialized Dates as ISO (...000Z); keep the same format
const toIso = (v: any) => (v ? new Date(v).toISOString() : v);

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

// keeps `.in()` URLs short
function chunk<T>(arr: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Supabase returns max 1000 rows per request, so page through
async function fetchAll(build: (from: number, to: number) => PromiseLike<any>, maxRows = Infinity): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; out.length < maxRows; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out.length > maxRows ? out.slice(0, maxRows) : out;
}

// replacement for Offer.bulkWrite
async function applyOfferUpdates(
  statusUpdates: { id: string; status: string }[],
  resetIds: string[] = [],
  now: Date = new Date()
) {
  const jobs: PromiseLike<any>[] = [];
  const byStatus = new Map<string, string[]>();
  for (const u of statusUpdates) {
    if (!byStatus.has(u.status)) byStatus.set(u.status, []);
    byStatus.get(u.status)!.push(u.id);
  }
  byStatus.forEach((ids, status) => {
    for (const part of chunk(ids)) {
      jobs.push(supabaseAdmin.from("offers").update({ status }).in("id", part));
    }
  });
  for (const part of chunk(resetIds)) {
    jobs.push(
      supabaseAdmin
        .from("offers")
        .update({ current_period_count: 0, last_reset_date: now.toISOString() })
        .in("id", part)
    );
  }
  const results = await Promise.all(jobs);
  for (const r of results) {
    if (r?.error) throw new Error(r.error.message);
  }
}

const CAROUSEL_SELECT =
  "*, carousel_areas(area_id, display_order), carousel_restaurants(restaurant_id, display_order)";

// "*" so optional columns (cuisine, rating, price_range ...) come through if they exist in Supabase
const RESTAURANT_SELECT =
  "*, restaurant_areas(area_id), restaurant_categories(category_id), restaurant_images(image_url, display_order), restaurant_tags(tag_id), restaurant_area_pins(area_id, is_pinned, priority, pinned_at)";

const OFFER_SELECT =
  "id, restaurant_id, title, start_date, expiry_date, status, is_deactivated, max_redemption_limit, redeem_count, is_unlimited, valid_days, valid_hours, is_pinned, pinned_at, created_at, offer_tags(tag_id)";

/* ---------------- row mappers (Supabase -> old Mongo shape) ---------------- */

function mapCarouselRow(c: any) {
  return {
    _id: c.id as string,
    name: c.name as string,
    isGlobal: c.is_global as boolean,
    globalOrder: c.global_order as number,
    areaOrders: (c.carousel_areas ?? []).map((a: any) => ({
      areaId: a.area_id as string,
      order: a.display_order as number,
    })),
    restaurants: (c.carousel_restaurants ?? [])
      .map((r: any) => ({
        restaurantId: r.restaurant_id as string,
        order: r.display_order as number,
      }))
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
  };
}

function mapRestaurantRow(r: any) {
  const images = (r.restaurant_images ?? [])
    .slice()
    .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((i: any) => i.image_url);

  return {
    _id: r.id as string,
    name: r.name,
    images,
    area: (r.restaurant_areas ?? []).map((x: any) => x.area_id),
    cuisine: r.cuisine,
    rating: r.rating,
    dineIn: r.dine_in,
    dineOut: r.dine_out,
    priceRange: r.price_range,
    category: (r.restaurant_categories ?? []).map((x: any) => x.category_id),
    searchTags: (r.restaurant_tags ?? []).map((x: any) => x.tag_id),
    zipCode: r.zip_code,
    city: r.city,
    homePin: {
      isPinned: r.home_is_pinned,
      priority: r.home_pin_priority,
      pinnedAt: r.home_pinned_at,
    },
    areaPins: (r.restaurant_area_pins ?? []).map((p: any) => ({
      areaId: p.area_id,
      isPinned: p.is_pinned,
      priority: p.priority,
      areaPinnedAt: p.pinned_at,
    })),
    createdAt: r.created_at,
  };
}

function mapOfferRow(o: any) {
  return {
    _id: o.id as string,
    restaurantId: o.restaurant_id as string,
    title: o.title,
    tags: (o.offer_tags ?? []).map((t: any) => t.tag_id),
    startDate: o.start_date,
    expiryDate: o.expiry_date,
    status: o.status,
    deactivated: o.is_deactivated,
    maxRedemptionLimit: o.max_redemption_limit,
    redeemCount: o.redeem_count,
    isUnlimited: o.is_unlimited,
    validDays: o.valid_days,
    validHours: o.valid_hours,
    isPinned: o.is_pinned,
    pinnedAt: o.pinned_at,
    createdAt: o.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const areaId = searchParams.get("areaId");
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const dineIn = searchParams.get("dineIn") === "true";
    const dineOut = searchParams.get("dineOut") === "true";
    const days = searchParams.get("days");
    const mealTimes = searchParams.get("mealTimes");

    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const skip = (page - 1) * limit;

    const now = new Date();

    const hasAreaFilter = !!areaId && areaId !== "all";

    const selectedCategoryIds = categoryId
      ? categoryId.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    /* ---------------- SEARCH CATEGORY + TAG ---------------- */
    let searchCategoryIds: string[] = [];
    let searchTagIds: string[] = [];

    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      const [categoriesRes, tagsRes] = await Promise.all([
        supabaseAdmin.from("categories").select("id").ilike("name", pattern),
        supabaseAdmin.from("tags").select("id").ilike("name", pattern),
      ]);
      if (categoriesRes.error) throw new Error(categoriesRes.error.message);
      if (tagsRes.error) throw new Error(tagsRes.error.message);

      searchCategoryIds = (categoriesRes.data || []).map((c: any) => c.id);
      searchTagIds = (tagsRes.data || []).map((t: any) => t.id);
    }

    /* ---------------- FETCH CAROUSELS ---------------- */
    const carouselRows = await fetchAll((from, to) =>
      supabaseAdmin
        .from("carousels")
        .select(CAROUSEL_SELECT)
        .eq("is_active", true)
        .order("global_order", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    );

    let allCarousels = carouselRows.map(mapCarouselRow);

    // isGlobal OR assigned to area  (same as { $or: [{ isGlobal: true }, { areaIds: areaId }] })
    allCarousels = allCarousels.filter((c: any) => {
      if (hasAreaFilter) {
        return (
          c.isGlobal ||
          c.areaOrders.some((ao: any) => ao.areaId === areaId)
        );
      }
      return c.isGlobal;
    });

    // Same ordering as before: with an area filter Mongo sorted by the lowest value
    // in areaOrders.order, then globalOrder.
    if (hasAreaFilter) {
      const minAreaOrder = (c: any) =>
        c.areaOrders.length
          ? Math.min(...c.areaOrders.map((a: any) => a.order))
          : -Infinity;
      allCarousels.sort(
        (a: any, b: any) =>
          minAreaOrder(a) - minAreaOrder(b) ||
          (a.globalOrder ?? 0) - (b.globalOrder ?? 0)
      );
    } else {
      allCarousels.sort(
        (a: any, b: any) => (a.globalOrder ?? 0) - (b.globalOrder ?? 0)
      );
    }

    const total = allCarousels.length;
    const carousels = allCarousels.slice(skip, skip + limit);

    /* ---------------- FETCH RESTAURANTS (populate) ---------------- */
    const populateIds = Array.from(
      new Set(
        carousels.flatMap((c: any) =>
          c.restaurants.map((r: any) => r.restaurantId)
        )
      )
    ) as string[];

    const restaurantMap = new Map<string, any>();
    if (populateIds.length > 0) {
      const parts = await Promise.all(
        chunk(populateIds).map(async (ids) => {
          const { data, error } = await supabaseAdmin
            .from("restaurants")
            .select(RESTAURANT_SELECT)
            .in("id", ids);
          if (error) throw new Error(error.message);
          return data || [];
        })
      );
      parts.flat().forEach((row: any) => {
        restaurantMap.set(row.id, mapRestaurantRow(row));
      });
    }

    /* ---------------- COLLECT RESTAURANT IDS ---------------- */
    const restaurantIds = new Set<string>();

    carousels.forEach((c: any) => {
      c.restaurants?.forEach((r: any) => {
        if (restaurantMap.has(r.restaurantId)) {
          restaurantIds.add(r.restaurantId);
        }
      });
    });

    /* ---------------- FETCH OFFERS ---------------- */
    let offersRaw: any[] = [];
    if (restaurantIds.size > 0) {
      const parts = await Promise.all(
        chunk(Array.from(restaurantIds)).map((ids) =>
          fetchAll((from, to) =>
            supabaseAdmin
              .from("offers")
              .select(OFFER_SELECT)
              .in("restaurant_id", ids)
              .order("id", { ascending: true })
              .range(from, to)
          )
        )
      );
      offersRaw = parts.flat().map(mapOfferRow);
    }

    /* group offers */
    const offersMap = new Map<string, any[]>();
    const statusUpdates: { id: string; status: string }[] = [];

    offersRaw.forEach((offer: any) => {
      const restId = offer.restaurantId.toString();

      let adjustedStatus = offer.status;

      if (!offer.deactivated) {
        const startDate = offer.startDate
          ? new Date(offer.startDate)
          : null;
        const expiryDate = offer.expiryDate
          ? new Date(offer.expiryDate)
          : null;

        if (startDate && startDate > now) adjustedStatus = "inactive";
        else if (expiryDate && expiryDate < now)
          adjustedStatus = "expired";
        else if (
          startDate &&
          startDate <= now &&
          (!expiryDate || expiryDate > now)
        )
          adjustedStatus = "active";
        else if (!expiryDate) adjustedStatus = "active";

        if (adjustedStatus !== offer.status) {
          statusUpdates.push({ id: offer._id, status: adjustedStatus });
        }
      }

      if (adjustedStatus === "active") {
        if (!offersMap.has(restId)) offersMap.set(restId, []);
        offersMap.get(restId)!.push({
          ...offer,
          status: adjustedStatus,
        });
      }
    });

    /* bulk update */
    if (statusUpdates.length > 0) {
      await applyOfferUpdates(statusUpdates, [], now);
    }

    /* ---------------- FORMAT RESPONSE ---------------- */

    const formattedCarousels = carousels.map((carousel: any) => {
      const preparedRestaurants = carousel.restaurants
        .map((r: any) => ({ ...r, restaurantId: restaurantMap.get(r.restaurantId) }))
        .filter((r: any) => r.restaurantId)
        .map((r: any) => {
          const restaurant = r.restaurantId;

          const restaurantCategoryIds = Array.isArray(
            restaurant.category
          )
            ? restaurant.category.map((id: any) => id.toString())
            : [restaurant.category?.toString()].filter(Boolean);

          const restaurantTagIds = Array.isArray(
            restaurant.searchTags
          )
            ? restaurant.searchTags.map((id: any) => id.toString())
            : [];

          /* search filter */
          const matchesSearch =
            !search ||
            restaurant.name
              ?.toLowerCase()
              .includes(search.toLowerCase()) ||
            restaurantCategoryIds.some((id: string) =>
              searchCategoryIds.includes(id)
            ) ||
            restaurantTagIds.some((id: string) =>
              searchTagIds.includes(id)
            );

          if (!matchesSearch) return null;

          if (selectedCategoryIds.length > 0) {
            const hasCategory = restaurantCategoryIds.some((id: string) =>
              selectedCategoryIds.includes(id)
            );
            if (!hasCategory) return null;
          }

          if (dineIn && !restaurant.dineIn) return null;
          if (dineOut && !restaurant.dineOut) return null;

          const offers = sortOffersByPinning(
            offersMap.get(restaurant._id.toString()) || []
          );

          if (!offers.length) return null;

          const { homePin, areaPins, createdAt, ...restRestaurant } =
            restaurant;

          return {
            order: r.order ?? 0,
            pinMeta: getRestaurantPinMeta(restaurant, areaId),
            data: {
              ...restRestaurant,
              _id: restaurant._id.toString(),
              offers: offers.map((o: any) => ({
                id: o._id.toString(),
                title: o.title,
                tags: o.tags || [],
                startDate: toIso(o.startDate),
                expiryDate: toIso(o.expiryDate),
                status: o.status,
                totalCodes: o.maxRedemptionLimit,
                codesRedeemed: o.redeemCount,
                isUnlimited: o.isUnlimited,
                expiresAt: toIso(o.expiryDate),
              })),
            },
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((item: any) => item.data);

      return {
        _id: carousel._id.toString(),
        name: carousel.name,
        isGlobal: carousel.isGlobal,
        restaurants: preparedRestaurants,
        order:
          areaId && areaId !== "all"
            ? carousel.areaOrders?.find(
                (ao: any) => ao.areaId === areaId
              )?.order || carousel.globalOrder
            : carousel.globalOrder,
      };
    });

    return NextResponse.json({
      success: true,
      carousels: formattedCarousels,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("CAROUSEL_API_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch carousels",
        error:
          process.env.NODE_ENV === "development"
            ? error?.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

/* ---------------- helpers unchanged ---------------- */

function getRestaurantPinMeta(restaurant: any, areaId?: string | null) {
  const hasAreaFilter = areaId && areaId !== "all";

  if (hasAreaFilter) {
    const areaPin = Array.isArray(restaurant.areaPins)
      ? restaurant.areaPins.find(
          (p: any) =>
            p?.isPinned === true &&
            String(p.areaId) === String(areaId)
        )
      : null;

    if (areaPin) {
      return {
        isPinned: true,
        priority: areaPin.priority ?? 999,
        pinnedAt: areaPin.areaPinnedAt
          ? new Date(areaPin.areaPinnedAt).getTime()
          : 0,
      };
    }
  }

  const homePin = restaurant.homePin;

  if (homePin?.isPinned === true) {
    return {
      isPinned: true,
      priority: homePin.priority ?? 999,
      pinnedAt: homePin.pinnedAt
        ? new Date(homePin.pinnedAt).getTime()
        : 0,
    };
  }

  return { isPinned: false, priority: 999, pinnedAt: 0 };
}

function sortOffersByPinning(offers: any[]) {
  const pinned: any[] = [];
  const normal: any[] = [];

  offers.forEach((o) => {
    if (o.isPinned) pinned.push(o);
    else normal.push(o);
  });

  pinned.sort(
    (a, b) =>
      new Date(b.pinnedAt || 0).getTime() -
      new Date(a.pinnedAt || 0).getTime()
  );

  normal.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );

  return [...pinned, ...normal];
}