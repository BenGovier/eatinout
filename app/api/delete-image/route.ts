import { NextResponse } from "next/server";
import Restaurant from "@/models/Restaurant";
import connectToDatabase from "@/lib/mongodb";
import dotenv from "dotenv";
dotenv.config();

console.log("DELETE IMAGE API HIT");

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();

    const { restaurantId, imageIndex } = await req.json();

    if (!restaurantId || imageIndex === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing restaurantId or imageIndex" },
        { status: 400 }
      );
    }

    // 1. Find restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // 2. Validate imageIndex
    if (imageIndex < 0 || imageIndex >= restaurant.images.length) {
      return NextResponse.json({
        success: true,
        message: "Image already removed or not present in DB",
        images: restaurant.images,
      });
    }

    // 3. Remove image from array
    restaurant.images.splice(imageIndex, 1);

    // 4. Save updated restaurant
    await restaurant.save();

    return NextResponse.json({
      success: true,
      message: "Image removed from database successfully",
      images: restaurant.images, // send updated array back
    });
  } catch (error: any) {
    console.error("Error removing image:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
