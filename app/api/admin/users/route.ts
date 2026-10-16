// api/admin/users/route.ts
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

const USER_COLUMNS =
  "id, first_name, last_name, email, role, zip_code, subscription_status, is_trialing, used_voucher_code, source, created_at"

// Escape a search term for use inside a PostgREST .or() ilike filter
// (escapes LIKE wildcards, then quotes the value so commas/parentheses are safe)
function buildIlikeValue(term: string) {
  const likeEscaped = term.replace(/[\\%_]/g, "\\$&")
  const quoted = likeEscaped.replace(/[\\"]/g, "\\$&")
  return `"%${quoted}%"`
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

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
    const applyFilters = (q: any) => {
      q = q.eq("is_deleted", false)

      // Search filter
      if (searchTerm) {
        const pattern = buildIlikeValue(searchTerm)
        q = q.or(
          `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`
        )
      }

      // Role filter
      if (roleFilter && roleFilter !== 'all') {
        q = q.eq("role", roleFilter)
      }

      // Subscription filter (only for user role)
      if (subscriptionFilter && subscriptionFilter !== 'all') {
        q = q.eq("role", "user").eq("subscription_status", subscriptionFilter)
      }

      return q
    }

    // Count total users
    const { count: totalUsersRaw, error: countError } = await applyFilters(
      supabaseAdmin.from("users").select("id", { count: "exact", head: true })
    )
    if (countError) throw countError
    const totalUsers = totalUsersRaw ?? 0
    const totalPages = Math.ceil(totalUsers / limit)

    // Fetch users with pagination
    let users: any[] = []
    if (isExport) {
      // Supabase returns max 1000 rows per request, so fetch export data in pages (max 10000 rows)
      const pageSize = 1000
      const maxRows = 10000
      for (let from = 0; from < maxRows; from += pageSize) {
        const { data, error } = await applyFilters(
          supabaseAdmin.from("users").select(USER_COLUMNS)
        )
          .order("created_at", { ascending: false })
          .order("id", { ascending: true }) // tie-breaker for stable paging
          .range(from, from + pageSize - 1)
        if (error) throw error
        users.push(...(data || []))
        if (!data || data.length < pageSize) break
      }
    } else {
      const { data, error } = await applyFilters(
        supabaseAdmin.from("users").select(USER_COLUMNS)
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: true }) // tie-breaker for stable paging
        .range(skip, skip + limit - 1)
      if (error) throw error
      users = data || []
    }

    // Get user IDs for restaurant lookup
    const userIds = users
      .filter(u => u.role === 'restaurant')
      .map(u => u.id)

    // Fetch restaurant names for restaurant users
    let restaurantMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const chunkSize = 100
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize)
        const { data: restaurants, error: restaurantError } = await supabaseAdmin
          .from("restaurants")
          .select("user_id, name")
          .in("user_id", chunk)
        if (restaurantError) throw restaurantError

        for (const r of restaurants || []) {
          restaurantMap[r.user_id] = r.name
        }
      }
    }

    // Format the response
    const formattedUsers = users.map((user: any) => ({
      _id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      zipCode: user.zip_code,
      subscriptionStatus: user.subscription_status || "inactive",
      isTrialing: user.is_trialing,
      usedVoucherCode: user.used_voucher_code,
      source: user.source,
      createdAt: user.created_at,
      ...(user.role === 'restaurant' && { restaurantName: restaurantMap[user.id] || null })
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

// Supabase has no .distinct(), so walk the index one distinct value at a time
// (one tiny request per distinct value instead of loading every user row)
async function getDistinctUserValues(column: "role" | "subscription_status"): Promise<string[]> {
  const values: string[] = []
  let last: string | null = null

  for (let i = 0; i < 50; i++) {
    let q: any = supabaseAdmin
      .from("users")
      .select(column)
      .not(column, "is", null)
      .order(column, { ascending: true })
      .limit(1)
    if (last !== null) q = q.gt(column, last)

    const { data, error } = await q
    if (error) throw error
    if (!data || data.length === 0) break

    const value = data[0][column] as string
    values.push(value)
    last = value
  }

  return values
}

// Helper function to get dynamic filter options
async function getDynamicFilterOptions() {
  // Optimize: Run both distinct queries in parallel
  const [roles, subscriptionStatuses] = await Promise.all([
    getDistinctUserValues('role'),
    getDistinctUserValues('subscription_status')
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

// Helper function to count users in Supabase with optional filters
async function countUsers(filters: { role?: string; subscription_status?: string } = {}) {
  let q: any = supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
  if (filters.role) q = q.eq("role", filters.role)
  if (filters.subscription_status) q = q.eq("subscription_status", filters.subscription_status)

  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

// Helper function to get global user statistics
async function getGlobalUserStats() {
  // Optimize: Run all count queries in parallel - exclude deleted users
  const [totalUsers, activeSubscribers, restaurantOwners, adminUsers] = await Promise.all([
    countUsers(),
    countUsers({ role: 'user', subscription_status: 'active' }),
    countUsers({ role: 'restaurant' }),
    countUsers({ role: 'admin' })
  ])

  return {
    totalUsers,
    activeSubscribers,
    restaurantOwners,
    adminUsers
  }
}