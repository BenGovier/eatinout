import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { message: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    const { count, error } = await supabaseAdmin
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);

    if (error) {
      console.error("Supabase check existing offers error:", error);
      return NextResponse.json(
        { message: "Failed to check existing offers", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hasExistingOffers: (count || 0) > 0,
    });
  } catch (error: any) {
    console.error("Check existing offers error:", error);
    return NextResponse.json(
      { message: "Failed to check existing offers", error: error.message },
      { status: 500 }
    );
  }
}
