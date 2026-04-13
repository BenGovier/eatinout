import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  DEFAULT_MAP_CENTER_LAT_LNG,
  DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES,
  isRestaurantDistanceFilterMiles,
} from "@/lib/constants";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Offer from "@/models/Offer";
import { Category } from "@/models/Categories";
import Area from "@/models/Area";
import Tag from "@/models/Tag";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy')?.trim() || 'closest';

    const areaFilter = searchParams.get('area');
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const priceRange = searchParams.get('priceRange');
    const dineIn = searchParams.get('dineIn') === 'true';
    const dineOut = searchParams.get('dineOut') === 'true';
    const days = searchParams.get('days');
    const mealTimes = searchParams.get('mealTimes');
    const maxDistanceMilesRaw = searchParams.get('maxDistanceMiles');

    let maxDistanceMiles: number = DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES;
    if (maxDistanceMilesRaw) {
      const parsed = parseInt(maxDistanceMilesRaw, 10);
      if (isRestaurantDistanceFilterMiles(parsed)) {
        maxDistanceMiles = parsed;
      }
    }

    let originLat: number = DEFAULT_MAP_CENTER_LAT_LNG.lat;
    let originLng: number = DEFAULT_MAP_CENTER_LAT_LNG.lng;
    const userLatRaw = searchParams.get('userLat');
    const userLngRaw = searchParams.get('userLng');
    const ulat = userLatRaw != null ? parseFloat(userLatRaw) : NaN;
    const ulng = userLngRaw != null ? parseFloat(userLngRaw) : NaN;
    if (Number.isFinite(ulat) && Number.isFinite(ulng)) {
      originLat = ulat;
      originLng = ulng;
    }

    const query: any = { status: "approved", hidden: { $ne: true } };

    // Handle area filter - supports both string and array of area IDs
    if (areaFilter && areaFilter !== 'all') {
      query.area = { $in: [areaFilter] };
    }

    // Handle category filter - supports multiple categories
    if (categoryId && categoryId !== 'all') {
      const categoryIds = categoryId.split(',').map(id => id.trim()).filter(id => id);

      if (categoryIds.length > 0) {
        query.category = { $in: categoryIds };
      }
    }

    if (search) {
  const escapedSearch = escapeRegex(search);

  const categoriesMatchingSearch = await Category.find({
    name: { $regex: escapedSearch, $options: "i" }
  }).select("_id").lean();

  const categoryIds = categoriesMatchingSearch.map(c => c._id);

  const tagsMatchingSearch = await Tag.find({
    name: { $regex: escapedSearch, $options: "i" }
  }).select("_id").lean();

  const tagIds = tagsMatchingSearch.map(t => t._id);

  const offersWithMatchingTags = await Offer.find({
    tags: { $in: tagIds },
    deactivated: { $ne: true }
  }).select("restaurantId").lean();

  const restaurantIdsFromOffers = [
    ...new Set(offersWithMatchingTags.map(o => o.restaurantId.toString()))
  ];

  query.$or = [
    { name: { $regex: escapedSearch, $options: "i" } },
    { category: { $in: categoryIds } },
    { _id: { $in: restaurantIdsFromOffers } }
  ];
}
    if (priceRange && priceRange !== 'all') query.priceRange = priceRange;
    if (dineIn) query.dineIn = true;
    if (dineOut) query.dineOut = true;

    // Distance filter at DB level (2dsphere + $centerSphere; radius in radians)
    const radiusRadians = maxDistanceMiles / EARTH_RADIUS_MILES;
    query.location = {
      $geoWithin: {
        $centerSphere: [[originLng, originLat], radiusRadians],
      },
    };

    const restaurants = await Restaurant.find(query)
      .select('name slug cuisine address city state zipCode lat lng area category images dineIn dineOut priceRange openingHours deliveryAvailable addressLink homePin areaPins createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const allAreaIds = restaurants.flatMap(r => Array.isArray(r.area) ? r.area : []);
    const uniqueAreaIds = [...new Set(allAreaIds.map(String))];
    const areas = await Area.find({ _id: { $in: uniqueAreaIds } }).lean();
    const areaMap = new Map(areas.map((a: any) => [a._id.toString(), a]));

    const allCategoryIds = restaurants.flatMap(r => Array.isArray(r.category) ? r.category : [r.category]);
    const uniqueCategoryIds = [...new Set(allCategoryIds.map(String))];
    const categories = await Category.find({ _id: { $in: uniqueCategoryIds } }).lean();
    const categoryMap = new Map(categories.map((c: any) => [c._id.toString(), c]));

    const restaurantIds = restaurants.map((r: any) => r._id.toString());
    const offersRaw = await Offer.find({ restaurantId: { $in: restaurantIds } })
      .select("title associatedId validDays validHours startDate expiryDate status deactivated restaurantId redeemCount maxRedemptionLimit isUnlimited isPinned pinnedAt createdAt _id")
      .lean();

    const now = new Date();
    const offersToUpdate: { id: string; status: string }[] = [];

    const offersGroupedByRestaurant = offersRaw.reduce((acc: any, offer: any) => {
      let adjustedStatus = offer.status;
      if (!offer.deactivated) {
        const startDate = offer.startDate ? new Date(offer.startDate) : null;
        const expiryDate = offer.expiryDate ? new Date(offer.expiryDate) : null;

        if (startDate && startDate > now) adjustedStatus = "inactive";
        else if (expiryDate && expiryDate < now) adjustedStatus = "expired";
        else if (startDate && startDate <= now && (!expiryDate || expiryDate > now)) adjustedStatus = "active";
        else if (!expiryDate) adjustedStatus = "active";

        // Track offers that need database updates (when status changed)
        if (adjustedStatus !== offer.status) {
          offersToUpdate.push({ id: offer._id.toString(), status: adjustedStatus });
        }
      }

      // Filter out inactive and expired deals from response
      if (adjustedStatus === "inactive" || adjustedStatus === "expired") {
        return acc;
      }

      // Only include active deals in the response
      if (adjustedStatus === "active") {
        acc[offer.restaurantId.toString()] = acc[offer.restaurantId.toString()] || [];
        acc[offer.restaurantId.toString()].push({ ...offer, status: adjustedStatus });
      }

      return acc;
    }, {} as Record<string, any[]>);

    // Update database for offers with changed status (bulk write to avoid N round trips)
    if (offersToUpdate.length > 0) {
      const bulkOps = offersToUpdate.map(({ id, status }) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: { $set: { status } },
        },
      }));
      await Offer.bulkWrite(bulkOps);
    }

    const formattedRestaurants = restaurants.map((restaurant: any) => {
      const restaurantId = restaurant._id.toString();

      const assignedAreas = (Array.isArray(restaurant.area) ? restaurant.area : [])
        .map((areaId: any) => areaMap.get(areaId.toString()))
        .filter((area: any) => !!area);

      // Skip restaurants in hidden areas
      if (assignedAreas.some((area: any) => area.hideRestaurant)) return null;

      const activeOffersRaw = (offersGroupedByRestaurant[restaurantId] || []).filter((o: any) => o.status === "active");
      // Sort offers by pinning status: newest pinned → older pinned → newest unpinned → older unpinned
      const activeOffers = sortOffersByPinning(activeOffersRaw);
      const offerValidDays = activeOffers.map((o: any) => o.validDays);

      const categoriesData = (Array.isArray(restaurant.category) ? restaurant.category : [restaurant.category])
        .map((catId: any) => ({
          id: catId,
          name: categoryMap.get(catId.toString())?.name || "Uncategorized"
        }));

      const locationParts = [];
      if (restaurant.address) locationParts.push(restaurant.address);
      if (restaurant.city) locationParts.push(restaurant.city);
      if (restaurant.state) locationParts.push(restaurant.state);
      if (restaurant.zipCode) locationParts.push(restaurant.zipCode.toUpperCase());
      const fullLocation = locationParts.length > 0 ? locationParts.join(", ") : "Location not available";

      // Format areaPins (NEW SCHEMA)
      const formattedAreaPins =
        Array.isArray(restaurant.areaPins) && restaurant.areaPins.length > 0
          ? restaurant.areaPins
            .map((pin: any) => {
              const area = areaMap.get(pin.areaId?.toString())
              if (!area || !pin.isPinned) return null

              return {
                areaId: area._id.toString(),
                areaName: area.name,
                priority: pin.priority,
                pinnedAt: pin.areaPinnedAt,
              }
            })
            .filter(Boolean)
          : []

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
              : offer.validDays?.split(',').map((d: string) => d.trim()) || [],
            startDate: offer.startDate,
            expiryDate: offer.expiryDate,
            status: offer.status,
            totalCodes: offer.maxRedemptionLimit ? offer.maxRedemptionLimit : null,
            codesRedeemed: offer.redeemCount || 0,
            isUnlimited: offer.isUnlimited || false,
            expiresAt: offer.expiryDate,
          };
        }),
        imageUrl: restaurant.images?.[0] || "/placeholder.svg?sheight=400&width=800",
        dineIn: restaurant.dineIn || false,
        dineOut: restaurant.dineOut || false,
        priceRange: restaurant.priceRange || "N/A",
        openingHours: restaurant.openingHours || "N/A",
        category: categoriesData,
        deliveryAvailable: restaurant.deliveryAvailable || false,
        validDays: offerValidDays,

        homePin: restaurant.homePin || { isPinned: false, priority: null, pinnedAt: null },
        areaPins: formattedAreaPins,
        createdAt: restaurant.createdAt,
      };
    }).filter(r => r !== null);

    // Filter restaurants by selected days if needed
    let finalFormattedRestaurants = formattedRestaurants;

    if (days) {
      const selectedDays = days.toLowerCase().split(',').map(d => d.trim());
      finalFormattedRestaurants = formattedRestaurants.filter((restaurant: any) => {
        if (!restaurant.validDays || restaurant.validDays.length === 0) return false;

        const validDaysNormalized = restaurant.validDays
          .filter((validDay: any) => validDay)
          .flatMap((dayStr: string | string[]) => {
            if (Array.isArray(dayStr)) {
              return dayStr.flatMap(d => d.split(","));
            }
            return dayStr.split(",");
          })
          .map((d: string) => d.trim().toLowerCase());

        return validDaysNormalized.includes("all week") ||
          selectedDays.some((day: string) => validDaysNormalized.includes(day));
      });
    }

    // Filter restaurants by meal times if needed
    if (mealTimes) {
      const selectedMealTimes = mealTimes.split(',').map(mt => mt.trim());
      const mealTimeRanges = selectedMealTimes
        .map(parseMealTimeRange)
        .filter((range): range is { start: number; end: number } => range !== null);

      if (mealTimeRanges.length > 0) {
        finalFormattedRestaurants = finalFormattedRestaurants.filter((restaurant: any) => {
          // Get all offers for this restaurant from offersGroupedByRestaurant
          const restaurantOffers = offersGroupedByRestaurant[restaurant.id] || [];

          // Check if at least one active offer has validHours that overlap with selected meal times
          return restaurantOffers.some((offer: any) => {
            if (offer.status !== 'active' || !offer.validHours) return false;

            const offerTimeRange = parseValidHours(offer.validHours);
            if (!offerTimeRange) return false;

            // Check if offer time range overlaps with any selected meal time range
            return mealTimeRanges.some((mealRange: { start: number; end: number }) =>
              timeRangesOverlap(offerTimeRange, mealRange)
            );
          });
        });
      }
    }

    finalFormattedRestaurants = finalFormattedRestaurants.map(
      (restaurant: any) => {
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
        const miles = haversineDistanceMiles(
          originLat,
          originLng,
          lat,
          lng,
        );
        const distanceMiles = Math.round(miles * 10) / 10;
        return { ...restaurant, distanceMiles };
      },
    );

    // Remove validDays from all restaurants
    const cleanedRestaurants = finalFormattedRestaurants.map(({ validDays, ...rest }: any) => rest);

    // Sort (closest first). `sortBy` reserved for future options; only `closest` today.
    let sortedRestaurants: typeof cleanedRestaurants;
    switch (sortBy) {
      case 'closest':
      default:
        sortedRestaurants = [...cleanedRestaurants].sort(
          (a: { distanceMiles?: number }, b: { distanceMiles?: number }) =>
            (a.distanceMiles ?? Number.POSITIVE_INFINITY) -
            (b.distanceMiles ?? Number.POSITIVE_INFINITY),
        );
    }

    const totalFilteredRestaurants = sortedRestaurants.length;

    const finalRestaurants = sortedRestaurants.map(
      ({ homePin, areaPins, createdAt, ...rest }) => rest
    );

    console.log(`✓ Returning ${finalRestaurants.length} restaurants with active offers. Total: ${totalFilteredRestaurants} restaurants (${formattedRestaurants.length} before day filtering)`);

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
    const selectedAreaOfferCount = areaFilter && areaFilter !== 'all'
      ? areaOfferCounts[areaFilter] || 0
      : null;

    const response = NextResponse.json({
      success: true,
      restaurants: finalRestaurants,
      selectedAreaOfferCount,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRestaurants: totalFilteredRestaurants,
        hasNextPage: false,
        hasPrevPage: false,
        limit: finalRestaurants.length,
      }
    });
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;

  } catch (error: any) {
    console.error("✗ Error fetching restaurants:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch restaurants",
      error: error.message
    }, { status: 500 });
  }
};

// Helper function to parse meal time range from string like "Morning 7am-12pm"
function parseMealTimeRange(mealTimeStr: string): { start: number; end: number } | null {
  const lowerStr = mealTimeStr.toLowerCase();

  if (lowerStr.includes('morning') || lowerStr.includes('7am-12pm')) {
    return { start: 7, end: 12 };
  } else if (lowerStr.includes('afternoon') || lowerStr.includes('12pm-5pm')) {
    return { start: 12, end: 17 };
  } else if (lowerStr.includes('evening') || lowerStr.includes('5pm-late')) {
    return { start: 17, end: 24 };
  }

  return null;
}

// Helper function to parse validHours from format "HH:MM - HH:MM" (24-hour format)
function parseValidHours(validHours: string): { start: number; end: number } | null {
  try {
    // Expected format: "01:00 - 03:00" or "14:00 - 18:00"
    const parts = validHours.split('-').map(p => p.trim());
    if (parts.length !== 2) return null;

    const startHour = parseInt(parts[0].split(':')[0], 10);
    const endHour = parseInt(parts[1].split(':')[0], 10);

    if (isNaN(startHour) || isNaN(endHour)) return null;

    // Handle cases where end time is smaller than start (crosses midnight)
    if (endHour < startHour) {
      // For now, treat as continuing past midnight
      return { start: startHour, end: endHour + 24 };
    }

    return { start: startHour, end: endHour };
  } catch (e) {
    return null;
  }
}

// Helper function to check if two time ranges overlap
function timeRangesOverlap(
  range1: { start: number; end: number },
  range2: { start: number; end: number }
): boolean {
  // Check if ranges overlap
  // Overlap occurs if one range starts before the other ends
  return range1.start < range2.end && range2.start < range1.end;
}

// Helper function to sort offers by pinning status
function sortOffersByPinning(offers: any[]): any[] {
  // Separate pinned and non-pinned offers
  const pinnedOffers: any[] = [];
  const nonPinnedOffers: any[] = [];

  offers.forEach(offer => {
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
