// app/api/admin/areas/initialize/route.ts
import { NextResponse } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { randomBytes } from "crypto"
import { verifyAdminToken } from "@/lib/auth-admin"

// Initialize areas with default values
export async function POST(req) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    // Default areas
    const defaultAreas = ["Blackpool", "Preston", "Burnley"]

    // Check if areas collection is empty
    const { count, error: countError } = await supabaseAdmin
      .from("areas")
      .select("id", { count: "exact", head: true })
    if (countError) throw new Error(countError.message)

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        success: false,
        message: "Areas collection is not empty. Initialization skipped.",
      })
    }

    // Create default areas
    const { data: createdAreas, error: createError } = await supabaseAdmin
      .from("areas")
      .insert(
        defaultAreas.map((name) => ({
          // 24-char hex id, same format as the migrated MongoDB ObjectId ids
          id: randomBytes(12).toString("hex"),
          name,
        }))
      )
      .select("id, name, is_active, hide_restaurant, created_at, updated_at")
    if (createError) throw new Error(createError.message)
    const areas = (createdAreas || []).map((a: any) => ({
      _id: a.id,
      name: a.name,
      isActive: a.is_active,
      hideRestaurant: a.hide_restaurant,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }))

    return NextResponse.json({
      success: true,
      message: "Areas initialized successfully",
      areas,
    })
  } catch (error) {
    console.error("Error initializing areas:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to initialize areas",
        error: error.message,
      },
      { status: 500 },
    )
  }
}