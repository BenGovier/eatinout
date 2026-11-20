import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DB,
  type RevealResult,
  getAuthenticatedCustomer,
  getVoucherSettings,
  hasWeeklyV2CutoverBegun,
  isWeeklyLimitedOffer,
} from "@/lib/weekly-vouchers";

const REVEAL_FAILURES: Record<
  Exclude<RevealResult, "revealed" | "already_revealed">,
  { status: number; message: string }
> = {
  bad_request: { status: 400, message: "Invalid request" },
  not_found: { status: 404, message: "Wallet entry not found" },
  not_weekly_limited: { status: 409, message: "This voucher cannot be revealed here" },
  retired: { status: 410, message: "This voucher is no longer valid" },
  expired: { status: 410, message: "This voucher has expired" },
  used: { status: 409, message: "This voucher has already been used" },
};

async function revealWeeklyVoucher(walletId: string) {
  const auth = await getAuthenticatedCustomer();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, message: auth.error },
      { status: auth.status }
    );
  }

  const { data, error } = await supabaseAdmin.rpc(DB.revealFn, {
    p_wallet_id: walletId,
    p_user_id: auth.customer.userId,
  });

  if (error) {
    console.error("Error calling reveal_weekly_voucher_code:", error);
    return NextResponse.json(
      { success: false, message: "Failed to activate redeem code" },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  const result = row?.result as RevealResult | undefined;

  // already_revealed returns the stored timer so a reload cannot restart it.
  if (result === "revealed" || result === "already_revealed") {
    return NextResponse.json({
      success: true,
      code: result,
      message: "Redeem code activated",
      redeemCodeExpiry: row.code_expires_at,
      redeemStatus: true,
    });
  }
  if (result && result in REVEAL_FAILURES) {
    const { status, message } = REVEAL_FAILURES[result as keyof typeof REVEAL_FAILURES];
    return NextResponse.json({ success: false, code: result, message }, { status });
  }

  console.error("Unexpected reveal_weekly_voucher_code result:", row);
  return NextResponse.json(
    { success: false, message: "Failed to activate redeem code" },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { success: false, message: "Missing walletId" },
        { status: 400 }
      );
    }

    const { data: walletLookup, error: lookupError } = await supabaseAdmin
      .from("wallets")
      .select("id, offer_id, period_start")
      .eq("id", walletId)
      .maybeSingle();

    const { data: lookupOffer, error: offerLookupError } = walletLookup?.offer_id
      ? await supabaseAdmin
          .from("offers")
          .select("recurring_type, max_redemption_limit, is_unlimited")
          .eq("id", walletLookup.offer_id)
          .maybeSingle()
      : { data: null, error: null };

    if (lookupError || offerLookupError) {
      console.error(
        "Supabase error looking up wallet for reveal:",
        lookupError || offerLookupError
      );
      return NextResponse.json(
        { success: false, message: "Failed to activate redeem code" },
        { status: 500 }
      );
    }

    if (walletLookup && lookupOffer && isWeeklyLimitedOffer(lookupOffer)) {
      // Vouchers claimed through V2 always use the database function; legacy
      // weekly vouchers switch over at the cutover time.
      if (walletLookup.period_start) {
        return revealWeeklyVoucher(walletId);
      }
      const settings = await getVoucherSettings();
      if (!settings) {
        return NextResponse.json(
          { success: false, message: "Weekly vouchers are temporarily unavailable" },
          { status: 503 }
        );
      }
      if (hasWeeklyV2CutoverBegun(settings)) {
        return revealWeeklyVoucher(walletId);
      }
    }

    // Code expiry set to 2 minutes from now (as in original logic)
    const redeemCodeExpiry = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const { data: updatedWallet, error } = await supabaseAdmin
      .from("wallets")
      .update({
        redeem_status: true,
        redeem_code_expiry: redeemCodeExpiry,
      })
      .eq("id", walletId)
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
