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
    const { role } = await req.json()

    // Validate role
    if (!["user", "restaurant", "admin"].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid role. Must be 'user', 'restaurant', or 'admin'",
        },
        { status: 400 },
      )
    }

    await connectToDatabase()

    // Update user role
    const user = await User.findByIdAndUpdate(id, { role }, { new: true })

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Error updating user role:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update user role",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

