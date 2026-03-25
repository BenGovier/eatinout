import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";
import { Category } from "@/models/Categories";
import Area from "@/models/Area";
import Offer from "@/models/Offer";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch all restaurants for this user
    const restaurants = await Restaurant.find({
      $or: [{ associatedId: decodedToken.userId }, { userId: decodedToken.userId }]
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Collect all unique IDs for batch fetching
    const allCategoryIds = new Set<string>();
    const allUserIds = new Set<string>();
    const allAreaIds = new Set<string>();
    const restaurantIds = restaurants.map(r => r._id);

    restaurants.forEach((restaurant: any) => {
      // Collect category IDs
      if (Array.isArray(restaurant.category)) {
        restaurant.category.forEach((catId: any) => {
          if (catId) allCategoryIds.add(catId.toString());
        });
      } else if (restaurant.category) {
        allCategoryIds.add(restaurant.category.toString());
      }

      // Collect user IDs for owner names
      if (restaurant.userId) {
        allUserIds.add(restaurant.userId.toString());
      }

      // Collect area IDs
      if (restaurant.area) {
        const areaIds = Array.isArray(restaurant.area) ? restaurant.area : [restaurant.area];
        areaIds.forEach((areaId: any) => {
          if (areaId) {
            const id = typeof areaId === 'string' ? areaId : (areaId._id || areaId);
            if (id) allAreaIds.add(id.toString());
          }
        });
      }
    });

    // Batch fetch all related data in parallel
    const [categoriesData, usersData, areasData, offerCounts] = await Promise.all([
      allCategoryIds.size > 0 
        ? Category.find({ _id: { $in: Array.from(allCategoryIds) } }).select("_id name").lean()
        : [],
      allUserIds.size > 0
        ? User.find({ _id: { $in: Array.from(allUserIds) } }).select("_id firstName lastName").lean()
        : [],
      allAreaIds.size > 0
        ? Area.find({ _id: { $in: Array.from(allAreaIds) } }).select("_id name").lean()
        : [],
      Offer.aggregate([
        {
          $match: {
            restaurantId: { $in: restaurantIds },
            status: { $in: ["active", "pending"] }
          }
        },
        {
          $group: {
            _id: "$restaurantId",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Create lookup maps
    const categoryMap = new Map(categoriesData.map((cat: any) => [cat._id.toString(), cat.name]));
    const userMap = new Map(usersData.map((user: any) => [
      user._id.toString(), 
      `${user.firstName || ''} ${user.lastName || ''}`.trim()
    ]));
    const areaMap = new Map(areasData.map((area: any) => [area._id.toString(), area.name]));
    const offerCountMap = new Map(offerCounts.map((item: any) => [item._id.toString(), item.count]));

    // Format restaurants with all related data
    const formattedRestaurants = restaurants.map((restaurant: any) => {
      const restaurantIdStr = restaurant._id.toString();

      // Get categories with names
      const categories: { id: any; name: string }[] = [];
      if (Array.isArray(restaurant.category)) {
        restaurant.category.forEach((catId: any) => {
          const categoryName = categoryMap.get(catId?.toString());
          if (categoryName) {
            categories.push({ id: catId, name: categoryName });
          }
        });
      } else if (restaurant.category) {
        const categoryName = categoryMap.get(restaurant.category.toString());
        if (categoryName) {
          categories.push({ id: restaurant.category, name: categoryName });
        }
      }

      // Get owner name
      let ownerName = null;
      if (restaurant.userId) {
        ownerName = userMap.get(restaurant.userId.toString()) || null;
      }

      // Get areas with names
      const areas: { id: string; name: string }[] = [];
      if (restaurant.area) {
        const areaIds = Array.isArray(restaurant.area) ? restaurant.area : [restaurant.area];
        areaIds.forEach((areaId: any) => {
          const id = typeof areaId === 'string' ? areaId : (areaId?._id || areaId);
          if (id) {
            const areaName = areaMap.get(id.toString());
            if (areaName) {
              areas.push({ id: id.toString(), name: areaName });
            }
          }
        });
      }

      return {
        ...restaurant,
        category: categories,
        areas: areas.length > 0 ? areas : null,
        area: areas.length > 0 ? areas : null, // Support both for compatibility
        totalOffersCount: offerCountMap.get(restaurantIdStr) || 0,
        ownerName,
      };
    });

    return NextResponse.json({ data: formattedRestaurants });
  } catch (error: any) {
    console.error("Error exporting restaurants:", error);
    return NextResponse.json(
      { message: "Failed to export restaurants", error: error.message },
      { status: 500 }
    );
  }
}
