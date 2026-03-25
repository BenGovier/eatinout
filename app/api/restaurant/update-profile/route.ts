// /app/api/restaurant/update-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import User from "@/models/User";
import connectToDatabase from "@/lib/mongodb";

export async function PUT(request: NextRequest) {
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

    const { firstName, lastName, email, mobile } = await request.json();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name and email are required" },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      decodedToken.userId,
      {
        $set: { firstName, lastName, email, mobile },
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Restaurant profile updated successfully",
      restaurant: updatedUser,
    });
  } catch (error) {
    console.error("Error updating restaurant profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}