// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import supabaseAdmin from "@/lib/supabase/admin";
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

    // Emails are stored lowercase (old User model used lowercase: true)
    const normalizedEmail = String(email).toLowerCase();
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, first_name")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    const user = userRow && { _id: userRow.id, firstName: userRow.first_name };

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Generate reset token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update without validation
    const { error: tokenSaveError } = await supabaseAdmin
      .from("users")
      .update({
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires.toISOString(),
      })
      .eq("email", normalizedEmail);
    if (tokenSaveError) throw new Error(tokenSaveError.message);

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

    // Find user with a valid token
    console.log("Finding user with reset token");
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, reset_token_expires")
      .eq("reset_token", token)
      .limit(1)
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    const user = userRow && {
      _id: userRow.id,
      resetTokenExpires: userRow.reset_token_expires,
    };
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
    const { error: passwordUpdateError } = await supabaseAdmin
      .from("users")
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
      })
      .eq("id", user._id);
    if (passwordUpdateError) throw new Error(passwordUpdateError.message);
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