import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Area from "@/models/Area"
import Restaurant from "@/models/Restaurant"
import { verifyAdminToken } from "@/lib/auth-admin"

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

    await connectToDatabase()

    // Check if area exists
    const area = await Area.findById(id)
    if (!area) {
      return NextResponse.json({ success: false, message: "Area not found" }, { status: 404 })
    }

    // Check if name is being changed and if it already exists
    if (name.toLowerCase() !== area.name.toLowerCase()) {
      const existingArea = await Area.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
      })

      if (existingArea) {
        return NextResponse.json({ success: false, message: "Area name already exists" }, { status: 400 })
      }
    }

    // Format name with proper capitalization
    // const formattedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toUpperCase()

    // Update area
    const updatedArea = await Area.findByIdAndUpdate(
      id,
      {
        name: name,
        isActive: isActive !== undefined ? isActive : area.isActive,
        hideRestaurant: hideRestaurant !== undefined ? hideRestaurant : area.hideRestaurant,
      },
      { new: true },
    )

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

    await connectToDatabase()

    // Check if area exists
    const area = await Area.findById(id)
    if (!area) {
      return NextResponse.json({ success: false, message: "Area not found" }, { status: 404 })
    }

    // Check if any restaurant is assigned to this area
    const restaurantsWithArea = await Restaurant.find({
      area: { $in: [id] }
    })

    if (restaurantsWithArea.length > 0) {
      const restaurantNames = restaurantsWithArea.map(restaurant => restaurant.name).join(", ")
      return NextResponse.json({
        success: false,
        message: `Cannot delete area "${area.name}" because it is assigned to ${restaurantsWithArea.length} restaurant(s): ${restaurantNames}. Please remove the area from these restaurants first.`
      }, { status: 400 })
    }

    // Delete area
    await Area.findByIdAndDelete(id)

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

