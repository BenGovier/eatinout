// /app/api/restaurant/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
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

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, first_name, last_name, email, role, mobile, zip_code, subscription_status, created_at, updated_at")
      .eq("id", decodedToken.userId)
      .maybeSingle();

    if (error || !user || user.role !== "restaurant") {
      return NextResponse.json({ error: "Restaurant profile not found" }, { status: 404 });
    }

    // Format for frontend camelCase expectations
    const formattedUser = {
      _id: user.id,
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      zipCode: user.zip_code,
      subscriptionStatus: user.subscription_status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return NextResponse.json({ success: true, restaurant: formattedUser });
  } catch (error) {
    console.error("Error fetching restaurant profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}