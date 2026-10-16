import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { restaurantId, userId: requestedUserId } = await req.json();

    if (!restaurantId || typeof restaurantId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid restaurant id" },
        { status: 400 }
      );
    }

    // Authenticate user via token
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    let authUserId = requestedUserId;
    if (token) {
      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        );
        if (decoded?.userId) {
          authUserId = decoded.userId;
        }
      } catch (err) {
        // Fall back to requestedUserId if valid
      }
    }

    if (!authUserId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if favorite already exists in user_favorites table
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("user_favorites")
      .select("id")
      .eq("user_id", authUserId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking favorite:", checkError);
      return NextResponse.json(
        { success: false, message: "Database error checking favorite" },
        { status: 500 }
      );
    }

    if (existing) {
      // UNLIKE: Delete favorite record
      const { error: deleteError } = await supabaseAdmin
        .from("user_favorites")
        .delete()
        .eq("user_id", authUserId)
        .eq("restaurant_id", restaurantId);

      if (deleteError) {
        console.error("Error removing favorite:", deleteError);
        return NextResponse.json(
          { success: false, message: "Failed to remove favorite" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        liked: false,
      });
    } else {
      // LIKE: Insert new favorite record
      const { error: insertError } = await supabaseAdmin
        .from("user_favorites")
        .insert({
          user_id: authUserId,
          restaurant_id: restaurantId,
        });

      if (insertError) {
        console.error("Error adding favorite:", insertError);
        return NextResponse.json(
          { success: false, message: "Failed to add favorite" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        liked: true,
      });
    }
  } catch (error: any) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}