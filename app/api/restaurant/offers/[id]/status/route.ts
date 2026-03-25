import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get the offer ID from the URL - await params first
    const { id } = await params;

    // Parse request body
    const { status } = await req.json();

    // Validate status value
    if (!["active", "inactive", "expired", "pending", "rejected"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 }
      );
    }

    // Build query based on role
    const query = { _id: id }; // Admin can update any offer

    // Find the offer
    const offer = await Offer.findOne(query);

    if (!offer) {
      return NextResponse.json({ message: "Offer not found" }, { status: 404 });
    }

    // Handle status logic
    let updatedStatus = status;
    
    // If manually setting to inactive, set deactivated flag
    if (status === "inactive") {
      offer.deactivated = true;
      updatedStatus = "inactive";
    } else if (status === "active") {
      // If reactivating, clear deactivated flag
      offer.deactivated = false;
      
      const now = new Date(); // Keep full date/time for accurate comparison
      
      // Check if start date/time is in the future
      if (offer.startDate) {
        const start = new Date(offer.startDate); // Keep full date/time including hours/minutes
        
        // If start date/time is in the future, cannot activate
        if (start > now) {
          return NextResponse.json(
            { 
              message: "Cannot activate offer with future start date/time. The offer will be automatically activated on the start date/time.",
              success: false 
            },
            { status: 400 }
          );
        }
      }
      
      // Check if expiry date/time is in the past - cannot activate expired offers
      if (offer.expiryDate && !offer.runUntilFurther) {
        const expiry = new Date(offer.expiryDate); // Keep full date/time including hours/minutes
        
        if (expiry < now) {
          return NextResponse.json(
            { 
              message: "This offer has expired. Please update the end date to activate it.",
              success: false 
            },
            { status: 400 }
          );
        }
      }
      
      // All checks passed - can activate
      updatedStatus = "active";
    }

    // Allow admin to directly set the status to "rejected"
    if (status === "rejected" && !restaurantId) {
      updatedStatus = "rejected";
    }

    // No pending status - map pending to inactive and recalculate based on dates
    if (offer.status === "pending" && status !== "rejected") {
      // Recalculate status based on dates/times instead of keeping pending
      const now = new Date(); // Keep full date/time for accurate comparison
      
      if (offer.startDate) {
        const start = new Date(offer.startDate); // Keep full date/time including hours/minutes
        
        if (start > now) {
          updatedStatus = "inactive";
        } else {
          if (offer.expiryDate && !offer.runUntilFurther) {
            const expiry = new Date(offer.expiryDate); // Keep full date/time including hours/minutes
            updatedStatus = expiry < now ? "expired" : "active";
          } else {
            updatedStatus = "active";
          }
        }
      } else {
        updatedStatus = "inactive";
      }
    }

    // Update the offer status
    offer.status = updatedStatus;
    
    await offer.save();

    return NextResponse.json({
      success: true,
      message: `Offer status updated to ${updatedStatus} successfully`,
      offer: {
        id: offer._id.toString(),
        status: offer.status,
      },
    });
  } catch (error: any) {
    console.error("Update offer status error:", error);
    return NextResponse.json(
      { message: "Failed to update offer status", error: error.message },
      { status: 500 }
    );
  }
}