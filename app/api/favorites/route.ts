import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Restaurant from "@/models/Restaurant";
import Offer from "@/models/Offer";
import Area from "@/models/Area";
import { Category } from "@/models/Categories";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };
    const userId = decodedToken.userId;

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const favoriteIds = user.favorites.map((id: string | mongoose.Types.ObjectId) =>
      typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
    );

    // ✅ Use correct schema fields
    const restaurants = await Restaurant.find({
      _id: { $in: favoriteIds },
      status: "approved",
    })
      .populate({ path: "category", model: Category, select: "name" })
      .populate({ path: "area", model: Area, select: "name" })
      .lean();

    const restaurantIds = restaurants.map((r: any) => r._id);
    const allOffers = await Offer.find({
      restaurantId: { $in: restaurantIds },
      status: "active",
    })
      .select("restaurantId title startDate expiryDate redeemCount maxRedemptionLimit isUnlimited validDays")
      .lean();

    const offersByRestaurant = new Map<string, any[]>();
    allOffers.forEach((o: any) => {
      const id = o.restaurantId.toString();
      if (!offersByRestaurant.has(id)) offersByRestaurant.set(id, []);
      offersByRestaurant.get(id)!.push(o);
    });

    const restaurantsWithOffers = restaurants.map((restaurant: any) => ({
      ...restaurant,
      offers: offersByRestaurant.get(restaurant._id.toString()) || [],
    }));

    return NextResponse.json({ success: true, restaurants: restaurantsWithOffers });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
