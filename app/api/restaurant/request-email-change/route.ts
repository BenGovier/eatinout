import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import User from "@/models/User";
import connectToDatabase from "@/lib/mongodb";
import { setOtpDb } from "@/lib/otp-store";

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const { newEmail, userId } = await req.json();

        if (!newEmail) {
            return NextResponse.json({ success: false, message: "newEmail missing" }, { status: 400 });
        }

        const existing = await User.findOne({ email: newEmail });
        if (existing) return NextResponse.json({ success: false, message: "Email already exists" }, { status: 400 });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 5 * 60 * 1000;

        // Save OTP in MongoDB
        await setOtpDb({ email: newEmail, otp, expiry });

        const transporter = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false,
            auth: { user: "Info@eatinout.com", pass: "ChopsY123!" },
            tls: { ciphers: "SSLv3" },
        });

        await transporter.sendMail({
            from: '"EatinOut Info" <Info@eatinout.com>',
            to: newEmail,
            subject: "OTP Verification",
            html: `
  <div style="font-family: 'Arial', sans-serif; background-color: #f9fafb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <h2 style="color: #111827; margin-bottom: 10px;">Verify Your Email</h2>
      <p style="color: #6b7280; font-size: 16px; margin-bottom: 20px;">
        Enter the following OTP to confirm your email address:
      </p>
      <div style="font-size: 28px; letter-spacing: 5px; font-weight: bold; color: #2563eb; margin-bottom: 30px;">
        ${otp}
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        This OTP is valid for 5 minutes.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        If you did not request this, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} EatinOut. All rights reserved.</p>
    </div>
  </div>
  `,
        });

        return NextResponse.json({ success: true, message: "OTP sent" });
    } catch (err: any) {
        console.error("🔥 SERVER ERROR:", err);
        return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
    }
}