import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const { restaurantId, userId } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return NextResponse.json({ success: false, message: "Invalid restaurant id" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const isAlreadyLiked = user.favorites.includes(restaurantId);

    if (isAlreadyLiked) {
      // UNLIKE
      await User.findByIdAndUpdate(userId, {
        $pull: { favorites: restaurantId },
      });
    } else {
      // LIKE
      await User.findByIdAndUpdate(userId, {
        $addToSet: { favorites: restaurantId },
      });
    }

    return NextResponse.json({
      success: true,
      liked: !isAlreadyLiked,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}