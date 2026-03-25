import { NextResponse } from "next/server";
import User from "@/models/User";
import connectToDatabase from "@/lib/mongodb";
import { deleteOtpDb, getOtpDb } from "@/lib/otp-store";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { userId, newEmail, otp } = await req.json();

    const stored = await getOtpDb(newEmail);

    if (!stored || stored.expiry < Date.now())
      return NextResponse.json({ success: false, message: "OTP expired" }, { status: 400 });

    if (stored.otp !== otp)
      return NextResponse.json({ success: false, message: "Incorrect OTP" }, { status: 400 });

    await User.findByIdAndUpdate(userId, { email: newEmail });
    await deleteOtpDb(newEmail);

    return NextResponse.json({ success: true, message: "Email updated!" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
