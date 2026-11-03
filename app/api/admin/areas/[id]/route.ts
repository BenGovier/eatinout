// app/api/admin/areas/[id]/route.ts
import { NextResponse } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

// Supabase helper: escape a name so it is matched literally (case-insensitive exact match) in ILIKE
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => "\\" + m)

// Update an area
export async function PUT(req : any, { params } : any) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const { id } = params
    const { name, isActive, hideRestaurant  } = await req.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Area name is required" }, { status: 400 })
    }

    // Check if area exists
    const { data: areaRow, error: areaError } = await supabaseAdmin
      .from("areas")
      .select("id, name, is_active, hide_restaurant")
      .eq("id", id)
      .maybeSingle()
    if (areaError) throw new Error(areaError.message)
    const area = areaRow && {
      _id: areaRow.id,
      name: areaRow.name,
      isActive: areaRow.is_active,
      hideRestaurant: areaRow.hide_restaurant,
    }
    if (!area) {
      return NextResponse.json({ success: false, message: "Area not found" }, { status: 404 })
    }

    // Check if name is being changed and if it already exists
    if (name.toLowerCase() !== area.name.toLowerCase()) {
      const { data: existingArea, error: existingAreaError } = await supabaseAdmin
        .from("areas")
        .select("id")
        .ilike("name", escapeLike(name))
        .neq("id", id)
        .limit(1)
        .maybeSingle()
      if (existingAreaError) throw new Error(existingAreaError.message)

      if (existingArea) {
        return NextResponse.json({ success: false, message: "Area name already exists" }, { status: 400 })
      }
    }

    // Format name with proper capitalization
    // const formattedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toUpperCase()

    // Update area
    const { data: updatedAreaRow, error: updateError } = await supabaseAdmin
      .from("areas")
      .update({
        name: name.trim(),
        is_active: isActive !== undefined ? isActive : area.isActive,
        hide_restaurant: hideRestaurant !== undefined ? hideRestaurant : area.hideRestaurant,
      })
      .eq("id", id)
      .select("id, name, is_active, hide_restaurant, created_at, updated_at")
      .single()
    if (updateError) throw new Error(updateError.message)
    const updatedArea = {
      _id: updatedAreaRow.id,
      name: updatedAreaRow.name,
      isActive: updatedAreaRow.is_active,
      hideRestaurant: updatedAreaRow.hide_restaurant,
      createdAt: updatedAreaRow.created_at,
      updatedAt: updatedAreaRow.updated_at,
    }

    return NextResponse.json({
      success: true,
      message: "Area updated successfully",
      area: updatedArea,
    })
  } catch (error : any) {
    console.error("Error updating area:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update area",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

// Delete an area
export async function DELETE(req : any, { params } : any) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const { id } = params

    // Check if area exists
    const { data: areaRow, error: areaError } = await supabaseAdmin
      .from("areas")
      .select("id, name")
      .eq("id", id)
      .maybeSingle()
    if (areaError) throw new Error(areaError.message)
    const area = areaRow && { _id: areaRow.id, name: areaRow.name }
    if (!area) {
      return NextResponse.json({ success: false, message: "Area not found" }, { status: 404 })
    }

    // Check if any restaurant is assigned to this area
    const { data: restaurantRows, error: restaurantsError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, restaurant_areas!inner(area_id)")
      .eq("restaurant_areas.area_id", id)
    if (restaurantsError) throw new Error(restaurantsError.message)
    const restaurantsWithArea = (restaurantRows || []).map((r: any) => ({ _id: r.id, name: r.name }))

    if (restaurantsWithArea.length > 0) {
      const restaurantNames = restaurantsWithArea.map(restaurant => restaurant.name).join(", ")
      return NextResponse.json({
        success: false,
        message: `Cannot delete area "${area.name}" because it is assigned to ${restaurantsWithArea.length} restaurant(s): ${restaurantNames}. Please remove the area from these restaurants first.`
      }, { status: 400 })
    }

    // Delete area
    const { error: deleteError } = await supabaseAdmin.from("areas").delete().eq("id", id)
    if (deleteError) throw new Error(deleteError.message)

    return NextResponse.json({
      success: true,
      message: "Area deleted successfully",
    })
  } catch (error : any) {
    console.error("Error deleting area:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete area",
        error: error.message,
      },
      { status: 500 },
    )
  }
}