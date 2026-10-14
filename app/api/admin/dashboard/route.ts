// api/admin/dashboard/route.ts
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    // Get counts from database
    const { count: userCountRaw, error: userCountError } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
    if (userCountError) throw userCountError
    const userCount = userCountRaw ?? 0

    const { count: restaurantCountRaw, error: restaurantCountError } = await supabaseAdmin
      .from("restaurants")
      .select("id", { count: "exact", head: true })
    if (restaurantCountError) throw restaurantCountError
    const restaurantCount = restaurantCountRaw ?? 0

    // Count only active offers that have a restaurantId matching an existing restaurant
    // (offers.restaurant_id has a FK with ON DELETE CASCADE, so every offer always has an existing restaurant)
    const { count: activeOffersCountRaw, error: activeOffersError } = await supabaseAdmin
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
    if (activeOffersError) throw activeOffersError
    const activeOffersCount = activeOffersCountRaw ?? 0

    const { count: areasCountRaw, error: areasCountError } = await supabaseAdmin
      .from("areas")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
    if (areasCountError) throw areasCountError
    const areasCount = areasCountRaw ?? 0

    // Get recent signups (last 7 days)
    const { data: recentSignupsData, error: recentSignupsError } = await supabaseAdmin
      .from("users")
      .select("id, first_name, last_name, email, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(5)
    if (recentSignupsError) throw recentSignupsError

    const recentSignups = (recentSignupsData || []).map((u: any) => ({
      _id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      createdAt: u.created_at,
    }))

    // Get new restaurants (last 7 days)
    const { data: newRestaurantsData, error: newRestaurantsError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, created_at, restaurant_areas(areas(id, name))")
      .order("created_at", { ascending: false })
      .limit(5)
    if (newRestaurantsError) throw newRestaurantsError

    const newRestaurants = (newRestaurantsData || []).map((r: any) => ({
      _id: r.id,
      name: r.name,
      // same shape as the old populate({ path: 'area', select: 'name' })
      area: (r.restaurant_areas || [])
        .map((ra: any) => ra.areas)
        .filter(Boolean)
        .map((a: any) => ({ _id: a.id, name: a.name })),
      createdAt: r.created_at,
    }))

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
    const errorMessage = error instanceof Error
      ? error.message
      : (error as any)?.message || "Unknown error occurred";
    
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