import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Area from "@/models/Area"
import Restaurant from "@/models/Restaurant"
import { verifyAdminToken } from "@/lib/auth-admin"

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

    // Dynamic filtering parameters
    const searchTerm = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || ''

    // Build dynamic query
    const query: any = {}

    // Search filter
    if (searchTerm) {
      query.name = { $regex: searchTerm, $options: 'i' }
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      query.isActive = statusFilter === 'active'
    }

    // Count total areas
    const totalAreas = await Area.countDocuments(query)
    const totalPages = Math.ceil(totalAreas / limit)

    // Fetch areas with pagination
    const areas = await Area.find(query)
      .sort({ name: 1 })
      .skip(isExport ? 0 : skip)
      .limit(isExport ? 10000 : limit)
      .lean() // Optimize: Return plain JavaScript objects instead of Mongoose documents

    // Get restaurant counts for each area in a single aggregation query
    const areaIds = areas.map((area: any) => area._id.toString())
    
    const restaurantCounts = await Restaurant.aggregate([
      {
        $match: {
          area: { $in: areaIds },
          status: "approved"
        }
      },
      {
        $unwind: "$area"
      },
      {
        $group: {
          _id: "$area",
          count: { $sum: 1 }
        }
      }
    ])

    // Create a map for quick lookup
    const countMap = new Map<string, number>()
    restaurantCounts.forEach((item: any) => {
      countMap.set(item._id.toString(), item.count)
    })

    // Format area stats without additional DB calls
    const areaStats = areas.map((area: any) => ({
      _id: area._id,
      name: area.name,
      isActive: area.isActive,
      hideRestaurant: area.hideRestaurant,
      restaurantCount: countMap.get(area._id.toString()) || 0,
      createdAt: area.createdAt,
    }))

    // Get dynamic filter options and global stats in parallel
    const [dynamicFilters, globalStats] = await Promise.all([
      getDynamicFilterOptions(),
      getGlobalAreaStats()
    ])

    return NextResponse.json({
      success: true,
      areas: areaStats,
      pagination: {
        total: totalAreas,
        page,
        limit,
        pages: totalPages
      },
      filters: dynamicFilters,
      stats: globalStats
    })
  } catch (error: any) {
    console.error("Error fetching areas:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch areas",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

// Helper function to get dynamic filter options
async function getDynamicFilterOptions() {
  const activeStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  return {
    statuses: activeStatuses
  }
}

// Helper function to get global area statistics
async function getGlobalAreaStats() {
  // Optimize: Run all count queries in parallel instead of sequentially
  const [totalAreas, activeAreas, inactiveAreas, totalRestaurants] = await Promise.all([
    Area.countDocuments(),
    Area.countDocuments({ isActive: true }),
    Area.countDocuments({ isActive: false }),
    Restaurant.countDocuments({ status: 'approved' })
  ])

  return {
    totalAreas,
    activeAreas,
    inactiveAreas,
    totalRestaurants
  }
}

// Existing POST method remains unchanged
export async function POST(req: any) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const { name } = await req.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Area name is required" }, { status: 400 })
    }

    await connectToDatabase()

    // Check if area already exists (case insensitive)
    const existingArea = await Area.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    })

    if (existingArea) {
      return NextResponse.json({ success: false, message: "Area already exists" }, { status: 400 })
    }

    // Create new area with proper capitalization
    const area = new Area({ name: name })
    await area.save()

    return NextResponse.json(
      {
        success: true,
        message: "Area created successfully",
        area: {
          _id: area._id,
          name: area.name,
          isActive: area.isActive,
          restaurantCount: 0,
          hideRestaurant: area.hideRestaurant,
          createdAt: area.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("Error creating area:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create area",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

