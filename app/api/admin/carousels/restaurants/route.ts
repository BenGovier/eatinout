import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";

export async function GET() {
  try {
    await connectToDatabase();

    const restaurants = await Restaurant.find({ 
      status: "approved",
      hidden: { $ne: true }
    })
    .select("name images")
    .sort({ name: 1 })
    .limit(1000)
    .lean();

    return NextResponse.json({
      success: true,
      restaurants,
    });
  } catch (error: any) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurants",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
