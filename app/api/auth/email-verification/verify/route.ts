// api/auth/email-verification/verify/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  VerificationUnavailableError,
  normalizeEmail,
  verifyRegistrationCode,
} from "@/lib/email-verification";

const noStore = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  let body: { email?: unknown; code?: unknown } | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!email || !code) {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  try {
    const result = await verifyRegistrationCode({ email, code });

    switch (result.status) {
      case "verified":
        return NextResponse.json(
          {
            success: true,
            verificationPass: result.verificationPass,
            passExpiresInSeconds: result.passExpiresInSeconds,
          },
          { headers: noStore }
        );
      case "invalid_code":
        return NextResponse.json(
          {
            success: false,
            error: "invalid_code",
            message: "That code isn't right. Please check and try again.",
            attemptsRemaining: result.attemptsRemaining,
          },
          { status: 400, headers: noStore }
        );
      case "expired":
        return NextResponse.json(
          { success: false, error: "expired", message: "This code has expired. Please request a new one." },
          { status: 400, headers: noStore }
        );
      case "too_many_attempts":
        return NextResponse.json(
          { success: false, error: "too_many_attempts", message: "Too many incorrect attempts. Please request a new code." },
          { status: 429, headers: noStore }
        );
      case "conflict":
        return NextResponse.json(
          { success: false, error: "conflict", message: "Please try entering your code again." },
          { status: 409, headers: noStore }
        );
      default:
        return NextResponse.json(
          { success: false, error: "expired", message: "This code is no longer valid. Please request a new one." },
          { status: 400, headers: noStore }
        );
    }
  } catch (error) {
    if (error instanceof VerificationUnavailableError) {
      console.error("Email verification is not configured");
      return NextResponse.json(
        { success: false, error: "unavailable", message: "Email verification is temporarily unavailable." },
        { status: 503 }
      );
    }
    console.error("Email verification check failed:", (error as Error)?.message);
    return NextResponse.json(
      { success: false, error: "server_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
