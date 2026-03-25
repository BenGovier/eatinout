import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function PUT(req: NextRequest, { params }) {
  try {
    await connectToDatabase();

    const userId = params.id;
    const { firstName, lastName, mobile } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    //  ❗ Note: Email NOT updated here anymore
    const updated = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, mobile },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      restaurant: updated,
    });
  } catch (err) {
    console.error("Update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}