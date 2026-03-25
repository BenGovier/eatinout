import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(req: NextRequest) {
  try {
    console.log("Starting user registration process");

    // Connect to database
    try {
      await connectToDatabase();
      console.log("Connected to database for registration");
    } catch (dbError: any) {
      console.error("Database connection error during registration:", dbError);
      return NextResponse.json(
        {
          success: false,
          message: "Database connection failed",
          error: dbError.message,
        },
        { status: 500 }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Parsed request body:", {
        ...requestBody,
        password: "[REDACTED]",
      });
    } catch (parseError: any) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          error: parseError.message,
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password, mobile, selectedPriceId, referral, zipCode } = requestBody;

    // Log referral for debugging
    if (referral) {
      console.log('✅ Rewardful referral received in registration:', referral);
    } else {
      console.log('ℹ️ No Rewardful referral in registration request');
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !zipCode) {
      console.error("Missing required fields");
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log("User already exists:", email);
        return NextResponse.json(
          { success: false, message: "User already exists" },
          { status: 400 }
        );
      }
    } catch (findError: any) {
      console.error("Error checking for existing user:", findError);
      return NextResponse.json(
        {
          success: false,
          message: "Error checking for existing user",
          error: findError.message,
        },
        { status: 500 }
      );
    }

    // Create new user
    let user;
    try {
      user = new User({
        firstName,
        lastName,
        email,
        password,
        mobile,
        zipCode,
        role: "user",
        // Store selected price ID for reference
        selectedPriceId: selectedPriceId || null,
        // Store Rewardful referral ID for affiliate tracking
        rewardfulReferral: referral || null,
      });

      await user.save();
      console.log("User created successfully:", user._id);
    } catch (saveError: any) {
      console.error("Error saving user:", saveError);
      return NextResponse.json(
        {
          success: false,
          message: "Error creating user",
          error: saveError.message,
        },
        { status: 500 }
      );
    }

    // Create JWT token
    let token;
    try {
      token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "365d" }
      );
      console.log("JWT token created");
    } catch (tokenError: any) {
      console.error("Error creating JWT token:", tokenError);
      return NextResponse.json(
        {
          success: false,
          message: "Error creating authentication token",
          error: tokenError.message,
        },
        { status: 500 }
      );
    }

    // Note: Welcome email will be sent after successful subscription verification
    // This ensures emails are only sent after payment is confirmed

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          zipCode: user.zipCode,
        },
      },
      { status: 201 }
    );

    // Set the cookie
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 365 days
    });

    console.log("Registration completed successfully");
    return response;
  } catch (error: any) {
    console.error("Unhandled registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Registration failed",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
