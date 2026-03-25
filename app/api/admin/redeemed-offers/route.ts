import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import { verifyAdminToken } from "@/lib/auth-admin"

// Import models in order to ensure they're registered
import User from "@/models/User"
import Offer from "@/models/Offer"
import Restaurant from "@/models/Restaurant"
import { Wallet } from "@/models/Wallet"

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    await connectToDatabase()

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const isExport = searchParams.get('export') === 'true'

    // Dynamic filtering parameters
    const searchTerm = searchParams.get('search') || ''
    const expiredFilter = searchParams.get('expired') || 'all'

    // Build dynamic query - only fetch redeemed offers (matching restaurant API)
    const query: any = { 
      offerStatus: "redeemed",
      // redeemStatus: true 
    }

    // Fetch ALL wallet entries first (we'll filter and paginate after)
    const walletEntries = await Wallet.find(query)
      .sort({ createdAt: -1 }) // Sort by createdAt to match restaurant API
      .lean()

    // Manually fetch related data
    const userIds = [...new Set(walletEntries.map((w: any) => w.userId?.toString()).filter(Boolean))]
    const offerIds = [...new Set(walletEntries.map((w: any) => w.offerId?.toString()).filter(Boolean))]

    // First fetch users and offers
    const [users, offers] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select('firstName lastName email phone').lean(),
      Offer.find({ _id: { $in: offerIds } }).select('title code associatedId').lean()
    ])

    // Get unique associatedIds from offers to fetch restaurants
    const associatedIds = [...new Set(offers.map((o: any) => o.associatedId).filter(Boolean))]
    
    // Also get unique offerRestaurantIds from wallet entries (could be userId or ObjectId)
    // Convert both ObjectId and string formats to string
    const offerRestaurantIds = [...new Set(
      walletEntries.map((w: any) => {
        if (!w.offerRestaurantId) return null
        return typeof w.offerRestaurantId === 'object' 
          ? w.offerRestaurantId.toString() 
          : w.offerRestaurantId
      }).filter(Boolean)
    )]

    // Fetch restaurants using both associatedId AND userId
    const restaurants = await Restaurant.find({ 
      $or: [
        { associatedId: { $in: [...associatedIds, ...offerRestaurantIds] } },
        { userId: { $in: offerRestaurantIds } }
      ]
    })
      .select('name email phone address associatedId userId')
      .lean()

    // Create lookup maps
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]))
    const offerMap = new Map(offers.map((o: any) => [o._id.toString(), o]))
    
    // Map restaurants by BOTH associatedId and userId for flexible lookup
    // Handle both string and ObjectId formats
    const restaurantMap = new Map()
    restaurants.forEach((r: any) => {
      if (r.associatedId) {
        restaurantMap.set(r.associatedId, r)
        restaurantMap.set(r.associatedId.toString(), r)
      }
      if (r.userId) {
        restaurantMap.set(r.userId.toString(), r)
      }
      // Also map by _id for direct lookups
      restaurantMap.set(r._id.toString(), r)
    })

    // Format the data using the manually fetched related data
    const formattedRedemptions = walletEntries
      .map((entry: any) => {
        // Check if code is expired
        const currentTime = Date.now()
        const isExpired = entry.redeemCodeExpiry 
          ? currentTime > entry.redeemCodeExpiry 
          : false
        // Get related data from maps
        const user = userMap.get(entry.userId?.toString())
        const offer = offerMap.get(entry.offerId?.toString())
        
        // Skip entries without valid user data
        if (!user || !entry.userId) {
          return null
        }
        
        // Get restaurant - try multiple lookup strategies (handle both ObjectId and string)
        let restaurant = null
        
        // Strategy 1: Try offer's associatedId
        if (offer?.associatedId) {
          restaurant = restaurantMap.get(offer.associatedId) || restaurantMap.get(offer.associatedId.toString())
        }
        
        // Strategy 2: Try wallet's offerRestaurantId (could be ObjectId or string)
        if (!restaurant && entry.offerRestaurantId) {
          const restaurantIdStr = typeof entry.offerRestaurantId === 'object' 
            ? entry.offerRestaurantId.toString() 
            : entry.offerRestaurantId
          restaurant = restaurantMap.get(restaurantIdStr)
        }

        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
        
        // Skip if username is empty after trimming
        if (!userName) {
          return null
        }

        return {
          _id: entry._id,
          userName,
          userEmail: user?.email || 'N/A',
          userPhone: user?.phone || 'N/A',
          userId: entry.userId,
          offerTitle: offer?.title || 'N/A',
          offerCode: entry.redeemCode || offer?.code || 'N/A',
          offerId: entry.offerId,
          restaurantName: restaurant?.name || 'N/A',
          restaurantEmail: restaurant?.email || 'N/A',
          restaurantPhone: restaurant?.phone || 'N/A',
          restaurantAddress: restaurant?.address || 'N/A',
          restaurantId: offer?.associatedId || entry.offerRestaurantId,
          offerStatus: entry.offerStatus || 'N/A',
          redeemStatus: entry.redeemStatus,
          isExpired,
          redeemedAt: entry.updatedAt, // When the offer was redeemed
          createdAt: entry.createdAt, // When added to wallet
          expiryTime: entry.redeemCodeExpiry,
        }
      })
      .filter((item: any) => item !== null) // Remove null entries (invalid users)

    // Apply search filter
    let filteredRedemptions = formattedRedemptions
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filteredRedemptions = formattedRedemptions.filter((item: any) => 
        item.userName.toLowerCase().includes(searchLower) ||
        item.userEmail.toLowerCase().includes(searchLower) ||
        item.offerCode.toLowerCase().includes(searchLower) ||
        item.restaurantName.toLowerCase().includes(searchLower)
      )
    }

    // Apply expired filter
    if (expiredFilter !== 'all') {
      const showExpired = expiredFilter === 'expired'
      filteredRedemptions = filteredRedemptions.filter((item: any) => 
        item.isExpired === showExpired
      )
    }

    // Calculate statistics - using only valid redemptions (with user data)
    const stats = {
      totalRedeemed: formattedRedemptions.length, // Count only valid redemptions
      expiredCodes: formattedRedemptions.filter((item: any) => item.isExpired).length,
      activeCodes: formattedRedemptions.filter((item: any) => !item.isExpired).length,
      uniqueUsers: new Set(formattedRedemptions.map((item: any) => item.userId.toString())).size,
      uniqueRestaurants: new Set(formattedRedemptions.map((item: any) => item.restaurantId.toString())).size,
    }

    // Apply pagination after filtering
    const totalPages = Math.ceil(filteredRedemptions.length / limit)
    const skip = (page - 1) * limit
    const paginatedRedemptions = isExport 
      ? filteredRedemptions 
      : filteredRedemptions.slice(skip, skip + limit)

    return NextResponse.json({
      success: true,
      redemptions: paginatedRedemptions,
      pagination: {
        total: filteredRedemptions.length,
        page,
        limit,
        pages: totalPages
      },
      stats
    })
  } catch (error: unknown) {
    console.error("Error fetching redeemed offers:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch redeemed offers",
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}

