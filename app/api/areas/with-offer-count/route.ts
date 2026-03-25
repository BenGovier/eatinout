import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Area from "@/models/Area";

export async function GET() {
  try {
    await connectToDatabase();

    const today = new Date();

    const areas = await Area.aggregate([
      {
        $match: { isActive: true, hideRestaurant: false }
      },

      // Restaurants lookup (ONLY _id for performance)
      {
        $lookup: {
          from: "restaurants",
          let: { areaId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$area", "$$areaId"] },
                    { $in: ["$$areaId", "$area"] }
                  ]
                }
              }
            },
            {
              $project: { _id: 1 } // 🚀 Only required field
            }
          ],
          as: "restaurants"
        }
      },

      // Offers lookup (ONLY _id for count)
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
                    { $eq: ["$deactivated", false] },
                    {
                      $or: [
                        { $eq: ["$expiryDate", null] },
                        { $gte: ["$expiryDate", today] }
                      ]
                    }
                  ]
                }
              }
            },
            {
              $project: { _id: 1 } // 🚀 Only needed for count
            }
          ],
          as: "offers"
        }
      },

      // Final response (FORMAT SAME)
      {
        $project: {
          id: { $toString: "$_id" },
          name: 1,
          offers: { $size: "$offers" }
        }
      }
    ]);

    return NextResponse.json(
      { success: true, areas },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );

  } catch (error: any) {
    console.error("Area API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}