import { NextRequest, NextResponse } from "next/server";
import { Category } from "@/models/Categories";
import connectToDatabase from "@/lib/mongodb";

/**
 * PERFORMANCE OPTIMIZATIONS APPLIED:
 * 1. Server-side filtering of categories with 0 offers (reduces data transfer)
 * 2. Aggregation pipeline optimization with early filtering
 * 3. Caching headers (5 minutes cache, 10 minutes stale-while-revalidate)
 * 4. Request deduplication on frontend
 * 
 * RECOMMENDED DATABASE INDEXES (add via MongoDB):
 * - Category: { name: 1 }
 * - Restaurant: { category: 1, status: 1 }
 * - Offer: { restaurantId: 1, status: 1 }
 */

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    await connectToDatabase();

    // Check if we need to return all categories (for offer forms)
    const { searchParams } = new URL(req.url);
    const returnAll = searchParams.get('all') === 'true';

    // If returning all categories, use a simpler query
    if (returnAll) {
      const categories = await Category.find({ isActive: true })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      const response = NextResponse.json({ success: true, categories });
      // No caching for all categories to ensure fresh data
      response.headers.set('Cache-Control', 'no-cache');
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

      return response;
    }

    const today = new Date();

    // Optimized aggregation pipeline - filter out categories with 0 offers early
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "restaurants",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $and: [{ $isArray: "$category" }, { $in: ["$$categoryId", "$category"] }] },
                    { $and: [{ $not: { $isArray: "$category" } }, { $eq: ["$category", "$$categoryId"] }] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                name: 1
              }
            }
          ],
          as: "restaurants",
        },
      },
      {
        $lookup: {
          from: "offers",
          let: { restaurantIds: "$restaurants._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$restaurantId", "$$restaurantIds"] },
                    { $eq: ["$status", "active"] },
                    // { $gte: ["$expiryDate", today] },
                  ],
                },
              },
            },
          ],
          as: "offers",
        },
      },
      {
        $addFields: {
          restaurantCount: { $size: "$restaurants" },
          offersCount: { $size: "$offers" }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          priority: 1,
          restaurantCount: 1,
          offersCount: 1,
          isGlobal: 1,
        },
      },
      {
        $sort: { priority: 1, name: 1 },
      },
      // Filter out categories with 0 offers on the server side for better performance
      {
        $match: {
          offersCount: { $gt: 0 }
        }
      }
    ]);

    const response = NextResponse.json({ success: true, categories });

    // Reduced cache time to ensure priority changes are reflected quickly
    // Cache for 30 seconds, stale-while-revalidate for 60 seconds
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=60');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=60');
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

    return response;
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
