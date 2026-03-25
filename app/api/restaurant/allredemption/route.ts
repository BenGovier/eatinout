import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";

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

    // Get active offers count
    const activeOffers = await Offer.countDocuments({
      associatedId: userId,
      status: "active",
      $or: [
        { expiryDate: { $gt: new Date() } },
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: "" },
      ],
    });

    // Get total redemptions
    const totalRedemptions = await Wallet.aggregate([
      {
        $match: {
          offerRestaurantId: userId,
          offerStatus: "redeemed"
        }
      },
      {
        $lookup: {
          from: "offers",
          localField: "offerId",
          foreignField: "_id",
          as: "offerDetails"
        }
      },
      {
        $match: {
          "offerDetails": { $ne: [] } // Ensures offer exists in offers collection
        }
      },
      {
        $count: "total"
      }
    ]).then(result => result[0]?.total || 0);

    // Get monthly redemptions (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRedemptions = await Wallet.countDocuments({
      offerRestaurantId: userId,
      offerStatus: "redeemed",
      updatedAt: { $gte: startOfMonth },
    });

    // Get recent activity (last 5 redemptions)
    const recentActivity = await Wallet.aggregate([
      {
        $match: {
          offerRestaurantId: new mongoose.Types.ObjectId(userId),
          offerStatus: "redeemed", // Filter for redeemed offers
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort by most recent
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
      { $addFields: { now: new Date() } }, // <-- Add this line
      {
        $project: {
          _id: 1,
          redeemCode: 1,
          offerTitle: "$offerDetails.title",
          offerStatus: {
            $cond: [
              { $or: [
                { $eq: ["$offerDetails.expiryDate", null] },
                { $eq: ["$offerDetails.expiryDate", ""] },
                { $not: ["$offerDetails.expiryDate"] }
              ] },
              "Active",
              {
                $cond: [
                  { $gt: ["$offerDetails.expiryDate", "$now"] },
                  "Active",
                  "Expired"
                ]
              }
            ]
          },
          userName: {
            $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"]
          },
          userEmail: "$userDetails.email",
          redeemedAt: "$createdAt",
          redeemStatus: "$redeemStatus" ,
          redeemCodeExpiry: "$redeemCodeExpiry",
          offerRestaurantId: "$offerRestaurantId",
        },
      },
    ]);

    // Format recent activity
    const formattedActivity = recentActivity.map((redemption: any) => ({
      id: redemption._id.toString(),
      redeemCode: redemption.redeemCode,
      offerTitle: redemption.offerTitle || "Unknown Offer",
      offerStatus: redemption.offerStatus,
      userName: redemption.userName,
      userEmail: redemption.userEmail,
      redeemedAt: redemption.redeemedAt,
      redeemStatus : redemption.redeemStatus,
      redeemCodeExpiry: redemption.redeemCodeExpiry,
      offerRestaurantId: redemption.offerRestaurantId,
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