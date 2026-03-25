import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Wallet } from "@/models/Wallet";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json({ success: false, message: "Missing walletId" }, { status: 400 });
    }

    const walletObjectId = new mongoose.Types.ObjectId(walletId);
    const redeemCodeExpiry = new Date(Date.now() + 1 * 60 * 1000); // 2 minutes from now

    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: walletId },
      {
        redeemStatus: true,
        redeemCodeExpiry,
      },
      { new: true }
    );

    if (!updatedWallet) {
      return NextResponse.json({
        success: false,
        message: "Wallet entry not found",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Redeem code activated",
      redeemCodeExpiry: updatedWallet.redeemCodeExpiry,
      redeemStatus: updatedWallet.redeemStatus,
    });
  } catch (error) {
    console.error("Error revealing redeem code:", error);
    return NextResponse.json({
      success: false,
      message: "Server error during redeem process",
    }, { status: 500 });
  }
}
