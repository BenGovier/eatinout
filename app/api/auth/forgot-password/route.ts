import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import User from "@/models/User";
import connectToDatabase from "@/lib/mongodb";
import sendEmail from "@/lib/sendEmail";
import PasswordResetEmail from "@/utils/email-templates/password-reset";
import { render } from "@react-email/render";

dotenv.config();
let client;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Generate reset token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update without validation
    await User.findOneAndUpdate(
      { email },
      { resetToken, resetTokenExpires },
      { new: true }
    );

    // Generate reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/forgot-password?token=${resetToken}`;

    // Render & send email
    const emailHtml = await render(
      PasswordResetEmail({
        firstName: user.firstName,
        resetLink: resetUrl,
        expiryTime: "1 hour",
      })
    );

    await sendEmail(email, "Password Reset Request", emailHtml);

    return NextResponse.json(
      { message: "Reset link sent to your email" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    console.log("Starting password reset process");
    const { token, newPassword } = await req.json();
    console.log("Received token and new password");

    if (!token || !newPassword) {
      console.log("Missing token or new password");
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    console.log("Connecting to database");
    await connectToDatabase();

    // Find user with a valid token
    console.log("Finding user with reset token");
    const user = await User.findOne({
      resetToken: token,
    });
    console.log("User found:", user);

    if (
      !user ||
      !user.resetTokenExpires ||
      new Date(user.resetTokenExpires) < new Date()
    ) {
      console.log("Token validation failed - invalid or expired");
      return NextResponse.json(
        { message: "Token is invalid or expired" },
        { status: 400 }
      );
    }

    // Verify token
    console.log("Verifying token authenticity");

    // Hash new password
    console.log("Hashing new password");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("Password hashed successfully");

    // Update user password and remove token
    console.log("Updating user password and removing reset token");
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: "", resetTokenExpires: "" },
      }
    );
    console.log("User password updated successfully");

    console.log("Password reset completed successfully");
    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error during password reset:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
