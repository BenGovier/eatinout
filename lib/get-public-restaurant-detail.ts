import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Offer from "@/models/Offer";
import { Category } from "@/models/Categories";
import Area from "@/models/Area";
import mongoose from "mongoose";
import { generateSlug } from "@/lib/utils";

const weekOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type PublicRestaurantDetail = {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  location: string;
  address: string;
  phone: string;
  website?: string;
  openingHours?: unknown;
  area: { id: unknown; name: string }[];
  rating: number;
  addressLink?: string;
  priceRange?: string;
  email: string;
  imageUrl: string;
  galleryImages: string[];
  category: { id: unknown; name: string }[];
  offers: Array<{
    id: string;
    restaurantId: string;
    restaurantName: string;
    offerTitle: string;
    validDays: string;
    validHours?: string;
    expiryDate?: unknown;
    imageUrl: string;
    cuisine: string;
    location: string;
    description?: string;
    terms: string;
    associatedId: string;
    bookingRequirement: string;
  }>;
  dineIn: boolean;
  dineOut: boolean;
  deliveryAvailable: boolean;
  menuPdfUrls: string[];
};

export type GetPublicRestaurantDetailResult =
  | { success: true; restaurant: PublicRestaurantDetail }
  | { success: false; status: 404 | 500; message: string; error?: string };

function isValidObjectId(id: string): boolean {
  return (
    mongoose.Types.ObjectId.isValid(id) &&
    new mongoose.Types.ObjectId(id).toString() === id
  );
}

/**
 * Shared loader for `/restaurant/[id]` (ObjectId, generated slug, or stored slug).
 */
export async function getPublicRestaurantDetailByRouteParam(
  routeParam: string,
): Promise<GetPublicRestaurantDetailResult> {
  try {
    await connectToDatabase();

    let restaurant: any = null;
    if (isValidObjectId(routeParam)) {
      restaurant = await Restaurant.findById(routeParam);
    } else {
      restaurant = await Restaurant.findOne({ slug: routeParam }).exec();
      if (!restaurant) {
        const allRestaurants = await Restaurant.find({})
          .select("_id name")
          .limit(1000)
          .lean();
        const match = (allRestaurants as any[]).find((r) => {
          const restaurantSlug = generateSlug(r.name, r._id.toString());
          return restaurantSlug === routeParam;
        });
        if (match) {
          restaurant = await Restaurant.findById(match._id);
        }
      }
    }

    if (!restaurant) {
      return {
        success: false,
        status: 404,
        message: "Restaurant not found",
      };
    }

    const allOffersRaw = await Offer.find({
      restaurantId: restaurant._id,
    })
      .select(
        "title description validDays validHours startDate expiryDate status deactivated restaurantId isPinned pinnedAt createdAt terms associatedId bookingRequirement",
      )
      .lean();

    const now = new Date();
    const bulkUpdates: { updateOne: { filter: any; update: any } }[] = [];
    const offers = allOffersRaw.map((offer: any) => {
      let adjustedStatus = offer.status;

      if (!offer.deactivated) {
        const startDate = offer.startDate ? new Date(offer.startDate) : null;
        const expiryDate = offer.expiryDate
          ? new Date(offer.expiryDate)
          : null;

        if (startDate && startDate > now) {
          if (offer.status !== "inactive") {
            adjustedStatus = "inactive";
            bulkUpdates.push({
              updateOne: {
                filter: { _id: offer._id },
                update: { $set: { status: "inactive" } },
              },
            });
          }
        } else if (expiryDate && expiryDate < now) {
          if (offer.status !== "expired") {
            adjustedStatus = "expired";
            bulkUpdates.push({
              updateOne: {
                filter: { _id: offer._id },
                update: { $set: { status: "expired" } },
              },
            });
          }
        } else if (
          startDate &&
          startDate <= now &&
          (!expiryDate || expiryDate > now)
        ) {
          if (offer.status !== "active") {
            adjustedStatus = "active";
            bulkUpdates.push({
              updateOne: {
                filter: { _id: offer._id },
                update: { $set: { status: "active" } },
              },
            });
          }
        } else if (!expiryDate) {
          if (offer.status !== "active") {
            adjustedStatus = "active";
            bulkUpdates.push({
              updateOne: {
                filter: { _id: offer._id },
                update: { $set: { status: "active" } },
              },
            });
          }
        }
      }

      return { ...offer, status: adjustedStatus };
    });

    if (bulkUpdates.length > 0) {
      await Offer.bulkWrite(bulkUpdates);
    }

    const activeOffers = offers.filter((offer) => offer.status === "active");

    const sortedActiveOffers = activeOffers.sort((a: any, b: any) => {
      if (a.isPinned && b.isPinned) {
        const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bTime - aTime;
      }
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    const catIds = Array.isArray(restaurant.category)
      ? restaurant.category
      : restaurant.category
        ? [restaurant.category]
        : [];
    const areaIds = Array.isArray(restaurant.area)
      ? restaurant.area
      : restaurant.area
        ? [restaurant.area]
        : [];

    const [catDocs, areaDocs] = await Promise.all([
      catIds.length > 0
        ? Category.find({ _id: { $in: catIds } }).select("name").lean()
        : [],
      areaIds.length > 0
        ? Area.find({ _id: { $in: areaIds } }).select("name").lean()
        : [],
    ]);

    const catMap = new Map(catDocs.map((c: any) => [c._id.toString(), c.name]));
    const areaMap = new Map(
      areaDocs.map((a: any) => [a._id.toString(), a.name]),
    );

    const categories = catIds.map((catId: any) => ({
      id: catId,
      name: catMap.get(catId.toString()) ?? "Unknown Category",
    }));
    const areaDetails = areaIds.map((areaId: any) => ({
      id: areaId,
      name: areaMap.get(areaId.toString()) ?? "Unknown Area",
    }));

    const formattedRestaurant: PublicRestaurantDetail = {
      id: restaurant._id.toString(),
      name: restaurant.name,
      description: restaurant.description,
      cuisine: restaurant.cuisine,
      location: restaurant.city,
      address: `${restaurant.address}, ${restaurant.city},  ${restaurant.zipCode.toUpperCase()}`,
      phone: restaurant.phone,
      website: restaurant.website,
      openingHours: restaurant.openingHours,
      area: areaDetails,
      rating: 4.5,
      addressLink: restaurant.addressLink,
      priceRange: restaurant.priceRange,
      email: restaurant.email,
      imageUrl:
        restaurant.images && restaurant.images.length > 0
          ? restaurant.images[0]
          : "/placeholder.svg?height=400&width=800",
      galleryImages: restaurant.images || [],
      category: categories,
      offers: sortedActiveOffers.map((offer: any) => ({
        id: offer._id.toString(),
        restaurantId: restaurant._id.toString(),
        restaurantName: restaurant.name,
        offerTitle: offer.title,
        validDays: offer.validDays
          ? offer.validDays
              .split(",")
              .map((day: string) => day.trim())
              .sort(
                (a: string, b: string) =>
                  weekOrder.indexOf(a) - weekOrder.indexOf(b),
              )
              .join(", ")
          : "",
        validHours: offer.validHours,
        expiryDate: offer.expiryDate,
        imageUrl:
          restaurant.images && restaurant.images.length > 0
            ? restaurant.images[0]
            : "/placeholder.svg?height=400&width=800",
        cuisine: restaurant.cuisine,
        location: `${restaurant.city}, ${restaurant.area}`,
        description: offer.description,
        terms: offer.terms || "",
        associatedId: offer.associatedId || "",
        bookingRequirement: offer.bookingRequirement || "mandatory",
      })),
      dineIn: restaurant.dineIn || false,
      dineOut: restaurant.dineOut || false,
      deliveryAvailable: restaurant.deliveryAvailable || false,
      menuPdfUrls: Array.isArray(restaurant.menuPdfUrls)
        ? restaurant.menuPdfUrls
        : [],
    };

    return { success: true, restaurant: formattedRestaurant };
  } catch (dbError: unknown) {
    console.error("Database error:", dbError);
    const message =
      dbError instanceof Error ? dbError.message : "Database error";
    return {
      success: false,
      status: 500,
      message: "Failed to fetch restaurant from database",
      error: message,
    };
  }
}

/** Paths to pre-render: ObjectId, name-based slug, and stored slug when present. */
export async function getPublicRestaurantBuildTimePathParams(): Promise<
  { id: string }[]
> {
  await connectToDatabase();
  const rows = await Restaurant.find({
    status: "approved",
    hidden: { $ne: true },
  })
    .select("_id name slug")
    .lean();

  const seen = new Set<string>();
  const out: { id: string }[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push({ id: t });
  };

  for (const r of rows as any[]) {
    const idStr = r._id.toString();
    push(idStr);
    push(generateSlug(r.name, idStr));
    const slug = typeof r.slug === "string" ? r.slug.trim() : "";
    if (slug) push(slug);
  }

  return out;
}
