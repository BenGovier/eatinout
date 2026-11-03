import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: Request) {
  try {
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
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant" },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.userId;
    const restaurantId = decodedToken.restaurantId;

    let query = supabaseAdmin.from("restaurants").select("id, name");

    if (userId && restaurantId) {
      query = query.or(`user_id.eq.${userId},id.eq.${restaurantId}`);
    } else if (userId) {
      query = query.eq("user_id", userId);
    } else if (restaurantId) {
      query = query.eq("id", restaurantId);
    }

    const { data: restaurants, error } = await query;

    if (error) {
      console.error("Supabase error fetching restaurants for offers:", error);
      return NextResponse.json(
        { message: "Failed to fetch restaurant data", error: error.message },
        { status: 500 }
      );
    }

    const formattedRestaurants = (restaurants || []).map((r: any) => ({
      _id: r.id,
      id: r.id,
      name: r.name,
    }));

    return NextResponse.json({ success: true, restaurants: formattedRestaurants });
  } catch (error: any) {
    console.error("Error fetching restaurant data:", error);
    return NextResponse.json(
      { message: "Failed to fetch restaurant data", error: error.message },
      { status: 500 }
    );
  }
}