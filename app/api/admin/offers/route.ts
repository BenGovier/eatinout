import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";
import Restaurant from "@/models/Restaurant";
import { verifyAdminToken } from "@/lib/auth-admin";
import Area from "@/models/Area";
import { Category } from "@/models/Categories";

// GET active offers with restaurant information
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get query parameters for pagination
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    // Find active offers
    const existingRestaurantIds = await Restaurant.find().distinct('_id')

    // Only include offers that are active and not expired, or have no expiryDate (unlimited)
    const now = new Date();
    const activeOffers = await Offer.find({
      status: "active",
      restaurantId: { $in: existingRestaurantIds },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Get restaurant details for each offer
    const offersWithDetails = await Promise.all(
      activeOffers.map(async (offer) => {
        const restaurant = await Restaurant.findById(offer.restaurantId);

        if (!restaurant) {
          return null;
        }

        // Get area details
        const areas = await Area.find({
          _id: { $in: restaurant.area },
        });

        // Get category details
        let categoryData = null;
        if (Array.isArray(restaurant.category)) {
          // If category is an array of IDs, fetch all
          const categories = await Category.find({ _id: { $in: restaurant.category } });
          categoryData = categories.map((cat: any) => ({
            _id: cat?._id || null,
            name: cat?.name || null
          }));
        } else {
          // If category is a single string ID
          const category = await Category.findById(restaurant.category);
          categoryData = category
            ? { _id: category._id, name: category.name }
            : { _id: null, name: null };
        }

        return {
          _id: offer._id,
          title: offer.title,
          description: offer.description,
          validDays: offer.validDays,
          validHours: offer.validHours,
          expiryDate: offer.expiryDate,
          terms: offer.terms,
          isActive: offer.status === "active",
          createdAt: offer.createdAt,
          updatedAt: offer.updatedAt,
          restaurant: {
            _id: restaurant._id,
            name: restaurant.name,
            area: areas,
            cuisine: restaurant.cuisine,
            image: restaurant.images?.length > 0 ? restaurant.images[0] : null,
            category: categoryData
          },
        };
      })
    );

    // Filter out null values (offers with no restaurant)
    const validOffers = offersWithDetails.filter((offer) => offer !== null);

    // Get total count
    const totalOffers = await Offer.countDocuments({
      status: "active",
      restaurantId: { $in: existingRestaurantIds },
    });

    return NextResponse.json({
      success: true,
      offers: validOffers,
      pagination: {
        total: totalOffers,
        page,
        limit,
        pages: Math.ceil(totalOffers / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching active offers:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch active offers",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
