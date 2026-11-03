import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Fetch the restaurant by ID from Supabase
    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Fetch categories, areas, images, menu pdfs
    const [catsRes, areasRes, imagesRes, menuPdfsRes] = await Promise.all([
      supabaseAdmin.from("restaurant_categories").select("category_id").eq("restaurant_id", id),
      supabaseAdmin.from("restaurant_areas").select("area_id").eq("restaurant_id", id),
      supabaseAdmin.from("restaurant_images").select("image_url, display_order").eq("restaurant_id", id).order("display_order"),
      supabaseAdmin.from("restaurant_menu_pdfs").select("pdf_url, display_order").eq("restaurant_id", id).order("display_order"),
    ]);

    const formattedRestaurant = {
      ...restaurant,
      _id: restaurant.id,
      userId: restaurant.user_id,
      zipCode: restaurant.zip_code,
      dineIn: restaurant.dine_in,
      dineOut: restaurant.dine_out,
      category: (catsRes.data || []).map((c) => c.category_id),
      area: (areasRes.data || []).map((a) => a.area_id),
      images: (imagesRes.data || []).map((i) => i.image_url),
      menuPdfUrls: (menuPdfsRes.data || []).map((m) => m.pdf_url),
      subscriptionStatus: restaurant.subscription_status,
      stripeCustomerId: restaurant.stripe_customer_id,
      stripePriceId: restaurant.stripe_price_id,
      subscriptionId: restaurant.subscription_id,
      createdAt: restaurant.created_at,
      updatedAt: restaurant.updated_at,
    };

    return NextResponse.json({ success: true, data: formattedRestaurant });
  } catch (error: any) {
    console.error("Error fetching restaurant by ID:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurant data",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params?: Promise<{ id: string }> | { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        role: string;
        userId: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    let restaurantId: string | undefined;
    if (params) {
      const resolved = await params;
      restaurantId = resolved?.id;
    }
    if (!restaurantId) {
      const url = new URL(request.url);
      restaurantId = url.pathname.split("/").pop();
    }

    if (!restaurantId) {
      return NextResponse.json(
        { message: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    // Cascade delete in Supabase: foreign keys have ON DELETE CASCADE on offers, restaurant_areas, etc.
    // Also explicitly delete offers to be 100% sure
    await supabaseAdmin.from("offers").delete().eq("restaurant_id", restaurantId);

    const { data: deleted, error: delErr } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", restaurantId)
      .select("id")
      .maybeSingle();

    if (delErr || !deleted) {
      return NextResponse.json(
        { message: "Restaurant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Restaurant deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting restaurant:", error);
    return NextResponse.json(
      { message: "Failed to delete restaurant", error: error.message },
      { status: 500 }
    );
  }
}