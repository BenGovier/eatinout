import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteOtpDb, getOtpDb } from "@/lib/otp-store";

export async function POST(req: Request) {
  try {
    const { userId, newEmail, otp } = await req.json();

    const stored = await getOtpDb(newEmail);

    if (!stored || stored.expiry < Date.now())
      return NextResponse.json({ success: false, message: "OTP expired" }, { status: 400 });

    if (stored.otp !== otp)
      return NextResponse.json({ success: false, message: "Incorrect OTP" }, { status: 400 });

    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateErr) {
      console.error("Error updating user email:", updateErr);
      return NextResponse.json({ success: false, message: "Failed to update email" }, { status: 500 });
    }

    await deleteOtpDb(newEmail);

    return NextResponse.json({ success: true, message: "Email updated!" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
