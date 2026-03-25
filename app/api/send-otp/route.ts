import { NextResponse } from "next/server";
import twilio from "twilio";
import connectToDatabase from "@/lib/mongodb";
import { Otp } from "@/models/Otp";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER!;
const client = twilio(accountSid, authToken);

const OTP_EXPIRY_TIME = 2 * 60 * 1000; // 1 minute

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const { phone } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid or missing phone number" },
        { status: 400 }
      );
    }

    const otpToSend = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + OTP_EXPIRY_TIME;

    const existingOtp = await Otp.findOne({ phone });

    if (existingOtp) {
      await Otp.updateOne({ phone }, { otp: otpToSend, expiry });
    } else {
      await Otp.create({ phone, otp: otpToSend, expiry });
    }

    // Try to send SMS using Twilio
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
        { status: 502 } // Bad Gateway (Twilio external failure)
      );
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
