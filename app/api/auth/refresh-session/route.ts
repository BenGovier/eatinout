// api/auth/refresh-session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import supabaseAdmin from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Re-issues the auth_token cookie with fresh subscriptionStatus/isTrialing
// claims, read directly from the DB. Called right after checkout completes
// client-side, since the Stripe webhook (which updates the DB) cannot set
// browser cookies itself.
export async function POST() {
  try {
    const cookieStore: any = await cookies();
    const existingToken = cookieStore.get("auth_token")?.value;

    if (!existingToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(existingToken, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, role, subscription_status, is_trialing")
      .eq("id", decoded.userId)
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        subscriptionStatus: user.subscription_status,
        isTrialing: user.is_trialing,
      },
      JWT_SECRET,
      { expiresIn: "365d" }
    );

    const response = NextResponse.json({
      success: true,
      subscriptionStatus: user.subscription_status,
      isTrialing: user.is_trialing,
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error: any) {
    console.error("Error refreshing session:", error);
    return NextResponse.json({ error: "Failed to refresh session" }, { status: 500 });
  }
}