import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(req: Request) {
  try {
    const { restaurantId, imageIndex } = await req.json();

    if (!restaurantId || imageIndex === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing restaurantId or imageIndex" },
        { status: 400 }
      );
    }

    // 1. Find restaurant
    const { data: restaurant, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restErr) throw new Error(restErr.message);
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // 2. Fetch current restaurant images
    const { data: imageRows, error: imgErr } = await supabaseAdmin
      .from("restaurant_images")
      .select("id, image_url, display_order")
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true });

    if (imgErr) throw new Error(imgErr.message);

    const rows = imageRows || [];

    // 3. Validate imageIndex
    if (imageIndex < 0 || imageIndex >= rows.length) {
      return NextResponse.json({
        success: true,
        message: "Image already removed or not present in DB",
        images: rows.map((r) => r.image_url),
      });
    }

    const targetRow = rows[imageIndex];

    // 4. Remove image from database
    const { error: delErr } = await supabaseAdmin
      .from("restaurant_images")
      .delete()
      .eq("id", targetRow.id);

    if (delErr) throw new Error(delErr.message);

    const remainingImages = rows
      .filter((r) => r.id !== targetRow.id)
      .map((r) => r.image_url);

    return NextResponse.json({
      success: true,
      message: "Image removed from database successfully",
      images: remainingImages, // send updated array back
    });
  } catch (error: any) {
    console.error("Error removing image:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
