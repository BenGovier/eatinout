import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Restaurant from "@/models/Restaurant"
import Offer from "@/models/Offer"
import { verifyAdminToken } from "@/lib/auth-admin"
import { Category } from "@/models/Categories"
import User from "@/models/User"
import Area from "@/models/Area"

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
    const skip = isExport ? 0 : (page - 1) * limit

    // Modify limit for export
    const exportLimit = isExport ? 10000 : limit

    // Dynamic filtering parameters
    const searchTerm = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || ''
    const areaFilter = searchParams.get('area') || ''

    // Build dynamic query
    const query: any = {}

    // Exclude hidden restaurants by default
    query.hidden = { $ne: true }

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        {
          category: {
            $in: await Category.find({
              name: { $regex: searchTerm, $options: 'i' }
            }).distinct('_id')
          }
        }
      ]
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter
    }

    // Area filter
    if (areaFilter && areaFilter !== 'all') {
      // Find the area by name
      const area = await Area.findOne({ name: areaFilter })

      console.log('Area Filter Details:', {
        areaFilter,
        areaFound: area,
        areaId: area ? area._id : null
      })

      if (area) {
        // Convert ObjectId to string for matching
        const areaIdString = area._id.toString()

        // Use $in to match any area in the restaurant's areas array
        query.area = { $in: [areaIdString] }
      }
    }

    console.log('Final Query:', query)

    const totalRestaurants = await Restaurant.countDocuments(query)

    const totalPages = Math.ceil(totalRestaurants / limit)

    // const restaurants = await Restaurant.find(query)
    //   // .sort({ createdAt: -1 })
    //   .sort({
    //     "homePin.isPinned": -1,      // pinned first
    //     "homePin.priority": 1,       // 1 > 2 > 3
    //     "homePin.pinnedAt": -1,       // older first
    //     createdAt: -1                // fallback
    //   })
    //   .skip(skip)
    //   .limit(exportLimit)
    //   .populate('area', 'name')
    //   .lean() // Optimize: Return plain JavaScript objects instead of Mongoose documents  

    const restaurants = await Restaurant.aggregate([
      { $match: query },

      /** ✅ COMPUTED SORT FIELDS */
      {
        $addFields: {
          isHomePinned: { $cond: ["$homePin.isPinned", 1, 0] },
          homePriority: { $ifNull: ["$homePin.priority", 9999] },

          isAreaPinned: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$areaPins", []] } }, 0] },
              1,
              0
            ]
          },

          areaMinPriority: {
            $min: {
              $map: {
                input: { $ifNull: ["$areaPins", []] },
                as: "pin",
                in: "$$pin.priority"
              }
            }
          }
        }
      },

      /** ✅ SORT LOGIC */
      {
        $sort: {
          isHomePinned: -1,        // 1️⃣ Home pinned first
          homePriority: 1,

          isAreaPinned: -1,        // 2️⃣ Area pinned next
          areaMinPriority: 1,

          createdAt: -1            // 3️⃣ Normal fallback
        }
      },

      { $skip: skip },
      { $limit: exportLimit }
    ])

    // Get restaurant IDs for this page
    const restaurantIds = restaurants.map(restaurant => restaurant._id)

    // Optimize: Combine both offer count queries into one aggregation with $facet
    const currentDate = new Date()
    const offerCounts = await Offer.aggregate([
      {
        $match: {
          restaurantId: { $in: restaurantIds },
          status: { $in: ["active", "pending"] },
          $or: [
            { expiryDate: { $gt: currentDate } },
            { expiryDate: { $exists: false } },
            { expiryDate: null }
          ]
        }
      },
      {
        $facet: {
          active: [
            { $match: { status: "active" } },
            {
              $group: {
                _id: "$restaurantId",
                count: { $sum: 1 }
              }
            }
          ],
          pending: [
            { $match: { status: "pending" } },
            {
              $group: {
                _id: "$restaurantId",
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ])

    console.log('Offer Counts Result:', JSON.stringify(offerCounts, null, 2))

    // Create lookup maps from combined results
    const activeOffersMap = (offerCounts[0]?.active || []).reduce((map: Record<string, number>, item: any) => {
      map[item._id.toString()] = item.count
      return map
    }, {} as Record<string, number>)

    const pendingOffersMap = (offerCounts[0]?.pending || []).reduce((map: Record<string, number>, item: any) => {
      map[item._id.toString()] = item.count
      return map
    }, {} as Record<string, number>)

    // Optimize: Collect all unique IDs first
    const allCategoryIds = new Set<string>()
    const allUserIds = new Set<string>()
    const allAreaIds = new Set<string>()

    restaurants.forEach((restaurant) => {
      if (Array.isArray(restaurant.category)) {
        restaurant.category.forEach((catId: any) => allCategoryIds.add(catId.toString()))
      } else if (restaurant.category) {
        allCategoryIds.add(restaurant.category.toString())
      }

      // Collect user IDs from both userId and associatedId
      if (restaurant.userId) {
        allUserIds.add(restaurant.userId.toString())
      }
      if (restaurant.associatedId) {
        // associatedId is stored as string, so add it directly
        allUserIds.add(restaurant.associatedId.toString())
      }

      if (restaurant.area) {
        const areaIds = Array.isArray(restaurant.area) ? restaurant.area : [restaurant.area]
        areaIds.forEach((areaId: any) => {
          if (typeof areaId === 'string' || (areaId && areaId._id)) {
            allAreaIds.add((typeof areaId === 'string' ? areaId : areaId._id).toString())
          }
        })
      }
    })

    // Optimize: Batch fetch all data at once
    const [categoriesData, usersData, areasData, dynamicFilters] = await Promise.all([
      Category.find({ _id: { $in: Array.from(allCategoryIds) } }).select("_id name").lean(),
      User.find({ _id: { $in: Array.from(allUserIds) } }).select("_id firstName lastName").lean(),
      Area.find({ _id: { $in: Array.from(allAreaIds) } }).select("_id name").lean(),
      getDynamicFilterOptions()
    ])

    // Create lookup maps for O(1) access
    const categoryMap = new Map(categoriesData.map((cat: any) => [cat._id.toString(), cat]))
    const userMap = new Map(usersData.map((user: any) => [user._id.toString(), user]))
    const areaMap = new Map(areasData.map((area: any) => [area._id.toString(), area]))

    // Format restaurants without additional DB calls
    const formattedRestaurants = restaurants.map((restaurant: any) => {
      const restaurantIdStr = restaurant._id.toString()

      // Get categories from map
      const categories: { id: any; name: string }[] = []
      if (Array.isArray(restaurant.category)) {
        const categoryList = restaurant.category.map((catId: any) => {
          const category = categoryMap.get(catId.toString())
          return {
            id: catId,
            name: category ? category.name : null
          }
        }).filter((cat: any) => cat.name !== null) as { id: any; name: string }[]
        categories.push(...categoryList)
      } else if (restaurant.category) {
        const category = categoryMap.get(restaurant.category.toString())
        if (category) {
          categories.push({
            id: restaurant.category,
            name: category.name
          })
        }
      }

      // Get owner from map - check userId first, then associatedId
      let ownerName = null
      if (restaurant.userId) {
        const user = userMap.get(restaurant.userId.toString())
        if (user) {
          ownerName = `${user.firstName} ${user.lastName}`
        }
      }
      // If no owner found via userId, check associatedId (stored as string)
      if (!ownerName && restaurant.associatedId) {
        const user = userMap.get(restaurant.associatedId.toString())
        if (user) {
          ownerName = `${user.firstName} ${user.lastName}`
        }
      }

      // Get areas from map
      let areas: { id: string, name: string }[] = []
      if (restaurant.area) {
        const areaIds = Array.isArray(restaurant.area) ? restaurant.area : [restaurant.area]

        areas = areaIds.map((areaId: any) => {
          if (typeof areaId === 'object' && areaId.name) {
            return {
              id: areaId._id.toString(),
              name: areaId.name
            }
          } else {
            const area = areaMap.get(areaId.toString())
            return area ? {
              id: area._id.toString(),
              name: area.name
            } : null
          }
        })
          .filter((area: { id: string, name: string } | null): area is { id: string, name: string } => area !== null)
          .filter((area: { id: string, name: string }, index: number, self: { id: string, name: string }[]) =>
            index === self.findIndex((t: { id: string, name: string }) => t.id === area.id)
          )
      }

      // Format areaPins with area name
      const formattedAreaPins =
        Array.isArray(restaurant.areaPins) && restaurant.areaPins.length > 0
          ? restaurant.areaPins
            .map((pin: any) => {
              const area = areaMap.get(pin.areaId?.toString())
              if (!area) return null

              return {
                areaId: area._id.toString(),
                areaName: area.name,
                isPinned: pin.isPinned,
                priority: pin.priority,
                pinnedAt: pin.areaPinnedAt,
              }
            })
            .filter(Boolean)
          : []

      return {
        _id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone,
        address: restaurant.address,
        city: restaurant.city,
        zipCode: restaurant.zipCode,
        areas: areas.length > 0 ? areas : null,
        website: restaurant.website,
        images: restaurant.images,
        description: restaurant.description,
        menuPdfUrls: restaurant.menuPdfUrls || [],
        addressLink: restaurant.addressLink,
        dineIn: restaurant.dineIn,
        dineOut: restaurant.dineOut,
        deliveryAvailable: restaurant.deliveryAvailable,
        status: restaurant.status,
        activeOffersCount: activeOffersMap[restaurantIdStr] || 0,
        pendingOffersCount: pendingOffersMap[restaurantIdStr] || 0,
        totalOffersCount:
          (activeOffersMap[restaurantIdStr] || 0) +
          (pendingOffersMap[restaurantIdStr] || 0),
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
        associatedId: restaurant.associatedId,
        category: categories,
        userId: restaurant.userId,
        ownerName,
        homePin: {
          isPinned: restaurant.homePin?.isPinned || false,
          priority: restaurant.homePin?.priority ?? null,
          pinnedAt: restaurant.homePin?.pinnedAt ?? null,
        },
        areaPins: formattedAreaPins,
      }
    })

    // Get global statistics
    const globalStats = await getGlobalRestaurantStats()

    return NextResponse.json({
      success: true,
      restaurants: formattedRestaurants,
      pagination: {
        total: totalRestaurants,
        page,
        limit,
        pages: totalPages
      },
      filters: dynamicFilters,
      stats: globalStats
    })
  } catch (error: unknown) {
    console.error("Error fetching restaurants:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurants",
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}

// Helper function to get dynamic filter options
async function getDynamicFilterOptions() {
  // Optimize: Run all queries in parallel and use lean() for better performance
  const [areas, statuses, categories] = await Promise.all([
    Area.find().select('name').lean(),
    Restaurant.distinct('status'),
    Category.find().select('name').lean()
  ])

  return {
    areas: areas.map(area => ({
      value: area.name,
      label: area.name
    })),
    statuses: statuses.filter(status => status != null).map(status => ({
      value: status,
      label: status.charAt(0).toUpperCase() + status.slice(1)
    })),
    categories: categories.map(cat => ({
      value: cat._id,
      label: cat.name
    }))
  }
}

// Helper function to get global restaurant statistics
async function getGlobalRestaurantStats() {
  // Optimize: Run all count queries in parallel instead of sequentially
  const [
    totalRestaurants,
    activeRestaurants,
    pendingRestaurants,
    rejectedRestaurants,
    totalOffers,
    activeOffers
  ] = await Promise.all([
    Restaurant.countDocuments(),
    Restaurant.countDocuments({ status: 'approved' }),
    Restaurant.countDocuments({ status: 'pending' }),
    Restaurant.countDocuments({ status: 'rejected' }),
    Offer.countDocuments(),
    Offer.countDocuments({ status: 'active' })
  ])

  return {
    totalRestaurants,
    activeRestaurants,
    pendingRestaurants,
    rejectedRestaurants,
    totalOffers,
    activeOffers
  }
}
