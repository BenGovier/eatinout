import { NextResponse } from "next/server";
import twilio from "twilio";
import { setOtpDb } from "@/lib/otp-store";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

const OTP_EXPIRY_TIME = 2 * 60 * 1000; // 2 minutes

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid or missing phone number" },
        { status: 400 }
      );
    }

    const otpToSend = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + OTP_EXPIRY_TIME;

    // Save OTP to Supabase otps table
    await setOtpDb({ phone, otp: otpToSend, expiry });

    // Try to send SMS using Twilio if configured
    if (client && twilioPhone) {
      try {
        await client.messages.create({
          body: `Your verification code is: ${otpToSend}`,
          from: twilioPhone,
          to: phone,
        });
      } catch (twilioError: any) {
        console.error("Twilio Error:", twilioError?.message || twilioError);

        if (twilioError.code === 21211) {
          // Invalid 'To' phone number
          return NextResponse.json(
            { success: false, message: "Invalid phone number format" },
            { status: 400 }
          );
        }

        if (twilioError.code === 21606) {
          // Permission to send SMS to this number not enabled
          return NextResponse.json(
            {
              success: false,
              message:
                "Permission to send SMS to this number is not enabled in your Twilio account",
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { success: false, message: "Failed to send SMS via Twilio" },
          { status: 502 }
        );
      }
    } else {
      console.warn("Twilio credentials not fully configured; OTP stored in DB only.");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in send-otp API:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
