import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const { firstName, lastName, mobile } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Update user in Supabase
    const { data: updated, error } = await supabaseAdmin
      .from("users")
      .update({
        first_name: firstName,
        last_name: lastName,
        mobile: mobile ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, first_name, last_name, email, role, mobile, zip_code, subscription_status, created_at, updated_at")
      .maybeSingle();

    if (error || !updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formattedUser = {
      _id: updated.id,
      id: updated.id,
      firstName: updated.first_name,
      lastName: updated.last_name,
      email: updated.email,
      role: updated.role,
      mobile: updated.mobile,
      zipCode: updated.zip_code,
      subscriptionStatus: updated.subscription_status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      restaurant: formattedUser,
    });
  } catch (err) {
    console.error("Update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}