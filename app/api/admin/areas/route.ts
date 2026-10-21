// app/api/admin/areas/route.ts
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { randomBytes } from "crypto"
import { verifyAdminToken } from "@/lib/auth-admin"

// Supabase helpers
const SUPABASE_PAGE_SIZE = 1000
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => "\\" + m)
const countOf = async (query: PromiseLike<{ count: number | null; error: any }>) => {
  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
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
    const statusFilter = searchParams.get('status') || ''

    // Build dynamic query
    const query: any = {}

    // Search filter
    if (searchTerm) {
      query.name = searchTerm
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      query.isActive = statusFilter === 'active'
    }

    // Count total areas
    // Fetch areas with pagination (the total comes from the same query)
    const rangeStart = isExport ? 0 : skip
    const rangeEnd = rangeStart + (isExport ? 10000 : limit) - 1
    const areaRows: any[] = []
    let totalAreas = 0
    for (let from = rangeStart; from <= rangeEnd; from += SUPABASE_PAGE_SIZE) {
      const to = Math.min(from + SUPABASE_PAGE_SIZE - 1, rangeEnd)
      let q: any = supabaseAdmin
        .from("areas")
        .select("id, name, is_active, hide_restaurant, created_at", from === rangeStart ? { count: "exact" } : {})
      if (query.name !== undefined) q = q.ilike("name", `%${escapeLike(query.name)}%`)
      if (query.isActive !== undefined) q = q.eq("is_active", query.isActive)
      const { data, count, error } = await q
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
      if (error) throw new Error(error.message)
      if (from === rangeStart) totalAreas = count ?? 0
      areaRows.push(...(data || []))
      if ((data || []).length < to - from + 1) break
    }
    const totalPages = Math.ceil(totalAreas / limit)
    const areas = areaRows.map((a: any) => ({
      _id: a.id,
      name: a.name,
      isActive: a.is_active,
      hideRestaurant: a.hide_restaurant,
      createdAt: a.created_at,
    })) // Optimize: Return plain JavaScript objects instead of Mongoose documents

    // Get restaurant counts for each area in a single aggregation query
    const areaIds = areas.map((area: any) => area._id.toString())
    
    const restaurantCountRows: any[] = []
    if (areaIds.length > 0) {
      for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
          .from("restaurant_areas")
          .select("area_id, restaurant_id, restaurants!inner(status)")
          .in("area_id", areaIds)
          .eq("restaurants.status", "approved")
          .order("area_id", { ascending: true })
          .order("restaurant_id", { ascending: true })
          .range(from, from + SUPABASE_PAGE_SIZE - 1)
        if (error) throw new Error(error.message)
        restaurantCountRows.push(...(data || []))
        if ((data || []).length < SUPABASE_PAGE_SIZE) break
      }
    }
    const countsByArea: Record<string, number> = {}
    for (const row of restaurantCountRows) {
      countsByArea[row.area_id] = (countsByArea[row.area_id] || 0) + 1
    }
    const restaurantCounts = Object.entries(countsByArea).map(([_id, count]) => ({ _id, count }))

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
    countOf(supabaseAdmin.from("areas").select("id", { count: "exact", head: true })),
    countOf(supabaseAdmin.from("areas").select("id", { count: "exact", head: true }).eq("is_active", true)),
    countOf(supabaseAdmin.from("areas").select("id", { count: "exact", head: true }).eq("is_active", false)),
    countOf(supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "approved"))
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

    // Check if area already exists (case insensitive)
    const { data: existingArea, error: existingAreaError } = await supabaseAdmin
      .from("areas")
      .select("id")
      .ilike("name", escapeLike(name))
      .limit(1)
      .maybeSingle()
    if (existingAreaError) throw new Error(existingAreaError.message)

    if (existingArea) {
      return NextResponse.json({ success: false, message: "Area already exists" }, { status: 400 })
    }

    // Create new area with proper capitalization
    const { data: createdArea, error: createError } = await supabaseAdmin
      .from("areas")
      .insert({
        // 24-char hex id, same format as the migrated MongoDB ObjectId ids
        id: randomBytes(12).toString("hex"),
        name: name.trim(),
      })
      .select("id, name, is_active, hide_restaurant, created_at")
      .single()
    if (createError) throw new Error(createError.message)
    const area = {
      _id: createdArea.id,
      name: createdArea.name,
      isActive: createdArea.is_active,
      hideRestaurant: createdArea.hide_restaurant,
      createdAt: createdArea.created_at,
    }

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