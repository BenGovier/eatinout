// api/auth/verify-token/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import supabaseAdmin from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: Request) {
  try {
    // Retrieve the token directly from cookies
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: "Authorization token is missing or invalid",
      });
    }

    // Verify the token
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("subscription_status, is_trialing, role, email, first_name, last_name")
      .eq("id", decoded.userId)
      .maybeSingle();
    if (userError) throw new Error(userError.message);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      });
    }

    // Return decoded token data along with subscription status
    return NextResponse.json({
      success: true,
      message: "Token is valid",
      user: {
        ...decoded,
        subscriptionStatus: user.subscription_status,
        isTrialing: user.is_trialing || false,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json({
      success: false,
      error: "Unable to verify token. Please try again.",
    });
  }
}