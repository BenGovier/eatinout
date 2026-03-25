import { NextRequest, NextResponse } from "next/server";
import Restaurant from "@/models/Restaurant";
import connectToDatabase from "@/lib/mongodb";
import { verifyAdminToken } from "@/lib/auth-admin";
import mongoose from "mongoose";

// GET restaurants for a specific category
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    // if (!adminCheck.success) {
    //   return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    // }

    await connectToDatabase();

    const { id } = await params;
    const categoryIdString = id;

    if (!categoryIdString) {
      return NextResponse.json(
        { success: false, message: "Category ID is required" },
        { status: 400 }
      );
    }

    // Convert string ID to ObjectId for proper comparison
    let categoryId: mongoose.Types.ObjectId;
    try {
      categoryId = new mongoose.Types.ObjectId(categoryIdString);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID format" },
        { status: 400 }
      );
    }

    // Find restaurants that have this category - use same approach as count query
    // Normalize category to array, then check if categoryId is in it
    const restaurants = await Restaurant.aggregate([
      {
        $match: {
          $or: [
            // Case 1: category is an array containing the categoryId
            { category: { $in: [categoryId] } },
            // Case 2: category is a single value matching categoryId
            { category: categoryId }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          category: 1,
          status: 1,
          // Normalize category to array for filtering
          categoryArray: {
            $cond: {
              if: { $isArray: "$category" },
              then: "$category",
              else: ["$category"]
            }
          }
        }
      },
      {
        // Filter to only include restaurants where categoryId is in the categoryArray
        $match: {
          $expr: {
            $in: [categoryId, "$categoryArray"]
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          category: 1,
          status: 1
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      restaurants: restaurants.map((restaurant: any) => ({
        _id: restaurant._id,
        id: restaurant._id.toString(),
        name: restaurant.name,
        category: restaurant.category,
        status: restaurant.status,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Unassign restaurant from category
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    await connectToDatabase();

    const { id } = await params;
    const categoryId = id;
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!categoryId || !restaurantId) {
      return NextResponse.json(
        { success: false, message: "Category ID and Restaurant ID are required" },
        { status: 400 }
      );
    }

    // Find the restaurant
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Remove category from restaurant's category field - handle both array and single string formats
    let updatedCategory: any[];
    if (Array.isArray(restaurant.category)) {
      // Case 1: category is an array - filter out the categoryId
      updatedCategory = restaurant.category.filter(
        (catId: any) => catId.toString() !== categoryId.toString()
      );
    } else if (restaurant.category) {
      // Case 2: category is a single value - if it matches, set to empty array
      if (restaurant.category.toString() === categoryId.toString()) {
        updatedCategory = [];
      } else {
        // Keep the existing single value if it doesn't match
        updatedCategory = [restaurant.category];
      }
    } else {
      // Case 3: category is null/undefined - set to empty array
      updatedCategory = [];
    }

    await Restaurant.findByIdAndUpdate(restaurantId, {
      category: updatedCategory,
    });

    return NextResponse.json({
      success: true,
      message: "Restaurant unassigned from category successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

