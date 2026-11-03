// /app/api/restaurant/update-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PUT(request: NextRequest) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string };

    const { firstName, lastName, email, mobile } = await request.json();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name and email are required" },
        { status: 400 }
      );
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update({
        first_name: firstName,
        last_name: lastName,
        email: email,
        mobile: mobile ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", decodedToken.userId)
      .select("id, first_name, last_name, email, role, mobile, zip_code, subscription_status, created_at, updated_at")
      .maybeSingle();

    if (error || !updatedUser) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const formattedUser = {
      _id: updatedUser.id,
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      role: updatedUser.role,
      mobile: updatedUser.mobile,
      zipCode: updatedUser.zip_code,
      subscriptionStatus: updatedUser.subscription_status,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: "Restaurant profile updated successfully",
      restaurant: formattedUser,
    });
  } catch (error) {
    console.error("Error updating restaurant profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}