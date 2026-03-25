import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ message: "Restaurant ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const existingOfferCount = await Offer.countDocuments({ restaurantId });

    return NextResponse.json({
      success: true,
      hasExistingOffers: existingOfferCount > 0,
    });
  } catch (error: any) {
    console.error("Check existing offers error:", error);
    return NextResponse.json(
      { message: "Failed to check existing offers", error: error.message },
      { status: 500 }
    );
  }
}
