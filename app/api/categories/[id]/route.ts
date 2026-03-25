import { NextRequest, NextResponse } from "next/server";
import { Category } from "@/models/Categories";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Offer from "@/models/Offer";
import Area from "@/models/Area";

/**
 * PERFORMANCE OPTIMIZATIONS APPLIED:
 * 1. Optimized aggregation pipeline with better filtering
 * 2. Using lean() for faster queries where possible
 * 3. Caching headers (5 minutes cache, 10 minutes stale-while-revalidate)
 * 4. Request deduplication on frontend
 * 
 * RECOMMENDED DATABASE INDEXES:
 * - Category: { name: 1 }
 * - Restaurant: { category: 1, status: 1 }
 * - Offer: { restaurantId: 1, status: 1 }
 * - Area: { hideRestaurant: 1 }
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    await connectToDatabase();

    const rawId = params.id;
    const decodedCategory = decodeURIComponent(rawId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Get the matching category by name - use lean() for better performance
    const categoryDoc = await Category.findOne({ name: decodedCategory }).lean();
    if (!categoryDoc) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    const categoryId = categoryDoc._id;

    // Step 2: Aggregate restaurants with category and area filter
    const restaurants = await Category.aggregate([
      { $match: { _id: categoryId } },

      {
        $lookup: {
          from: "restaurants",
          localField: "_id",
          foreignField: "category", // handles array of category IDs
          as: "restaurants",
        },
      },
      { $unwind: "$restaurants" },

      // Filter approved restaurants
      { $match: { "restaurants.status": "approved" } },

      // Lookup areas to check if any of them has hideRestaurant: true
   // Lookup areas to see if any assigned area has hideRestaurant: true
{
  $lookup: {
    from: "areas",
    let: { areaIds: "$restaurants.area" },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$hideRestaurant", true] },
              {
                $in: [
                  { $toString: "$_id" },
                  {
                    $cond: [
                      { $isArray: "$$areaIds" },
                      "$$areaIds",
                      { $cond: [{ $eq: ["$$areaIds", null] }, [], ["$$areaIds"]] }
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    ],
    as: "hiddenAreas",
  },
}
,
      // Filter out restaurants that have any hidden area
      {
        $match: {
          $expr: {
            $eq: [{ $size: "$hiddenAreas" }, 0],
          },
        },
      },

      // Lookup offers
      {
        $lookup: {
          from: "offers",
          localField: "restaurants._id",
          foreignField: "restaurantId",
          as: "offers",
        },
      },

      // Lookup categories for the restaurant (to get category names)
      {
        $lookup: {
          from: "categories",
          localField: "restaurants.category",
          foreignField: "_id",
          as: "restaurantCategories",
        },
      },

      // Add filtered offers and combined category names to each restaurant
      {
        $addFields: {
          "restaurants.offers": {
            $filter: {
              input: "$offers",
              as: "offer",
              cond: {
                $and: [
                  { $eq: ["$$offer.restaurantId", "$restaurants._id"] },
                  { $eq: ["$$offer.status", "active"] },
                  // { $gte: ["$$offer.expiryDate", today] },
                ],
              },
            },
          },
          "restaurants.categoryName": {
            $reduce: {
              input: "$restaurantCategories",
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this.name",
                  { $concat: ["$$value", ", ", "$$this.name"] },
                ],
              },
            },
          },
        },
      },

      {
        $group: {
          _id: null,
          restaurants: { $push: "$restaurants" },
        },
      },
      {
        $project: {
          _id: 0,
          restaurants: 1,
        },
      },
    ]);

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No restaurants found for this category",
        },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      restaurants: restaurants[0].restaurants,
    });

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

    return response;
  } catch (error: any) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
