import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { checkPremiumAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

type MembershipAccess = "granted" | "denied" | "unverifiable";

function respond(access: MembershipAccess, status = 200) {
  return NextResponse.json(
    { access },
    { status, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function GET() {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token || !process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  let decoded: { userId?: unknown; role?: unknown };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET) as typeof decoded;
  } catch {
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  if (typeof decoded.userId !== "string" || !decoded.userId) {
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  // Only customer accounts can redeem, mirroring POST /api/wallet.
  if (decoded.role !== "user") return respond("denied");

  const result = await checkPremiumAccess(decoded.userId);
  if (result.status === "unverifiable") {
    console.error("[membership/status] Premium entitlement check failed:", result.reason);
    return respond("unverifiable");
  }
  return respond(result.status === "granted" ? "granted" : "denied");
}
