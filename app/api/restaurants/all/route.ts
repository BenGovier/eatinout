import { NextResponse } from "next/server";
import {
  DEFAULT_MAP_CENTER_LAT_LNG,
  DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES,
  isRestaurantDistanceFilterMiles,
} from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  parseMealTimeRange,
  parseValidHours,
  timeRangesOverlap,
} from "@/lib/restaurant-offer-time-filters";

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

/** `/map` list only — narrower projection + smaller JSON (see `mapList` query param). */
const RESTAURANT_COLUMNS_MAP_LIST =
  "id, name, slug, lat, lng, city, zip_code, dine_in, dine_out, created_at";

const RESTAURANT_EMBEDS_MAP_LIST =
  "restaurant_areas(area_id), restaurant_categories(category_id), restaurant_images(image_url, display_order)";

const RESTAURANT_EMBEDS_FULL = `${RESTAURANT_EMBEDS_MAP_LIST}, restaurant_area_pins(area_id, is_pinned, priority, pinned_at)`;

const OFFER_COLUMNS_MAP_LIST =
  "id, title, valid_days, valid_hours, start_date, expiry_date, status, is_deactivated, restaurant_id, redeem_count, max_redemption_limit, is_unlimited, is_pinned, pinned_at, created_at, current_period_count, recurring_type, recurring_start_date, last_reset_date";

const OFFER_COLUMNS_FULL = `${OFFER_COLUMNS_MAP_LIST}, associated_id`;

const EARTH_RADIUS_MILES = 3958.8;

function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/* ---------------- row mappers (Supabase -> old Mongo shape) ---------------- */

function mapRestaurantRow(r: any) {
  const images = (r.restaurant_images ?? [])
    .slice()
    .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((i: any) => i.image_url);

  return {
    _id: r.id as string,
    name: r.name,
    slug: r.slug,
    // cuisine / state / price_range / opening_hours are read only if those columns exist (select "*")
    cuisine: r.cuisine,
    address: r.address,
    city: r.city,
    state: r.state,
    zipCode: r.zip_code,
    lat: r.lat,
    lng: r.lng,
    area: (r.restaurant_areas ?? []).map((x: any) => x.area_id),
    category: (r.restaurant_categories ?? []).map((x: any) => x.category_id),
    images,
    dineIn: r.dine_in,
    dineOut: r.dine_out,
    priceRange: r.price_range,
    openingHours: r.opening_hours,
    deliveryAvailable: r.delivery_available,
    addressLink: r.address_link,
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
    title: o.title,
    validDays: o.valid_days,
    validHours: o.valid_hours,
    startDate: o.start_date,
    expiryDate: o.expiry_date,
    status: o.status,
    deactivated: o.is_deactivated,
    restaurantId: o.restaurant_id as string,
    redeemCount: o.redeem_count,
    maxRedemptionLimit: o.max_redemption_limit,
    isUnlimited: o.is_unlimited,
    isPinned: o.is_pinned,
    pinnedAt: o.pinned_at,
    createdAt: o.created_at,
    currentPeriodCount: o.current_period_count,
    recurringType: o.recurring_type,
    recurringStartDate: o.recurring_start_date,
    lastResetDate: o.last_reset_date,
    associatedId: o.associated_id,
  };
}

/** search -> matching category ids + restaurant ids that have an offer with a matching tag */
async function resolveSearch(search: string) {
  const pattern = `%${escapeLike(search)}%`;

  const [categoriesRes, tagsRes] = await Promise.all([
    supabaseAdmin.from("categories").select("id").ilike("name", pattern),
    supabaseAdmin.from("tags").select("id").ilike("name", pattern),
  ]);
  if (categoriesRes.error) throw new Error(categoriesRes.error.message);
  if (tagsRes.error) throw new Error(tagsRes.error.message);

  const categoryIds = new Set<string>(
    (categoriesRes.data || []).map((c: any) => c.id),
  );
  const tagIds: string[] = (tagsRes.data || []).map((t: any) => t.id);

  const restaurantIdsFromOffers = new Set<string>();
  if (tagIds.length > 0) {
    const parts = await Promise.all(
      chunk(tagIds).map((ids) =>
        fetchAll((from, to) =>
          supabaseAdmin
            .from("offer_tags")
            .select("offer_id, tag_id, offers!inner(restaurant_id, is_deactivated)")
            .in("tag_id", ids)
            .eq("offers.is_deactivated", false)
            .order("offer_id", { ascending: true })
            .order("tag_id", { ascending: true })
            .range(from, to),
        ),
      ),
    );
    parts.flat().forEach((row: any) => {
      const offer = Array.isArray(row.offers) ? row.offers[0] : row.offers;
      if (offer?.restaurant_id) restaurantIdsFromOffers.add(offer.restaurant_id);
    });
  }

  return { categoryIds, restaurantIdsFromOffers };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy")?.trim() || "closest";
    /** Marketing welcome listing: no default Blackpool radius; area/search filters only. */
    const isWelcomeList = searchParams.get("welcome") === "1";
    /** Home /restaurants & / (welcome) grid + horizontal carousels — pinning sort. Omit on /map (distance sort). */
    const useBrowsePinSort = searchParams.get("browsePinSort") === "1";
    /** Map restaurant list (`/map`) — slim DB fields + response shape only; must not be set by other callers. */
    const isMapList = searchParams.get("mapList") === "1";

    const areaFilter = searchParams.get("area");
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const priceRange = searchParams.get("priceRange");
    const dineIn = searchParams.get("dineIn") === "true";
    const dineOut = searchParams.get("dineOut") === "true";
    const days = searchParams.get("days");
    const mealTimes = searchParams.get("mealTimes");
    const maxDistanceMilesRaw = searchParams.get("maxDistanceMiles");
    const distanceFilterAll =
      maxDistanceMilesRaw?.trim().toLowerCase() === "all";

    let maxDistanceMiles: number = DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES;
    if (maxDistanceMilesRaw && !distanceFilterAll) {
      const parsed = parseInt(maxDistanceMilesRaw, 10);
      if (isRestaurantDistanceFilterMiles(parsed)) {
        maxDistanceMiles = parsed;
      }
    }

    let originLat: number = DEFAULT_MAP_CENTER_LAT_LNG.lat;
    let originLng: number = DEFAULT_MAP_CENTER_LAT_LNG.lng;
    const userLatRaw = searchParams.get("userLat");
    const userLngRaw = searchParams.get("userLng");
    const ulat = userLatRaw != null ? parseFloat(userLatRaw) : NaN;
    const ulng = userLngRaw != null ? parseFloat(userLngRaw) : NaN;
    if (Number.isFinite(ulat) && Number.isFinite(ulng)) {
      originLat = ulat;
      originLng = ulng;
    }

    const hasUserCoords = Number.isFinite(ulat) && Number.isFinite(ulng);
    /**
     * Browse-by-area (home /restaurants, carousels): no map pin — only `area` should constrain
     * geography. Default radius around Blackpool would intersect away every other region.
     * Map view sends `maxDistanceMiles=all` to skip radius; otherwise userLat/userLng set the origin.
     */
    const isAreaListingWithoutPin =
      Boolean(areaFilter && areaFilter !== "all") && !hasUserCoords;
    const skipGeoFilter = isWelcomeList || isAreaListingWithoutPin;

    /* ---------------- FETCH RESTAURANTS (approved + not hidden) ---------------- */
    // "*" is used whenever a column that may not exist in the slim list is needed (price_range filter).
    const columns =
      isMapList && !priceRange ? RESTAURANT_COLUMNS_MAP_LIST : "*";
    const embeds = isMapList
      ? RESTAURANT_EMBEDS_MAP_LIST
      : RESTAURANT_EMBEDS_FULL;

    const restaurantRows = await fetchAll((from, to) => {
      let q: any = supabaseAdmin
        .from("restaurants")
        .select(`${columns}, ${embeds}`)
        .eq("status", "approved")
        .eq("is_hidden", false);
      if (dineIn) q = q.eq("dine_in", true);
      if (dineOut) q = q.eq("dine_out", true);
      return q
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);
    });

    let restaurants: any[] = restaurantRows.map(mapRestaurantRow);

    // Handle area filter
    if (areaFilter && areaFilter !== "all") {
      restaurants = restaurants.filter((r) => r.area.includes(areaFilter));
    }

    // Handle category filter - supports multiple categories
    if (categoryId && categoryId !== "all") {
      const categoryIds = categoryId
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id);

      if (categoryIds.length > 0) {
        restaurants = restaurants.filter((r) =>
          r.category.some((id: string) => categoryIds.includes(id)),
        );
      }
    }

    if (search) {
      const { categoryIds, restaurantIdsFromOffers } =
        await resolveSearch(search);
      const lowerSearch = search.toLowerCase();

      restaurants = restaurants.filter(
        (r) =>
          (r.name ?? "").toLowerCase().includes(lowerSearch) ||
          r.category.some((id: string) => categoryIds.has(id)) ||
          restaurantIdsFromOffers.has(r._id),
      );
    }

    if (priceRange && priceRange !== "all") {
      restaurants = restaurants.filter((r) => r.priceRange === priceRange);
    }

    // Distance filter (lat/lng + haversine; same radius logic as the old 2dsphere $centerSphere).
    // Welcome / area browse omit user coords — do not apply default radius (see skipGeoFilter).
    // `maxDistanceMiles=all` skips radius only; response still includes distances from origin for sort/UI.
    if (!skipGeoFilter && !distanceFilterAll) {
      restaurants = restaurants.filter(
        (r) =>
          typeof r.lat === "number" &&
          typeof r.lng === "number" &&
          Number.isFinite(r.lat) &&
          Number.isFinite(r.lng) &&
          haversineDistanceMiles(originLat, originLng, r.lat, r.lng) <=
            maxDistanceMiles,
      );
    }

    /* ---------------- AREAS + CATEGORIES LOOKUP ---------------- */
    const areasRes = await supabaseAdmin
      .from("areas")
      .select("id, name, hide_restaurant");
    if (areasRes.error) throw new Error(areasRes.error.message);
    const areaMap = new Map(
      (areasRes.data || []).map((a: any) => [
        a.id as string,
        { _id: a.id as string, name: a.name, hideRestaurant: a.hide_restaurant },
      ]),
    );

    const categoryMap = new Map<string, any>();
    if (!isMapList) {
      const categoriesRes = await supabaseAdmin
        .from("categories")
        .select("id, name");
      if (categoriesRes.error) throw new Error(categoriesRes.error.message);
      for (const c of categoriesRes.data || []) {
        categoryMap.set((c as any).id, c);
      }
    }

    /* ---------------- OFFERS ---------------- */
    const restaurantIds = restaurants.map((r: any) => r._id.toString());

    let offersRaw: any[] = [];
    if (restaurantIds.length > 0) {
      const offerColumns = isMapList
        ? OFFER_COLUMNS_MAP_LIST
        : OFFER_COLUMNS_FULL;
      const parts = await Promise.all(
        chunk(restaurantIds).map((ids) =>
          fetchAll((from, to) =>
            supabaseAdmin
              .from("offers")
              .select(offerColumns)
              .in("restaurant_id", ids)
              .order("id", { ascending: true })
              .range(from, to),
          ),
        ),
      );
      offersRaw = parts.flat().map(mapOfferRow);
    }

    const now = new Date();
    const statusUpdates: { id: string; status: string }[] = [];
    const resetIds: string[] = [];

    const offersGroupedByRestaurant = offersRaw.reduce(
      (acc: any, offer: any) => {
        let adjustedStatus = offer.status;
        if (!offer.deactivated) {
          const startDate = offer.startDate ? new Date(offer.startDate) : null;
          const expiryDate = offer.expiryDate
            ? new Date(offer.expiryDate)
            : null;

          if (startDate && startDate > now) adjustedStatus = "inactive";
          else if (expiryDate && expiryDate < now) adjustedStatus = "expired";
          else if (
            startDate &&
            startDate <= now &&
            (!expiryDate || expiryDate > now)
          )
            adjustedStatus = "active";
          else if (!expiryDate) adjustedStatus = "active";

          // Track offers that need database updates (when status changed)
          if (adjustedStatus !== offer.status) {
            statusUpdates.push({ id: offer._id, status: adjustedStatus });
          }
        }

        let currentPeriodCount = offer.currentPeriodCount || 0;
        if (offer.maxRedemptionLimit && offer.maxRedemptionLimit > 0 && offer.recurringType && offer.recurringType !== "never") {
          const lastReset = offer.lastResetDate || offer.recurringStartDate || offer.createdAt;
          let shouldReset = false;

          if (offer.recurringType === "weekly") {
            const daysSinceReset = Math.floor((now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24));
            shouldReset = daysSinceReset >= 7;
          } else if (offer.recurringType === "monthly") {
            const daysSinceReset = Math.floor((now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24));
            shouldReset = daysSinceReset >= 30;
          }

          if (shouldReset) {
            currentPeriodCount = 0;
            resetIds.push(offer._id);
          }
        }

        // Filter out inactive and expired deals from response
        if (adjustedStatus === "inactive" || adjustedStatus === "expired") {
          return acc;
        }

        // Only include active deals in the response
        if (adjustedStatus === "active") {
          // Hide offers that have reached their redemption limit
          if (!offer.isUnlimited && offer.maxRedemptionLimit) {
            const currentCount = (offer.recurringType && offer.recurringType !== "never")
              ? currentPeriodCount
              : (offer.redeemCount || 0);

            const remaining = offer.maxRedemptionLimit - currentCount;
            if (remaining <= 0) return acc;
          }

          acc[offer.restaurantId.toString()] =
            acc[offer.restaurantId.toString()] || [];
          acc[offer.restaurantId.toString()].push({
            ...offer,
            status: adjustedStatus,
            currentPeriodCount
          });
        }

        return acc;
      },
      {} as Record<string, any[]>,
    );

    if (statusUpdates.length > 0 || resetIds.length > 0) {
      await applyOfferUpdates(statusUpdates, resetIds, now);
    }

    const formattedRestaurants = restaurants
      .map((restaurant: any) => {
        const restaurantId = restaurant._id.toString();

        const assignedAreas = (
          Array.isArray(restaurant.area) ? restaurant.area : []
        )
          .map((areaId: any) => areaMap.get(areaId.toString()))
          .filter((area: any) => !!area);

        // Skip restaurants in hidden areas
        if (assignedAreas.some((area: any) => area.hideRestaurant)) return null;

        const activeOffersRaw = (
          offersGroupedByRestaurant[restaurantId] || []
        ).filter((o: any) => o.status === "active");

        // Only live active restaurants should be showing (must have at least 1 active offer)
        if (activeOffersRaw.length === 0) return null;

        // Sort offers by pinning status: newest pinned → older pinned → newest unpinned → older unpinned
        const activeOffers = sortOffersByPinning(activeOffersRaw);
        const offerValidDays = activeOffers.map((o: any) => o.validDays);

        if (isMapList) {
          const categoryIdsRaw = Array.isArray(restaurant.category)
            ? restaurant.category
            : restaurant.category != null
              ? [restaurant.category]
              : [];
          const categoryIds = categoryIdsRaw.map((id: any) => String(id));

          return {
            id: restaurantId,
            slug: restaurant.slug ?? "",
            name: restaurant.name,
            city: restaurant.city || "",
            zipCode: restaurant.zipCode || "",
            lat: restaurant.lat ?? null,
            lng: restaurant.lng ?? null,
            imageUrl:
              restaurant.images?.[0] ||
              "/placeholder.svg?sheight=400&width=800",
            dealsCount: activeOffers.length,
            dineIn: restaurant.dineIn ?? false,
            dineOut: restaurant.dineOut ?? false,
            categoryIds,
            offers: activeOffers.map((offer: any) => {
              const row: Record<string, unknown> = {
                id: offer._id.toString(),
                title: offer.title,
                totalCodes: offer.maxRedemptionLimit
                  ? offer.maxRedemptionLimit
                  : null,
                codesRedeemed: (offer.recurringType && offer.recurringType !== "never") ? (offer.currentPeriodCount || 0) : (offer.redeemCount || 0),
                isUnlimited: offer.isUnlimited || false,
              };
              if (offer.validHours) {
                row.validHours = offer.validHours;
              }
              return row;
            }),
            validDays: offerValidDays,
            area: restaurant.area,
          };
        }

        const categoriesData = (
          Array.isArray(restaurant.category)
            ? restaurant.category
            : [restaurant.category]
        ).map((catId: any) => ({
          id: catId,
          name: categoryMap.get(catId.toString())?.name || "Uncategorized",
        }));

        const locationParts = [];
        if (restaurant.address) locationParts.push(restaurant.address);
        if (restaurant.city) locationParts.push(restaurant.city);
        if (restaurant.state) locationParts.push(restaurant.state);
        if (restaurant.zipCode)
          locationParts.push(restaurant.zipCode.toUpperCase());
        const fullLocation =
          locationParts.length > 0
            ? locationParts.join(", ")
            : "Location not available";

        // Format areaPins (NEW SCHEMA)
        const formattedAreaPins =
          Array.isArray(restaurant.areaPins) && restaurant.areaPins.length > 0
            ? restaurant.areaPins
              .map((pin: any) => {
                const area = areaMap.get(pin.areaId?.toString());
                if (!area || !pin.isPinned) return null;

                return {
                  areaId: area._id.toString(),
                  areaName: area.name,
                  priority: pin.priority,
                  pinnedAt: pin.areaPinnedAt,
                };
              })
              .filter(Boolean)
            : [];

        return {
          id: restaurantId,
          slug: restaurant.slug ?? "",
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          location: fullLocation,
          address: restaurant.address || "",
          city: restaurant.city || "",
          state: restaurant.state || "",
          zipCode: restaurant.zipCode || "",
          lat: restaurant.lat ?? null,
          lng: restaurant.lng ?? null,
          addressLink: restaurant.addressLink || "",
          area: restaurant.area,
          rating: 4.5,
          dealsCount: activeOffers.length,
          offers: activeOffers.map((offer: any) => {
            return {
              id: offer._id.toString(),
              title: offer.title,
              tags: Array.isArray(offer.validDays)
                ? offer.validDays
                : offer.validDays?.split(",").map((d: string) => d.trim()) ||
                [],
              startDate: toIso(offer.startDate),
              expiryDate: toIso(offer.expiryDate),
              status: offer.status,
              totalCodes: offer.maxRedemptionLimit
                ? offer.maxRedemptionLimit
                : null,
              codesRedeemed: (offer.recurringType && offer.recurringType !== "never") ? (offer.currentPeriodCount || 0) : (offer.redeemCount || 0),
              isUnlimited: offer.isUnlimited || false,
              expiresAt: toIso(offer.expiryDate),
            };
          }),
          imageUrl:
            restaurant.images?.[0] || "/placeholder.svg?sheight=400&width=800",
          dineIn: restaurant.dineIn || false,
          dineOut: restaurant.dineOut || false,
          priceRange: restaurant.priceRange || "N/A",
          openingHours: restaurant.openingHours || "N/A",
          category: categoriesData,
          deliveryAvailable: restaurant.deliveryAvailable || false,
          validDays: offerValidDays,

          homePin: restaurant.homePin || {
            isPinned: false,
            priority: null,
            pinnedAt: null,
          },
          areaPins: formattedAreaPins,
          createdAt: restaurant.createdAt,
        };
      })
      .filter((r) => r !== null);

    // Filter restaurants by selected days if needed
    let finalFormattedRestaurants = formattedRestaurants;

    if (days) {
      const selectedDays = days
        .toLowerCase()
        .split(",")
        .map((d) => d.trim());
      finalFormattedRestaurants = formattedRestaurants.filter(
        (restaurant: any) => {
          if (!restaurant.validDays || restaurant.validDays.length === 0)
            return false;

          const validDaysNormalized = restaurant.validDays
            .filter((validDay: any) => validDay)
            .flatMap((dayStr: string | string[]) => {
              if (Array.isArray(dayStr)) {
                return dayStr.flatMap((d) => d.split(","));
              }
              return dayStr.split(",");
            })
            .map((d: string) => d.trim().toLowerCase());

          return (
            validDaysNormalized.includes("all week") ||
            selectedDays.some((day: string) =>
              validDaysNormalized.includes(day),
            )
          );
        },
      );
    }

    // Filter restaurants by meal times if needed
    if (mealTimes) {
      const selectedMealTimes = mealTimes.split(",").map((mt) => mt.trim());
      const mealTimeRanges = selectedMealTimes
        .map(parseMealTimeRange)
        .filter(
          (range): range is { start: number; end: number } => range !== null,
        );

      if (mealTimeRanges.length > 0) {
        finalFormattedRestaurants = finalFormattedRestaurants.filter(
          (restaurant: any) => {
            // Get all offers for this restaurant from offersGroupedByRestaurant
            const restaurantOffers =
              offersGroupedByRestaurant[restaurant.id] || [];

            // Check if at least one active offer has validHours that overlap with selected meal times
            return restaurantOffers.some((offer: any) => {
              if (offer.status !== "active" || !offer.validHours) return false;

              const offerTimeRange = parseValidHours(offer.validHours);
              if (!offerTimeRange) return false;

              // Check if offer time range overlaps with any selected meal time range
              return mealTimeRanges.some(
                (mealRange: { start: number; end: number }) =>
                  timeRangesOverlap(offerTimeRange, mealRange),
              );
            });
          },
        );
      }
    }

    const attachDistanceFromOrigin = !skipGeoFilter || distanceFilterAll;

    finalFormattedRestaurants = attachDistanceFromOrigin
      ? finalFormattedRestaurants.map((restaurant: any) => {
        const lat = restaurant.lat;
        const lng = restaurant.lng;
        if (
          typeof lat !== "number" ||
          typeof lng !== "number" ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return restaurant;
        }
        const miles = haversineDistanceMiles(originLat, originLng, lat, lng);
        const distanceMiles = Math.round(miles * 10) / 10;
        return { ...restaurant, distanceMiles };
      })
      : finalFormattedRestaurants;

    // Remove validDays from all restaurants
    const cleanedRestaurants = finalFormattedRestaurants.map((r: any) => {
      const { validDays, ...rest } = r;
      if (isMapList) {
        return { ...rest, validDays };
      }
      return rest;
    });

    // Browse pages: home / area pinning. Map & other callers: distance / createdAt (`sortBy`).
    let sortedRestaurants: typeof cleanedRestaurants;
    if (useBrowsePinSort) {
      sortedRestaurants = sortRestaurantsByPinning(
        cleanedRestaurants,
        areaFilter && areaFilter !== "all" ? areaFilter : null,
      );
    } else {
      switch (sortBy) {
        case "closest":
        default:
          if (skipGeoFilter) {
            sortedRestaurants = [...cleanedRestaurants].sort(
              (a: { createdAt?: Date }, b: { createdAt?: Date }) =>
                new Date(b.createdAt ?? 0).getTime() -
                new Date(a.createdAt ?? 0).getTime(),
            );
          } else {
            sortedRestaurants = [...cleanedRestaurants].sort(
              (a: { distanceMiles?: number }, b: { distanceMiles?: number }) =>
                (a.distanceMiles ?? Number.POSITIVE_INFINITY) -
                (b.distanceMiles ?? Number.POSITIVE_INFINITY),
            );
          }
      }
    }

    const finalRestaurants = sortedRestaurants.map(
      ({ homePin, areaPins, createdAt, ...rest }) => rest,
    );

    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");
    const applyPagination = rawPage != null || rawLimit != null;

    const MAX_PAGE_SIZE = 500;
    let pageNum = 1;
    let limitNum = 12;

    if (applyPagination) {
      pageNum = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
      const parsedLimit = parseInt(rawLimit ?? "12", 10);
      limitNum = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 12),
      );
    }

    const totalCount = finalRestaurants.length;
    let restaurantsPayload = finalRestaurants;
    let pagination: {
      currentPage: number;
      totalPages: number;
      totalRestaurants: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };

    if (applyPagination) {
      const start = (pageNum - 1) * limitNum;
      restaurantsPayload = finalRestaurants.slice(start, start + limitNum);
      const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));
      pagination = {
        currentPage: pageNum,
        totalPages,
        totalRestaurants: totalCount,
        hasNextPage: start + restaurantsPayload.length < totalCount,
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      };
    } else {
      pagination = {
        currentPage: 1,
        totalPages: 1,
        totalRestaurants: totalCount,
        hasNextPage: false,
        hasPrevPage: false,
        limit: totalCount,
      };
    }

    console.log(
      `✓ Returning ${restaurantsPayload.length} restaurants (page ${pagination.currentPage}/${pagination.totalPages}, applyPagination=${applyPagination}). Total with active offers: ${totalCount} (${formattedRestaurants.length} before day filtering)`,
    );

    // ✅ COUNT TOTAL ACTIVE OFFERS PER AREA
    const areaOfferCounts: Record<string, number> = {};

    formattedRestaurants.forEach((restaurant: any) => {
      const offerCount = restaurant.dealsCount || 0;
      const areas = Array.isArray(restaurant.area) ? restaurant.area : [];

      areas.forEach((areaId: string) => {
        areaOfferCounts[areaId] = (areaOfferCounts[areaId] || 0) + offerCount;
      });
    });

    // Count total ACTIVE offers across all restaurants in final results
    const selectedAreaOfferCount =
      areaFilter && areaFilter !== "all"
        ? areaOfferCounts[areaFilter] || 0
        : null;

    const response = NextResponse.json({
      success: true,
      restaurants: restaurantsPayload,
      selectedAreaOfferCount,
      pagination,
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    return response;
  } catch (error: any) {
    console.error("✗ Error fetching restaurants:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurants",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Helper function to sort offers by pinning status
function sortOffersByPinning(offers: any[]): any[] {
  // Separate pinned and non-pinned offers
  const pinnedOffers: any[] = [];
  const nonPinnedOffers: any[] = [];

  offers.forEach((offer) => {
    if (offer.isPinned === true) {
      pinnedOffers.push(offer);
    } else {
      nonPinnedOffers.push(offer);
    }
  });

  // Sort pinned offers by pinnedAt in descending order (newest pinned first)
  pinnedOffers.sort((a, b) => {
    const dateA = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
    const dateB = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
    return dateB - dateA; // Descending order (newest first)
  });

  // Sort unpinned offers by createdAt in descending order (newest first)
  nonPinnedOffers.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA; // Descending order (newest first)
  });

  // Return pinned offers first (newest pinned → older pinned), then non-pinned (newest → oldest)
  return [...pinnedOffers, ...nonPinnedOffers];
}

/** Restaurant list order for /restaurants and / (welcome); not used for map distance sort. */
function sortRestaurantsByPinning(
  restaurants: any[],
  areaFilter: string | null,
): any[] {
  const homePinned: any[] = [];
  const areaPinned: any[] = [];
  const areaMatchedNonPinned: any[] = [];
  const regular: any[] = [];

  restaurants.forEach((restaurant) => {
    if (areaFilter) {
      const areaPin = Array.isArray(restaurant.areaPins)
        ? restaurant.areaPins.find(
          (p: any) =>
            p.areaId === areaFilter &&
            p.priority !== null &&
            p.priority !== undefined,
        )
        : null;

      if (areaPin) {
        areaPinned.push(restaurant);
        return;
      }

      if (
        Array.isArray(restaurant.area) &&
        restaurant.area.map(String).includes(areaFilter)
      ) {
        areaMatchedNonPinned.push(restaurant);
        return;
      }

      regular.push(restaurant);
      return;
    }

    const homePin = restaurant.homePin || {};

    if (homePin.isPinned === true && homePin.priority !== null) {
      homePinned.push(restaurant);
      return;
    }

    regular.push(restaurant);
  });

  areaPinned.sort((a, b) => {
    const pinA = a.areaPins.find((p: any) => p.areaId === areaFilter);
    const pinB = b.areaPins.find((p: any) => p.areaId === areaFilter);

    const prioA = pinA?.priority ?? 999;
    const prioB = pinB?.priority ?? 999;
    if (prioA !== prioB) return prioA - prioB;

    const dateA = pinA?.pinnedAt ? new Date(pinA.pinnedAt).getTime() : 0;
    const dateB = pinB?.pinnedAt ? new Date(pinB.pinnedAt).getTime() : 0;

    return dateB - dateA;
  });

  areaMatchedNonPinned.sort((a, b) => {
    const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dB - dA;
  });

  homePinned.sort((a, b) => {
    const pA = a.homePin?.priority ?? 999;
    const pB = b.homePin?.priority ?? 999;
    if (pA !== pB) return pA - pB;

    const dA = a.homePin?.pinnedAt ? new Date(a.homePin.pinnedAt).getTime() : 0;
    const dB = b.homePin?.pinnedAt ? new Date(b.homePin.pinnedAt).getTime() : 0;

    return dB - dA;
  });

  regular.sort((a, b) => {
    const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dB - dA;
  });

  return areaFilter
    ? [...areaPinned, ...areaMatchedNonPinned, ...regular]
    : [...homePinned, ...regular];
}