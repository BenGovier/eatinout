import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { email, priceId, referral, voucherCode } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure the user has a Stripe customer (should already exist from
    // registration, but create one here as a fallback).
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user._id.toString() },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const hasSubscribedBefore = user.hasSubscribedBefore ?? false;
    const rewardfulReferral = referral || user.rewardfulReferral;
    const defaultPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    const selectedPriceId = priceId || user.selectedPriceId || defaultPriceId;

    if (!selectedPriceId) {
      return NextResponse.json({ error: "No valid price ID found" }, { status: 400 });
    }

    // Resolve voucher code to a Stripe promotion code, if provided
    let promotionCodeId: string | undefined;
    if (voucherCode) {
      const promo = await stripe.promotionCodes.list({
        code: voucherCode,
        active: true,
        limit: 1,
      });
      if (promo.data.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired voucher code" },
          { status: 400 }
        );
      }
      promotionCodeId = promo.data[0].id;
    }

    // IMPORTANT: reuse an existing incomplete/trialing subscription instead
    // of creating a new one every time this route is called (initial page
    // load AND every voucher apply/reapply). Creating a fresh subscription
    // each time left orphaned subscriptions on Stripe and caused their
    // 'customer.subscription.created' webhook events to race each other —
    // whichever event happened to be processed last could silently
    // overwrite the user's saved voucher code. Updating the same
    // subscription in place fixes that.
    let existingSub: Stripe.Subscription | undefined;

    const incompleteList = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "incomplete",
      limit: 1,
    });
    existingSub = incompleteList.data[0];

    if (!existingSub) {
      const trialingList = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "trialing",
        limit: 1,
      });
      existingSub = trialingList.data[0];
    }

    let subscription: Stripe.Subscription;

    if (existingSub) {
      subscription = await stripe.subscriptions.update(existingSub.id, {
        items: [
          {
            id: existingSub.items.data[0].id,
            price: selectedPriceId,
          },
        ],
        ...(promotionCodeId
          ? { discounts: [{ promotion_code: promotionCodeId }] }
          : { discounts: [] }),
        payment_settings: {
          save_default_payment_method: "on_subscription",
          payment_method_types: ["card"],
        },
        metadata: {
          ...(rewardfulReferral ? { rewardful_referral: rewardfulReferral } : {}),
        },
        expand: ["pending_setup_intent", "latest_invoice.payment_intent", "items.data.price"],
      });
    } else {
      subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: selectedPriceId }],
        ...(hasSubscribedBefore ? {} : { trial_period_days: 30 }),
        ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
          // Restrict to card only — matches the approved design (Apple Pay /
          // Google Pay buttons are shown as static placeholders for now, and
          // we don't want Stripe silently offering Klarna, Cash App, Link, etc.
          payment_method_types: ["card"],
        },
        ...(hasSubscribedBefore
          ? {}
          : { trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }),
        metadata: {
          ...(rewardfulReferral ? { rewardful_referral: rewardfulReferral } : {}),
        },
        expand: ["pending_setup_intent", "latest_invoice.payment_intent", "items.data.price"],
      });
    }

    // For trialing subscriptions Stripe creates a SetupIntent
    // (pending_setup_intent) which does NOT automatically inherit the
    // payment_method_types restriction above — restrict it explicitly too.
    if (subscription.pending_setup_intent) {
      const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent;
      await stripe.setupIntents.update(setupIntent.id, {
        payment_method_types: ["card"],
      });
    }

    // Persist the chosen plan / referral so the webhook can use it later
    await User.updateOne(
      { email },
      {
        selectedPriceId,
        rewardfulReferral: rewardfulReferral || null,
      }
    );

    const clientSecret =
      (subscription.pending_setup_intent as any)?.client_secret ??
      (subscription.latest_invoice as any)?.payment_intent?.client_secret;

    if (!clientSecret) {
      console.error("No client secret returned from subscription:", subscription.id);
      return NextResponse.json(
        { error: "Could not initialize payment" },
        { status: 500 }
      );
    }

    // Work out the base price and, if a voucher was applied, the
    // discounted price — so the frontend can show the real "after trial"
    // amount instead of a hardcoded number.
    const priceObj = subscription.items.data[0]?.price as Stripe.Price | undefined;
    const baseAmount = priceObj?.unit_amount ?? 0; // in minor units (pence)
    const currency = priceObj?.currency ?? "gbp";
    const interval = priceObj?.recurring?.interval ?? "month";
    const intervalCount = priceObj?.recurring?.interval_count ?? 1;

    let discountedAmount = baseAmount;
    let discountLabel: string | null = null;

    if (promotionCodeId) {
      try {
        const promo = await stripe.promotionCodes.retrieve(promotionCodeId, {
          expand: ["coupon"],
        });
        const coupon = promo.coupon;
        if (coupon.percent_off) {
          discountedAmount = Math.round(baseAmount * (1 - coupon.percent_off / 100));
          discountLabel = `${coupon.percent_off}% off`;
        } else if (coupon.amount_off) {
          discountedAmount = Math.max(0, baseAmount - coupon.amount_off);
          discountLabel = `${(coupon.amount_off / 100).toFixed(2)} off`;
        }
      } catch (promoErr) {
        console.error("Error retrieving promotion code for pricing display:", promoErr);
      }
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      mode: subscription.pending_setup_intent ? "setup" : "payment",
      pricing: {
        baseAmount,
        discountedAmount,
        currency,
        interval,
        intervalCount,
        discountLabel,
      },
    });
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}