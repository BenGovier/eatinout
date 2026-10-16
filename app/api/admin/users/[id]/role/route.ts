// api/admin/users/[id]/role/route.ts
import { NextResponse } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
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

    // Update user role
    const { data: user, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ role })
      .eq("id", id)
      .select("id, first_name, last_name, email, role")
      .maybeSingle()
    if (updateError) throw new Error(updateError.message)

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        _id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
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