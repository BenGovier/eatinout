import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import User from "@/models/User"; // Import the User model
import connectToDatabase from "@/lib/mongodb";

// Get user profile details
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

    // Decode token to get userId
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    await connectToDatabase(); // Connect to the database

    // Fetch user details from the database
    const user = await User.findById(userId).select("-password"); // Exclude the password field

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Update user profile details
export async function PUT(request: NextRequest) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token required' },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string };

    const userId = decodedToken.userId;

    await connectToDatabase();

    const updatedProfile = await request.json();

    // Validate required fields
    const { firstName, lastName, email, mobile } = updatedProfile;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, email, and mobile are required.' },
        { status: 400 }
      );
    }

    // Dynamically update only provided fields, including adding 'mobile' if missing
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          email: updatedProfile.email,
          mobile: updatedProfile.mobile, // Should be added here
          zipCode: updatedProfile.zipCode,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select('-password'); // Exclude sensitive fields

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}