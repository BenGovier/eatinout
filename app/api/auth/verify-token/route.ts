import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import User from "@/models/User";
import connectToDatabase from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: Request) {
  try {
    // Retrieve the token directly from cookies
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: "Authorization token is missing or invalid",
      });
    }

    // Verify the token
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Connect to database and get user details
    await connectToDatabase();
    const user = await User.findById(decoded.userId).select('subscriptionStatus role email firstName lastName');

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      });
    }

    // Return decoded token data along with subscription status
    return NextResponse.json({
      success: true,
      message: "Token is valid",
      user: {
        ...decoded,
        subscriptionStatus: user.subscriptionStatus,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json({
      success: false,
      error: "Unable to verify token. Please try again.",
    });
  }
}
