// /app/api/restaurant/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import User from "@/models/User";
import connectToDatabase from "@/lib/mongodb";

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

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string };

    await connectToDatabase();

    const user = await User.findById(decodedToken.userId).select("-password");

    if (!user || user.role !== "restaurant") {
      return NextResponse.json({ error: "Restaurant profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, restaurant: user });
  } catch (error) {
    console.error("Error fetching restaurant profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}