import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import User from "@/models/User"
import { verifyAdminToken } from "@/lib/auth-admin"

export async function PUT(req, { params }) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const { id } = params
    const { status } = await req.json()

    // Validate status
    if (!["active", "inactive", "cancelled"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status. Must be 'active', 'inactive', or 'cancelled'",
        },
        { status: 400 },
      )
    }

    await connectToDatabase()

    // Update user subscription status
    const user = await User.findByIdAndUpdate(id, { subscriptionStatus: status }, { new: true })

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `User subscription status updated to ${status}`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
      },
    })
  } catch (error) {
    console.error("Error updating user subscription:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update user subscription",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

