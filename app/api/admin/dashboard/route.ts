import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import User from "@/models/User"
import Restaurant from "@/models/Restaurant"
import Offer from "@/models/Offer"
import Area from "@/models/Area"
import { verifyAdminToken } from "@/lib/auth-admin"

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    await connectToDatabase()

    // Get counts from database
    const userCount = await User.countDocuments({ role: "user" })
    const restaurantCount = await Restaurant.countDocuments()
    
    // Get all existing restaurant IDs
    const existingRestaurantIds = await Restaurant.find().distinct('_id')
    
    // Count only active offers that have a restaurantId matching an existing restaurant
    const activeOffersCount = await Offer.countDocuments({ 
      status: "active",
      restaurantId: { $in: existingRestaurantIds }
    })
    
    const areasCount = await Area.countDocuments({ isActive: true })

    // Get recent signups (last 7 days)
    const recentSignups = await User.find({ role: "user" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName email createdAt _id")
      .lean()

    // Get new restaurants (last 7 days)
    const newRestaurants = await Restaurant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'area',
        select: 'name'
      })
      .select("name area createdAt _id")
      .lean()

    return NextResponse.json({
      success: true,
      stats: {
        userCount,
        restaurantCount,
        activeOffersCount,
        areasCount,
        recentSignups,
        newRestaurants,
      }
    })
  } catch (error: unknown) {
    console.error("Error fetching dashboard stats:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch dashboard statistics",
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
