import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Offer from "@/models/Offer";
import { Category } from "@/models/Categories";
import Area from "@/models/Area";
import Tag from "@/models/Tag";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const areaFilter = searchParams.get('area');
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const priceRange = searchParams.get('priceRange');
    const dineIn = searchParams.get('dineIn') === 'true';
    const dineOut = searchParams.get('dineOut') === 'true';
    const days = searchParams.get('days');
    const mealTimes = searchParams.get('mealTimes');

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

    // Cap in-memory load to prevent production memory spikes (Azure 4GB limit)
    const MAX_IN_MEMORY = 500;
    const restaurants = await Restaurant.find(query)
      .select('name cuisine address city state zipCode lat lng area category images dineIn dineOut priceRange openingHours deliveryAvailable addressLink homePin areaPins createdAt')
      .sort({ createdAt: -1 })
      .limit(MAX_IN_MEMORY)
      .lean();

    const totalRestaurants = restaurants.length;

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

    // Remove validDays from all restaurants
    const cleanedRestaurants = finalFormattedRestaurants.map(({ validDays, ...rest }: any) => rest);

    // Sort ALL restaurants by pinning status BEFORE pagination
    const sortedRestaurants = sortRestaurantsByPinning(cleanedRestaurants, areaFilter);

    // Calculate pagination after sorting
    const totalFilteredRestaurants = sortedRestaurants.length;
    const totalPages = Math.ceil(totalFilteredRestaurants / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const skip = (page - 1) * limit;

    // Apply pagination to sorted results
    const paginatedRestaurants = sortedRestaurants.slice(skip, skip + limit);

    // Remove pinning fields from final response (internal use only)
    const finalRestaurants = paginatedRestaurants.map(
      ({ homePin, areaPins, createdAt, ...rest }) => rest
    );

    console.log(`✓ Returning ${finalRestaurants.length} restaurants (page ${page}/${totalPages}) with active offers. Total: ${totalFilteredRestaurants} restaurants (${formattedRestaurants.length} before day filtering)`);

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
      pagination: { currentPage: page, totalPages, totalRestaurants: totalFilteredRestaurants, hasNextPage, hasPrevPage, limit }
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

// Helper function to sort restaurants by pinning status
function sortRestaurantsByPinning(
  restaurants: any[],
  areaFilter: string | null
): any[] {
  const homePinned: any[] = []
  const areaPinned: any[] = []
  const areaMatchedNonPinned: any[] = []
  const regular: any[] = []

  restaurants.forEach((restaurant) => {

    /* ===============================
       🟢 CASE 1: AREA FILTER APPLIED
       =============================== */
    if (areaFilter) {
      // 1️⃣ AREA PINNED
      const areaPin = Array.isArray(restaurant.areaPins)
        ? restaurant.areaPins.find(
          (p: any) =>
            p.areaId === areaFilter && p.priority !== null
        )
        : null

      if (areaPin) {
        areaPinned.push(restaurant)
        return
      }

      // 2️⃣ AREA MATCHED BUT NOT PINNED
      if (
        Array.isArray(restaurant.area) &&
        restaurant.area.map(String).includes(areaFilter)
      ) {
        areaMatchedNonPinned.push(restaurant)
        return
      }

      // 3️⃣ REGULAR
      regular.push(restaurant)
      return
    }

    /* ===============================
       🟢 CASE 2: NO AREA FILTER
       (HOME PAGE LOGIC – UNCHANGED)
       =============================== */
    const homePin = restaurant.homePin || {}

    if (homePin.isPinned === true && homePin.priority !== null) {
      homePinned.push(restaurant)
      return
    }

    regular.push(restaurant)
  })

  /* ===============================
     🔽 SORTING
     =============================== */

  // 🔵 AREA PIN SORT (TOP PRIORITY WHEN AREA FILTER)
  areaPinned.sort((a, b) => {
    const pinA = a.areaPins.find((p: any) => p.areaId === areaFilter)
    const pinB = b.areaPins.find((p: any) => p.areaId === areaFilter)

    const prioA = pinA?.priority ?? 999
    const prioB = pinB?.priority ?? 999
    if (prioA !== prioB) return prioA - prioB

    const dateA = pinA?.pinnedAt
      ? new Date(pinA.pinnedAt).getTime()
      : 0
    const dateB = pinB?.pinnedAt
      ? new Date(pinB.pinnedAt).getTime()
      : 0

    return dateB - dateA
  })

  // 🔵 AREA MATCH (NON PINNED)
  areaMatchedNonPinned.sort((a, b) => {
    const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dB - dA
  })

  // 🔵 HOME PIN (ONLY WHEN NO AREA FILTER)
  homePinned.sort((a, b) => {
    const pA = a.homePin?.priority ?? 999
    const pB = b.homePin?.priority ?? 999
    if (pA !== pB) return pA - pB

    const dA = a.homePin?.pinnedAt
      ? new Date(a.homePin.pinnedAt).getTime()
      : 0
    const dB = b.homePin?.pinnedAt
      ? new Date(b.homePin.pinnedAt).getTime()
      : 0

    return dB - dA
  })

  // 🔵 REGULAR
  regular.sort((a, b) => {
    const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dB - dA
  })

  console.log(
    `📌 SORT → area:${areaPinned.length}, areaMatch:${areaMatchedNonPinned.length}, home:${homePinned.length}, regular:${regular.length}`
  )

  /* ===============================
     🔚 FINAL RETURN ORDER
     =============================== */
  return areaFilter
    ? [
      ...areaPinned,
      ...areaMatchedNonPinned,
      ...regular,
    ]
    : [
      ...homePinned,
      ...regular,
    ]
}
