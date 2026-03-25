import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Area from "@/models/Area"
import { verifyAdminToken } from "@/lib/auth-admin"

// Initialize areas with default values
export async function POST(req) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    await connectToDatabase()

    // Default areas
    const defaultAreas = ["Blackpool", "Preston", "Burnley"]

    // Check if areas collection is empty
    const count = await Area.countDocuments()

    if (count > 0) {
      return NextResponse.json({
        success: false,
        message: "Areas collection is not empty. Initialization skipped.",
      })
    }

    // Create default areas
    const areas = await Promise.all(
      defaultAreas.map(async (name) => {
        const area = new Area({ name })
        await area.save()
        return area
      }),
    )

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

