// app/api/admin/carousels/restaurants/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data: restaurantRows, error: restaurantsError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, restaurant_images(image_url, display_order)")
      .eq("status", "approved")
      .eq("is_hidden", false)
      .order("name", { ascending: true })
      .limit(1000);
    if (restaurantsError) throw new Error(restaurantsError.message);

    // same shape (and name order) the Mongo query returned
    const restaurants = (restaurantRows || [])
      .map((r: any) => ({
        _id: r.id,
        name: r.name,
        images: (r.restaurant_images ?? [])
          .slice()
          .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((i: any) => i.image_url),
      }))
      .sort((a: any, b: any) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    return NextResponse.json({
      success: true,
      restaurants,
    });
  } catch (error: any) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurants",
        error: error.message,
      },
      { status: 500 }
    );
  }
}