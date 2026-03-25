import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Restaurant from "@/models/Restaurant"
import { verifyAdminToken } from "@/lib/auth-admin"

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    await connectToDatabase()

    const { hidden } = await req.json()

    // Validate the hidden value
    if (typeof hidden !== 'boolean') {
      return NextResponse.json(
        { success: false, message: "Invalid hidden value" },
        { status: 400 }
      )
    }

    // Update the restaurant's hidden status
    const restaurant = await Restaurant.findByIdAndUpdate(
      params.id,
      { hidden },
      { new: true }
    )

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Restaurant ${hidden ? 'hidden' : 'unhidden'} successfully`,
      restaurant
    })
  } catch (error: unknown) {
    console.error("Error updating restaurant hidden status:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update restaurant hidden status",
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

