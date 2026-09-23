import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { valid: false, message: "Voucher code is required" },
        { status: 400 }
      );
    }

    const promo = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
    });

    if (promo.data.length === 0) {
      return NextResponse.json({ valid: false, message: "Invalid or expired code" });
    }

    const coupon = promo.data[0].coupon;
    const label = coupon.percent_off
      ? `${coupon.percent_off}% off`
      : coupon.amount_off
      ? `${(coupon.amount_off / 100).toFixed(2)} off`
      : "Discount applied";

    return NextResponse.json({ valid: true, label });
  } catch (error: any) {
    console.error("Error validating voucher:", error);
    return NextResponse.json(
      { valid: false, message: "Could not validate code" },
      { status: 500 }
    );
  }
}