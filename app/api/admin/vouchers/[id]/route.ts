import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Voucher from "@/models/Voucher";
import { verifyAdminToken } from "@/lib/auth-admin";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { message: adminCheck.message },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { isActive } = body;

    const voucher = await Voucher.findById(params.id);
    if (!voucher) {
      return NextResponse.json(
        { success: false, message: "Voucher not found" },
        { status: 404 }
      );
    }

    // Sync active status with Stripe promotion code
    if (voucher.stripePromotionCodeId) {
      try {
        await stripe.promotionCodes.update(voucher.stripePromotionCodeId, {
          active: isActive,
        });
      } catch (err: any) {
        console.error(`Failed to update Stripe promotion code:`, err.message);
        // Non-fatal: continue to update DB
      }
    }

    const updatedVoucher = await Voucher.findByIdAndUpdate(
      params.id,
      { isActive },
      { new: true }
    );

    return NextResponse.json({ success: true, voucher: updatedVoucher });
  } catch (error: any) {
    console.error("Error updating voucher:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update voucher" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { message: adminCheck.message },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const voucher = await Voucher.findById(params.id);
    if (!voucher) {
      return NextResponse.json(
        { success: false, message: "Voucher not found" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Attempting to delete voucher: ${voucher.code}`);
    console.log(`   Promo Code ID: ${voucher.stripePromotionCodeId || 'N/A'}`);
    console.log(`   Coupon ID: ${voucher.stripeCouponId || 'N/A'}`);

    let stripeErrors = [];

    // Deactivate Stripe promotion code first (cannot be deleted, only deactivated)
    if (voucher.stripePromotionCodeId) {
      try {
        await stripe.promotionCodes.update(voucher.stripePromotionCodeId, {
          active: false,
        });
        console.log(`✅ Promotion code deactivated: ${voucher.stripePromotionCodeId}`);
      } catch (err: any) {
        console.error(`❌ Failed to deactivate promotion code:`, err.message);
        stripeErrors.push(`Promotion code: ${err.message}`);
      }
    }

    // Delete Stripe coupon
    if (voucher.stripeCouponId) {
      try {
        const deleted = await stripe.coupons.del(voucher.stripeCouponId);
        if (deleted.deleted) {
          console.log(`✅ Coupon deleted: ${voucher.stripeCouponId}`);
        }
      } catch (err: any) {
        console.error(`❌ Failed to delete coupon:`, err.message);
        stripeErrors.push(`Coupon: ${err.message}`);
      }
    }

    // Delete from database
    await Voucher.findByIdAndDelete(params.id);
    console.log(`✅ Voucher removed from database`);

    // Return with warning if Stripe had issues
    if (stripeErrors.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Voucher deleted from database. Stripe warnings: ${stripeErrors.join(', ')}`,
        warning: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Voucher and Stripe data deleted successfully",
    });

  } catch (error: any) {
    console.error("❌ Error deleting voucher:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete voucher" },
      { status: 500 }
    );
  }
}
