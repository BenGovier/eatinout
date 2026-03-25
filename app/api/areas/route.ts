import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Area from "@/models/Area"

export async function GET() {
  try {
    await connectToDatabase()

    const areas = await Area.find({ isActive: true })
      .select("_id name hideRestaurant")
      .sort({ name: 1 })
      .lean()

    const formattedAreas = (areas as any[]).map((area) => ({
      _id: area._id.toString(),
      name: area.name,
      hideRestaurant : area.hideRestaurant || false
    }))

    return NextResponse.json({
      success: true,
      areas: formattedAreas,
    })
  } catch (error: any) {
    console.error("Error fetching areas:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch areas",
        error: error.message,
      },
      { status: 500 }
    )
  }
}
