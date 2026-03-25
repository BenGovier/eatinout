import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import User from "@/models/User"
import { verifyAdminToken } from "@/lib/auth-admin"
import Restaurant from "@/models/Restaurant"

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    // Connect to database
    await connectToDatabase()

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const isExport = searchParams.get('export') === 'true'
    const skip = isExport ? 0 : (page - 1) * limit

    // Dynamic filtering parameters
    const searchTerm = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || ''
    const subscriptionFilter = searchParams.get('subscription') || ''

    // Build dynamic query - exclude deleted users
    const query: any = { deleted: { $ne: true } }

    // Search filter
    if (searchTerm) {
      query.$or = [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    }

    // Role filter
    if (roleFilter && roleFilter !== 'all') {
      query.role = roleFilter
    }

    // Subscription filter (only for user role)
    if (subscriptionFilter && subscriptionFilter !== 'all') {
      query.$and = [
        { role: 'user' },
        { subscriptionStatus: subscriptionFilter }
      ]
    }

    // Count total users
    const totalUsers = await User.countDocuments(query)
    const totalPages = Math.ceil(totalUsers / limit)

    // Fetch users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(isExport ? 0 : skip)
      .limit(isExport ? 10000 : limit)
      .lean() // Optimize: Return plain JavaScript objects instead of Mongoose documents

    // Get user IDs for restaurant lookup
    const userIds = users
      .filter(u => u.role === 'restaurant')
      .map(u => u._id)

    // Fetch restaurant names for restaurant users
    let restaurantMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const restaurants = await Restaurant.find({ userId: { $in: userIds } }, { userId: 1, name: 1 }).lean()
      restaurantMap = restaurants.reduce((acc: Record<string, string>, r: any) => {
        acc[r.userId.toString()] = r.name
        return acc
      }, {})
    }

    // Format the response
    const formattedUsers = users.map((user: any) => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      zipCode: user.zipCode,
      subscriptionStatus: user.subscriptionStatus || "inactive",
      createdAt: user.createdAt,
      ...(user.role === 'restaurant' && { restaurantName: restaurantMap[user._id.toString()] || null })
    }))

    // Get dynamic filter options and global stats in parallel
    const [dynamicFilters, globalStats] = await Promise.all([
      getDynamicFilterOptions(),
      getGlobalUserStats()
    ])

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: totalPages
      },
      filters: dynamicFilters,
      stats: globalStats
    })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

// Helper function to get dynamic filter options
async function getDynamicFilterOptions() {
  // Optimize: Run both distinct queries in parallel
  const [roles, subscriptionStatuses] = await Promise.all([
    User.distinct('role'),
    User.distinct('subscriptionStatus')
  ])

  return {
    roles: roles.filter(role => role != null).map(role => ({
      value: role,
      label: role.charAt(0).toUpperCase() + role.slice(1)
    })),
    subscriptionStatuses: subscriptionStatuses.filter(status => status != null).map(status => ({
      value: status,
      label: status.charAt(0).toUpperCase() + status.slice(1)
    }))
  }
}

// Helper function to get global user statistics
async function getGlobalUserStats() {
  // Optimize: Run all count queries in parallel - exclude deleted users
  const [totalUsers, activeSubscribers, restaurantOwners, adminUsers] = await Promise.all([
    User.countDocuments({ deleted: { $ne: true } }),
    User.countDocuments({ 
      deleted: { $ne: true },
      role: 'user', 
      subscriptionStatus: 'active' 
    }),
    User.countDocuments({ deleted: { $ne: true }, role: 'restaurant' }),
    User.countDocuments({ deleted: { $ne: true }, role: 'admin' })
  ])

  return {
    totalUsers,
    activeSubscribers,
    restaurantOwners,
    adminUsers
  }
}

