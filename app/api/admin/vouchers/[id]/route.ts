// app/api/admin/vouchers/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Supabase row -> same shape the Mongoose voucher had (so the code below stays unchanged)
function toLegacyVoucher(r: any) {
  if (!r) return r;
  const iso = (v: any) => (v ? new Date(v).toISOString() : v);
  const expiryDate = iso(r.expiry_date);
  return {
    _id: r.id,
    code: r.code,
    discountType: r.discount_type,
    discountValue: r.discount_value,
    maxUses: r.max_uses,
    currentUses: r.current_uses,
    expiryDate,
    validityDays: r.validity_days,
    isActive: r.is_active,
    description: r.description,
    stripeCouponId: r.stripe_coupon_id,
    stripeCouponName: r.stripe_coupon_name,
    stripePromotionCodeId: r.stripe_promotion_code_id,
    duration: r.duration,
    durationInMonths: r.duration_in_months,
    calculatedPercentOff: r.calculated_percent_off,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    // virtual: expiryDate if set, otherwise createdAt + validityDays days, otherwise null
    resolvedExpiry: expiryDate
      ? expiryDate
      : r.validity_days
        ? new Date(new Date(r.created_at).getTime() + r.validity_days * 24 * 60 * 60 * 1000).toISOString()
        : null,
  };
}

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

    const body = await req.json();
    const { isActive } = body;

    const { data: voucherRow, error: voucherError } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (voucherError) throw new Error(voucherError.message);
    const voucher = toLegacyVoucher(voucherRow);
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

    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("vouchers")
      .update({ is_active: isActive })
      .eq("id", params.id)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);
    const updatedVoucher = toLegacyVoucher(updatedRow);

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

    const { data: voucherRow, error: voucherError } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (voucherError) throw new Error(voucherError.message);
    const voucher = toLegacyVoucher(voucherRow);
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
    const { error: deleteError } = await supabaseAdmin
      .from("vouchers")
      .delete()
      .eq("id", params.id);
    if (deleteError) throw new Error(deleteError.message);
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