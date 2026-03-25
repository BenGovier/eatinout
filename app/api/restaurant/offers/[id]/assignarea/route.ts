import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
import dotenv from "dotenv";

dotenv.config();

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    let restaurantId: string | null | any = null;
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

      // Only set restaurantId if the role is "restaurant"
      if (decoded.role === "restaurant") {
        restaurantId = decoded.restaurantId;

        if (!restaurantId) {
          return NextResponse.json(
            { message: "Restaurant ID not found in token" },
            { status: 400 }
          );
        }
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    // Parse request body
    const { areas } = await req.json();

    // Validate required fields
    if (!areas || !Array.isArray(areas) || areas.length === 0) {
      return NextResponse.json(
        { message: "Invalid or missing areas array" },
        { status: 400 }
      );
    }

    // Update offer with assigned areas
    const query = restaurantId ? { _id: params.id, restaurantId } : { _id: params.id }; // Admin can update any offer
    const updatedOffer = await Offer.findOneAndUpdate(query, { areas }, { new: true });

    if (!updatedOffer) {
      return NextResponse.json(
        { message: "Offer not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Areas assigned successfully",
      offer: {
        id: updatedOffer._id.toString(),
        areas: updatedOffer.areas,
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