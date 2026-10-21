// /app/api/admin/restaurants-by-owner/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import supabaseAdmin from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        userId?: string;
        role: string;
      };

      // ✅ Only admins allowed to use this route
      if (decodedToken.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized - Admin only" }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const url = new URL(request.url);
    const ownerId = url.searchParams.get("id");

    if (!ownerId) {
      return NextResponse.json({ message: "Missing owner ID" }, { status: 400 });
    }

    const quotedOwnerId = `"${ownerId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const { data: restaurantRows, error: restaurantsError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name") // Select only necessary fields
      .or(`user_id.eq.${quotedOwnerId},associated_id.eq.${quotedOwnerId}`);
    if (restaurantsError) throw new Error(restaurantsError.message);
    const restaurants = (restaurantRows || []).map((r: any) => ({ _id: r.id, name: r.name }));

    return NextResponse.json({ success: true, restaurants });
  } catch (error: any) {
    console.error("Admin fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}