import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";
import Redemption from "@/models/Redemption";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
import dotenv from "dotenv";
import { Wallet } from "@/models/Wallet";
import mongoose from "mongoose";

dotenv.config();
export async function GET() {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    let restaurantId: string;
    let userId: string;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        restaurantId: string;
        role: string;
        userId: string;
      };

      if (decoded.role !== "restaurant") {
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant" },
          { status: 403 }
        );
      }

      restaurantId = decoded.restaurantId;
      userId = decoded.userId; // Use userId from the token

      if (!restaurantId) {
        return NextResponse.json(
          { message: "Restaurant ID not found in token" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    // Get active offers count (excluding expired)
    const currentDate = new Date();
    const activeOffers = await Offer.countDocuments({
      restaurantId: restaurantId,
      status: "active",
    });

    // Get total redemptions
    const totalRedemptions = await Wallet.countDocuments({
      offerRestaurantId: userId,
      offerStatus: "redeemed",
    });

    // Get monthly redemptions (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRedemptions = await Wallet.countDocuments({
      offerRestaurantId: userId,
      offerStatus: "redeemed",
      updatedAt: { $gte: startOfMonth },
    });


    const recentActivity = await Wallet.aggregate([
      {
        $match: {
          offerRestaurantId: new mongoose.Types.ObjectId(userId),
          offerStatus: "redeemed", 
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort by most recent
      },
      {
        $limit: 5, // Limit to the last 5 redemptions
      },
      {
        $lookup: {
          from: "offers", // Join with the Offer collection
          localField: "offerId",
          foreignField: "_id",
          as: "offerDetails",
        },
      },
      {
        $lookup: {
          from: "users", // Join with the User collection
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$offerDetails", // Unwind the offerDetails array
      },
      {
        $unwind: "$userDetails", // Unwind the userDetails array
      },
      {
        $project: {
          _id: 1,
          redeemCode: 1,
          offerTitle: "$offerDetails.title",
          offerStatus: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$offerDetails.expiryDate", false] },
                  { $lt: ["$offerDetails.expiryDate", new Date()] }
                ]
              },
              {
                $concat: [
                  { $toUpper: { $substr: ["expired", 0, 1] } },
                  { $substr: ["expired", 1, { $subtract: [{ $strLenCP: "expired" }, 1] }] }
                ]
              },
              {
                $concat: [
                  { $toUpper: { $substr: ["$offerDetails.status", 0, 1] } },
                  { $substr: ["$offerDetails.status", 1, { $subtract: [{ $strLenCP: "$offerDetails.status" }, 1] }] }
                ]
              }
            ]
          },          
          userName: {
            $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"]
          },
          userEmail: "$userDetails.email",
          redeemedAt: "$createdAt"
        }
      },
    ]);
    console.log(recentActivity , "sssssssssssssss")

    // Format recent activity
    const formattedActivity = recentActivity.map((redemption: any) => ({
      id: redemption._id.toString(),
      redeemCode: redemption.redeemCode,
      offerTitle: redemption.offerTitle || "Unknown Offer",
      offerStatus: redemption.offerStatus,
      userName: redemption.userName,
      userEmail: redemption.userEmail,
      redeemedAt: redemption.redeemedAt,
    }));

    return NextResponse.json({
      activeOffers,
      totalRedemptions,
      monthlyRedemptions,
      recentActivity: formattedActivity,
    });
  } catch (error: any) {
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard data", error: error.message },
      { status: 500 }
    );
  }
}