import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { render } from "@react-email/render";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import sendEmail from "@/lib/sendEmail";
import AccountDeletionRequestEmail from "@/utils/email-templates/AccountDeletionRequestEmail";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST() {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Missing auth token" },
        { status: 401 }
      );
    }

    let userId: string | null = null;
    let emailFromToken: string | null = null;

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      userId = decoded?.userId || null;
      emailFromToken = decoded?.email || null;
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    let user = null;
    if (userId) {
      user = await User.findById(userId).select(
        "firstName lastName email _id"
      );
    }

    if (!user && emailFromToken) {
      user = await User.findOne({ email: emailFromToken }).select(
        "firstName lastName email _id"
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const html = await render(
      AccountDeletionRequestEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        requestDate: new Date().toISOString(),
        userId: user._id.toString(),
      })
    );

    await sendEmail(
      "info@eatinout.com",
      "Account Deletion Request",
      html
    );

    return NextResponse.json({ success: true, message: "Deletion request submitted" });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit deletion request" },
      { status: 500 }
    );
  }
}
