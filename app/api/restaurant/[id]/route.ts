import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Offer from "@/models/Offer";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
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
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch the restaurant by ID
    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Return the restaurant data
    return NextResponse.json({ success: true, data: restaurant });
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

export async function DELETE(request: Request) {
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
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    const url = new URL(request.url);
    const restaurantId = url.pathname.split("/").pop();

    if (!restaurantId) {
      return NextResponse.json(
        { message: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    // Delete all offers associated with the restaurant
    await Offer.deleteMany({ restaurantId: restaurantId });

    // Delete the restaurant
    const deletedRestaurant = await Restaurant.findByIdAndDelete(restaurantId);

    if (!deletedRestaurant) {
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