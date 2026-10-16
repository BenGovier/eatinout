import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Helper to format user row to camelCase for frontend compatibility
function formatUserProfile(user: any) {
  return {
    _id: user.id,
    id: user.id,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    email: user.email || "",
    mobile: user.mobile || "",
    zipCode: user.zip_code || "",
    role: user.role || "user",
    subscriptionStatus: user.subscription_status || "inactive",
    isTrialing: user.is_trialing || false,
    stripeCustomerId: user.stripe_customer_id || null,
    stripePriceId: user.stripe_price_id || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

// Get user profile details
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

    // Decode token to get userId
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    // Fetch user details from Supabase (excluding sensitive hash)
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select(
        "id, first_name, last_name, email, mobile, zip_code, role, subscription_status, is_trialing, stripe_customer_id, stripe_price_id, created_at, updated_at"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error fetching user profile:", error);
      return NextResponse.json(
        { error: "Database error fetching profile" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(formatUserProfile(user));
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Update user profile details
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

    const userId = decodedToken.userId;
    const updatedProfile = await request.json();

    // Validate required fields
    const { firstName, lastName, email, mobile, zipCode } = updatedProfile;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required." },
        { status: 400 }
      );
    }

    // Check if mobile number is already taken by another user
    if (mobile && mobile.trim()) {
      const { data: existingMobile, error: mobileErr } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("mobile", mobile.trim())
        .neq("id", userId)
        .maybeSingle();

      if (mobileErr) {
        console.error("Error checking mobile uniqueness:", mobileErr);
      }

      if (existingMobile) {
        return NextResponse.json(
          { error: "Mobile number already in use by another account." },
          { status: 400 }
        );
      }
    }

    // Update user in Supabase
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile ? mobile.trim() : null,
        zip_code: zipCode ? zipCode.trim() : "",
      })
      .eq("id", userId)
      .select(
        "id, first_name, last_name, email, mobile, zip_code, role, subscription_status, is_trialing, stripe_customer_id, stripe_price_id, created_at, updated_at"
      )
      .single();

    if (updateError) {
      console.error("Error updating user profile in Supabase:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile: " + updateError.message },
        { status: 500 }
      );
    }

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(formatUserProfile(updatedUser));
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}