import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { success: false, message: "Missing walletId" },
        { status: 400 }
      );
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
