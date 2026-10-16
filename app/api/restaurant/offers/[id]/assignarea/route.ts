import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    let restaurantId: string | null = null;
    let isAdmin = false;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        role: string;
      };

      // Check if the role is either "restaurant" or "admin"
      if (decoded.role !== "restaurant" && decoded.role !== "admin") {
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant or admin" },
          { status: 403 }
        );
      }

      if (decoded.role === "admin") {
        isAdmin = true;
      } else {
        restaurantId = decoded.restaurantId || null;
        if (!restaurantId) {
          return NextResponse.json(
            { message: "Restaurant ID not found in token" },
            { status: 400 }
          );
        }
      }
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Parse request body
    const { areas } = await req.json();

    // Validate required fields
    if (!areas || !Array.isArray(areas) || areas.length === 0) {
      return NextResponse.json(
        { message: "Invalid or missing areas array" },
        { status: 400 }
      );
    }

    // Verify offer existence and ownership
    let offerQuery = supabaseAdmin.from("offers").select("id, restaurant_id").eq("id", params.id);
    if (!isAdmin && restaurantId) {
      offerQuery = offerQuery.eq("restaurant_id", restaurantId);
    }

    const { data: existingOffer, error: offerErr } = await offerQuery.maybeSingle();

    if (offerErr || !existingOffer) {
      return NextResponse.json(
        { message: "Offer not found or unauthorized" },
        { status: 404 }
      );
    }

    // Sync offer_areas junction table
    await supabaseAdmin.from("offer_areas").delete().eq("offer_id", params.id);

    const offerAreaRows = areas.map((areaId: string) => ({
      offer_id: params.id,
      area_id: areaId,
    }));

    const { error: insertAreaErr } = await supabaseAdmin
      .from("offer_areas")
      .insert(offerAreaRows);

    if (insertAreaErr) {
      console.error("Error inserting offer_areas:", insertAreaErr);
      return NextResponse.json(
        { message: "Failed to assign areas", error: insertAreaErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Areas assigned successfully",
      offer: {
        id: params.id,
        areas,
      },
    });
  } catch (error: any) {
    console.error("Assign areas error:", error);
    return NextResponse.json(
      { message: "Failed to assign areas", error: error.message },
      { status: 500 }
    );
  }
}