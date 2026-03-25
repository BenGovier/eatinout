// /app/api/admin/restaurants-by-owner/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";

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

    await connectToDatabase();

    const url = new URL(request.url);
    const ownerId = url.searchParams.get("id");

    if (!ownerId) {
      return NextResponse.json({ message: "Missing owner ID" }, { status: 400 });
    }

    const restaurants = await Restaurant.find(
      {
        $or: [
          { userId: ownerId },
          { associatedId: ownerId }
        ]
      },
      { _id: 1, name: 1 } // Select only necessary fields
    );

    return NextResponse.json({ success: true, restaurants });
  } catch (error: any) {
    console.error("Admin fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
