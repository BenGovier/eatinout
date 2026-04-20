import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Carousel from "@/models/Carousel";
import Offer from "@/models/Offer";
import { Category } from "@/models/Categories";
import Tag from "@/models/Tag";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

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

    const query: any = { isActive: true };

    if (areaId && areaId !== "all") {
      query.$or = [{ isGlobal: true }, { areaIds: areaId }];
    } else {
      query.isGlobal = true;
    }

    const selectedCategoryIds = categoryId
      ? categoryId.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    /* ---------------- SEARCH CATEGORY + TAG ---------------- */
    let searchCategoryIds: string[] = [];
    let searchTagIds: string[] = [];

    if (search) {
      const [categoriesMatchingSearch, tagsMatchingSearch] =
        await Promise.all([
          Category.find({
            name: { $regex: search, $options: "i" },
          })
            .select("_id")
            .lean(),

          Tag.find({
            name: { $regex: search, $options: "i" },
          })
            .select("_id")
            .lean(),
        ]);

      searchCategoryIds = categoriesMatchingSearch.map((c: any) =>
        c._id.toString()
      );
      searchTagIds = tagsMatchingSearch.map((t: any) =>
        t._id.toString()
      );
    }

    /* ---------------- FETCH CAROUSELS ---------------- */

    const [carousels, total] = await Promise.all([
      Carousel.find(query)
        .sort(
          areaId && areaId !== "all"
            ? { "areaOrders.order": 1, globalOrder: 1 }
            : { globalOrder: 1 }
        )
        .skip(skip)
        .limit(limit)
        .populate({
          path: "restaurants.restaurantId",
          select:
            "name images area cuisine rating dineIn dineOut priceRange category searchTags zipCode city homePin areaPins createdAt",
        })
        .lean(),

      Carousel.countDocuments(query),
    ]);

    /* ---------------- COLLECT RESTAURANT IDS ---------------- */
    const restaurantIds = new Set<string>();

    carousels.forEach((c: any) => {
      c.restaurants?.forEach((r: any) => {
        if (r.restaurantId?._id) {
          restaurantIds.add(r.restaurantId._id.toString());
        }
      });
    });

    /* ---------------- FETCH OFFERS IN SINGLE QUERY ---------------- */
    const offersRaw = await Offer.find({
      restaurantId: { $in: Array.from(restaurantIds) },
    })
      .select(
        "restaurantId title tags startDate expiryDate status deactivated maxRedemptionLimit redeemCount isUnlimited validDays validHours isPinned pinnedAt createdAt"
      )
      .lean();

    /* group offers */
    const offersMap = new Map<string, any[]>();
    const bulkUpdates: any[] = [];

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
          bulkUpdates.push({
            updateOne: {
              filter: { _id: offer._id },
              update: { status: adjustedStatus },
            },
          });
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
    if (bulkUpdates.length > 0) {
      await Offer.bulkWrite(bulkUpdates);
    }

    /* ---------------- FORMAT RESPONSE ---------------- */

    const formattedCarousels = carousels.map((carousel: any) => {
      const preparedRestaurants = carousel.restaurants
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
            restaurantCategoryIds.some((id) =>
              searchCategoryIds.includes(id)
            ) ||
            restaurantTagIds.some((id) =>
              searchTagIds.includes(id)
            );

          if (!matchesSearch) return null;

          if (selectedCategoryIds.length > 0) {
            const hasCategory = restaurantCategoryIds.some((id) =>
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
                startDate: o.startDate,
                expiryDate: o.expiryDate,
                status: o.status,
                totalCodes: o.maxRedemptionLimit,
                codesRedeemed: o.redeemCount,
                isUnlimited: o.isUnlimited,
                expiresAt: o.expiryDate,
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
  const pinned = [];
  const normal = [];

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