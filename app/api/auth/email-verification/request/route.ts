// api/auth/email-verification/request/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  VerificationUnavailableError,
  getClientIp,
  normalizeEmail,
  requestRegistrationCode,
} from "@/lib/email-verification";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  const email = normalizeEmail((body as { email?: unknown } | null)?.email);
  if (!email) {
    return NextResponse.json(
      { success: false, error: "invalid_email", message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    const result = await requestRegistrationCode({
      email,
      ip: getClientIp(req),
      origin: req.nextUrl.origin,
    });

    if (result.status === "rate_limited") {
      return NextResponse.json(
        {
          success: false,
          error: "rate_limited",
          message: "Please wait before requesting another code.",
          retryAfterSeconds: result.retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }

    return NextResponse.json({
      success: true,
      message: "If this email can be used, we've sent it a 6-digit code.",
      cooldownSeconds: result.cooldownSeconds,
    });
  } catch (error) {
    if (error instanceof VerificationUnavailableError) {
      console.error("Email verification is not configured");
      return NextResponse.json(
        { success: false, error: "unavailable", message: "Email verification is temporarily unavailable." },
        { status: 503 }
      );
    }
    console.error("Email verification request failed:", (error as Error)?.message);
    return NextResponse.json(
      { success: false, error: "send_failed", message: "We couldn't send a code right now. Please try again." },
      { status: 502 }
    );
  }
}
