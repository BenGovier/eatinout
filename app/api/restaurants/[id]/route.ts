import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Offer from "@/models/Offer";
import { Category } from "@/models/Categories";
import Area from "@/models/Area";
import mongoose from "mongoose";
import { generateSlug } from "@/lib/utils";

// Add this function at the top of the file, before the GET handler

const weekOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Helper function to check if a string is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    // If not in mock data, try to fetch from database
    try {
      await connectToDatabase();

      // Find restaurant by ID or slug
      let restaurant;
      if (isValidObjectId(id)) {
        // If it's a valid ObjectId, search by ID
        restaurant = await Restaurant.findById(id);
      } else {
        // Slug format: restaurant-name-{last6chars}. Load minimal fields only to avoid memory spike
        const allRestaurants = await Restaurant.find({})
          .select("_id name")
          .limit(1000)
          .lean();
        restaurant = allRestaurants.find((r: any) => {
          const restaurantSlug = generateSlug(r.name, r._id.toString());
          return restaurantSlug === id;
        });
        if (restaurant) {
          restaurant = await Restaurant.findById((restaurant as any)._id);
        }
      }

      if (!restaurant) {
        return NextResponse.json(
          {
            success: false,
            message: "Restaurant not found",
          },
          { status: 404 }
        );
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get restaurant offers
      const allOffersRaw = await Offer.find({
        restaurantId: restaurant._id,
      })
        .select("title description validDays validHours startDate expiryDate status deactivated restaurantId isPinned pinnedAt createdAt terms associatedId bookingRequirement")
        .lean();

      const now = new Date();
      const bulkUpdates: { updateOne: { filter: any; update: any } }[] = [];
      const offers = allOffersRaw.map((offer: any) => {
        let adjustedStatus = offer.status;

        if (!offer.deactivated) {
          const startDate = offer.startDate ? new Date(offer.startDate) : null;
          const expiryDate = offer.expiryDate ? new Date(offer.expiryDate) : null;

          if (startDate && startDate > now) {
            if (offer.status !== "inactive") {
              adjustedStatus = "inactive";
              bulkUpdates.push({
                updateOne: { filter: { _id: offer._id }, update: { $set: { status: "inactive" } } },
              });
            }
          } else if (expiryDate && expiryDate < now) {
            if (offer.status !== "expired") {
              adjustedStatus = "expired";
              bulkUpdates.push({
                updateOne: { filter: { _id: offer._id }, update: { $set: { status: "expired" } } },
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
                updateOne: { filter: { _id: offer._id }, update: { $set: { status: "active" } } },
              });
            }
          } else if (!expiryDate) {
            if (offer.status !== "active") {
              adjustedStatus = "active";
              bulkUpdates.push({
                updateOne: { filter: { _id: offer._id }, update: { $set: { status: "active" } } },
              });
            }
          }
        }

        return { ...offer, status: adjustedStatus };
      });

      if (bulkUpdates.length > 0) {
        await Offer.bulkWrite(bulkUpdates);
      }

      // Only include offers that are currently active
      const activeOffers = offers.filter(offer => offer.status === "active");

      // Sort active offers: pinned first by pinnedAt DESC (most recently pinned first), then unpinned by createdAt descending
      const sortedActiveOffers = activeOffers.sort((a: any, b: any) => {
        // If both are pinned, sort by pinnedAt descending (most recent first)
        if (a.isPinned && b.isPinned) {
          const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
          const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
          return bTime - aTime; // DESC order - most recent first
        }
        // Pinned offers come first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Both unpinned: sort by createdAt descending
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Batch fetch category and area details to avoid N+1
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
        catIds.length > 0 ? Category.find({ _id: { $in: catIds } }).select("name").lean() : [],
        areaIds.length > 0 ? Area.find({ _id: { $in: areaIds } }).select("name").lean() : [],
      ]);

      const catMap = new Map(catDocs.map((c: any) => [c._id.toString(), c.name]));
      const areaMap = new Map(areaDocs.map((a: any) => [a._id.toString(), a.name]));

      const categories = catIds.map((catId: any) => ({
        id: catId,
        name: catMap.get(catId.toString()) ?? "Unknown Category",
      }));
      const areaDetails = areaIds.map((areaId: any) => ({
        id: areaId,
        name: areaMap.get(areaId.toString()) ?? "Unknown Area",
      }));
      // Format the response
      const formattedRestaurant = {
        id: restaurant._id.toString(),
        name: restaurant.name,
        description: restaurant.description,
        cuisine: restaurant.cuisine,
        location: restaurant.city,
        address: `${restaurant.address}, ${restaurant.city},  ${restaurant.zipCode.toUpperCase()}`,
        phone: restaurant.phone,
        website: restaurant.website,
        openingHours: restaurant.openingHours,
        // area: restaurant.area,
        area: areaDetails,
        rating: 4.5, // Default rating for now
        addressLink: restaurant.addressLink,
        priceRange: restaurant.priceRange,
        email: restaurant.email,
        imageUrl:
          restaurant.images && restaurant.images.length > 0
            ? restaurant.images[0]
            : "/placeholder.svg?height=400&width=800",
        galleryImages: restaurant.images || [],
        category: categories,
        offers: sortedActiveOffers.map((offer) => ({
          id: offer._id.toString(),
          restaurantId: restaurant._id.toString(),
          restaurantName: restaurant.name,
          offerTitle: offer.title,
          // validDays: offer.validDays,
          validDays: offer.validDays
            ? offer.validDays
              .split(",")
              .map((day: string) => day.trim()) // <--- explicitly type day
              .sort((a: string, b: string) => weekOrder.indexOf(a) - weekOrder.indexOf(b)) // <--- type a & b
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
        // menuPdfUrl: restaurant.menuPdfUrl || "",
        menuPdfUrls: Array.isArray(restaurant.menuPdfUrls) ? restaurant.menuPdfUrls : [],
      };

      return NextResponse.json({
        success: true,
        restaurant: formattedRestaurant,
      });
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch restaurant from database",
          error: dbError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching restaurant:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurant",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
