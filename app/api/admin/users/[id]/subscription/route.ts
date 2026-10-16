// api/admin/users/[id]/subscription/route.ts
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

    // Update user subscription status
    const { data: user, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ subscription_status: status })
      .eq("id", id)
      .select("id, first_name, last_name, email, subscription_status")
      .maybeSingle()
    if (updateError) throw new Error(updateError.message)

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `User subscription status updated to ${status}`,
      user: {
        _id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        subscriptionStatus: user.subscription_status,
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