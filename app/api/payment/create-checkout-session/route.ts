// api/payment/create-checkout-session/route.ts
import supabaseAdmin from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { email, priceId, referral } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("has_subscribed_before, rewardful_referral, selected_price_id")
      .eq("email", String(email).toLowerCase())
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    const user = userRow && {
      hasSubscribedBefore: userRow.has_subscribed_before,
      rewardfulReferral: userRow.rewardful_referral,
      selectedPriceId: userRow.selected_price_id,
    };
    const hasSubscribedBefore = user?.hasSubscribedBefore ?? false;

    // Get referral ID from request or user record
    const rewardfulReferral = referral || user?.rewardfulReferral;

    // Log referral for debugging
    if (rewardfulReferral) {
      console.log('✅ Rewardful referral for Stripe checkout:', rewardfulReferral);
      console.log('   Source:', referral ? 'request' : 'user record');
    } else {
      console.log('ℹ️ No Rewardful referral for this checkout');
    }

    // Prioritize order of price ID selection
    const defaultPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID; // Original £4.99 price ID
    const selectedPriceId = priceId || user?.selectedPriceId || defaultPriceId;

    if (!selectedPriceId) {
      return NextResponse.json({ error: "No valid price ID found" }, { status: 400 });
    }

    // Create a Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      subscription_data: {
        // 30-day free trial for first-time subscribers
        ...(hasSubscribedBefore ? {} : { trial_period_days: 30 }),
        // Add Rewardful referral to subscription metadata for conversion tracking
        ...(rewardfulReferral ? {
          metadata: {
            rewardful_referral: rewardfulReferral
          }
        } : {}),
      },
      // Also add to session metadata for Rewardful webhook processing
      ...(rewardfulReferral ? {
        metadata: {
          rewardful_referral: rewardfulReferral
        }
      } : {}),
      success_url: `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/restaurants`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating Stripe Checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Checkout session" },
      { status: 500 }
    );
  }
}