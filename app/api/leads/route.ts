import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Lead from "@/models/Lead";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const requestBody = await req.json();
    const { firstName, lastName, email, mobile } = requestBody;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert lead: if it exists by email, update it. If not, create it.
    // If it's already converted, we don't need to revert it back to false, 
    // but typically a user who converted wouldn't hit this, or if they did, they are re-signing up.
    // We'll let it just update the fields.
    const lead = await Lead.findOneAndUpdate(
      { email },
      { 
        $set: { 
          firstName, 
          lastName, 
          mobile: mobile || null 
        } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Lead captured successfully",
      lead
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error capturing lead:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to capture lead",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
