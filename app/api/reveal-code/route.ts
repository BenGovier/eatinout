import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkPremiumAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

function getAuthenticatedUserId(token: string | undefined): string | null {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId?: unknown;
    };
    return typeof decoded.userId === "string" && decoded.userId
      ? decoded.userId
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = getAuthenticatedUserId(cookieStore.get("auth_token")?.value);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const walletId = body?.walletId;

    if (!walletId || typeof walletId !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing walletId" },
        { status: 400 }
      );
    }

    const access = await checkPremiumAccess(userId);
    if (access.status === "unverifiable") {
      console.error("[reveal-code] Premium entitlement check failed:", access.reason);
      return NextResponse.json(
        {
          success: false,
          error: "entitlement_unverifiable",
          message: "We couldn't confirm your membership right now. Please try again shortly.",
        },
        { status: 503 }
      );
    }
    if (access.status !== "granted") {
      return NextResponse.json(
        {
          success: false,
          error: "premium_required",
          message: "This offer is for Premium members. Upgrade to Premium to use this code.",
        },
        { status: 403 }
      );
    }

    // Code expiry set to 2 minutes from now (as in original logic)
    const redeemCodeExpiry = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    // Ownership is enforced in the same statement, so a wallet belonging to
    // another user is never modified and cannot be distinguished from a missing one.
    const { data: updatedWallet, error } = await supabaseAdmin
      .from("wallets")
      .update({
        redeem_status: true,
        redeem_code_expiry: redeemCodeExpiry,
      })
      .eq("id", walletId)
      .eq("user_id", userId)
      .select("id, redeem_status, redeem_code_expiry")
      .maybeSingle();

    if (error) {
      console.error("Supabase error updating wallet redeem code:", error);
      return NextResponse.json(
        { success: false, message: "Failed to activate redeem code" },
        { status: 500 }
      );
    }

    if (!updatedWallet) {
      return NextResponse.json(
        {
          success: false,
          message: "Wallet entry not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Redeem code activated",
      redeemCodeExpiry: updatedWallet.redeem_code_expiry,
      redeemStatus: updatedWallet.redeem_status,
    });
  } catch (error) {
    console.error("Error revealing redeem code:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error during redeem process",
      },
      { status: 500 }
    );
  }
}
