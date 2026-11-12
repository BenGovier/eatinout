// api/payment/create-subscription/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import supabaseAdmin from "@/lib/supabase/admin";
import { TRIAL_SETUP_PURPOSE, findConfirmedSubscription, stripeIdOf } from "@/lib/start-trial";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const CUSTOMER_MEMBERSHIP_PRICE_IDS = new Set(
  [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS_DISCOUNT,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR_DISCOUNT,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_18MONTHS,
  ].filter((id): id is string => typeof id === "string" && id.length > 0)
);

const RESTAURANT_PRICE_IDS = new Set(
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_RESTURENT_1MONTH].filter(
    (id): id is string => typeof id === "string" && id.length > 0
  )
);

const PRICE_ID_PATTERN = /^price_[A-Za-z0-9]{1,250}$/;

// The "after trial" / "charged today" amount shown on checkout, in minor units.
function buildPricing(priceObj: Stripe.Price | undefined, promoCoupon: Stripe.Coupon | undefined) {
  const baseAmount = priceObj?.unit_amount ?? 0;
  const currency = priceObj?.currency ?? "gbp";
  const interval = priceObj?.recurring?.interval ?? "month";
  const intervalCount = priceObj?.recurring?.interval_count ?? 1;

  let discountedAmount = baseAmount;
  let discountLabel: string | null = null;
  if (promoCoupon) {
    if (promoCoupon.percent_off) {
      discountedAmount = Math.round(baseAmount * (1 - promoCoupon.percent_off / 100));
      discountLabel = `${promoCoupon.percent_off}% off`;
    } else if (promoCoupon.amount_off) {
      discountedAmount = Math.max(0, baseAmount - promoCoupon.amount_off);
      discountLabel = `${(promoCoupon.amount_off / 100).toFixed(2)} off`;
    }
  }
  return { baseAmount, discountedAmount, currency, interval, intervalCount, discountLabel };
}

const REUSABLE_SETUP_STATUSES = new Set(["requires_payment_method", "requires_confirmation"]);

/**
 * First-time trial checkout: collect the card on a tagged SetupIntent only.
 * No subscription exists until the card is confirmed, when
 * lib/start-trial.ts creates the 30-day trial from the SetupIntent's metadata.
 */
async function startTrialCheckout({
  userId,
  stripeCustomerId,
  selectedPriceId,
  promotionCodeId,
  promoCoupon,
  rewardfulReferral,
}: {
  userId: string;
  stripeCustomerId: string;
  selectedPriceId: string;
  promotionCodeId: string | undefined;
  promoCoupon: Stripe.Coupon | undefined;
  rewardfulReferral: string | null | undefined;
}) {
  const metadata = {
    purpose: TRIAL_SETUP_PURPOSE,
    user_id: userId,
    price_id: selectedPriceId,
    promotion_code_id: promotionCodeId ?? "",
    rewardful_referral: rewardfulReferral ?? "",
  };

  const [setupIntents, price] = await Promise.all([
    stripe.setupIntents.list({ customer: stripeCustomerId, limit: 20 }),
    stripe.prices.retrieve(selectedPriceId),
  ]);
  const reusable = setupIntents.data.find(
    (si) =>
      si.metadata?.purpose === TRIAL_SETUP_PURPOSE &&
      stripeIdOf(si.customer as any) === stripeCustomerId &&
      REUSABLE_SETUP_STATUSES.has(si.status)
  );

  const setupIntent = reusable
    ? await stripe.setupIntents.update(reusable.id, { metadata, payment_method_types: ["card"] })
    : await stripe.setupIntents.create({
        customer: stripeCustomerId,
        usage: "off_session",
        payment_method_types: ["card"],
        metadata,
      });

  const { error: saveError } = await supabaseAdmin
    .from("users")
    .update({ selected_price_id: selectedPriceId, rewardful_referral: rewardfulReferral || null })
    .eq("id", userId);
  if (saveError) throw new Error(saveError.message);

  if (!setupIntent.client_secret) {
    console.error("No client secret returned from setup intent:", setupIntent.id);
    return NextResponse.json({ error: "Could not initialize payment" }, { status: 500 });
  }

  return NextResponse.json({
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
    subscriptionId: null,
    mode: "setup",
    pricing: buildPricing(price, promoCoupon),
  });
}

// A price outside the current membership list is accepted only if this same
// Stripe customer has already been billed on it (a grandfathered plan).
async function customerHasHadPrice(stripeCustomerId: string, priceId: string): Promise<boolean> {
  for await (const sub of stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
  })) {
    if (stripeIdOf(sub.customer) !== stripeCustomerId) continue;
    if (sub.items.data.some((item) => item.price?.id === priceId)) return true;
  }
  return false;
}

async function isAllowedPriceForCustomer(
  priceId: string,
  stripeCustomerId: string | null | undefined
): Promise<boolean> {
  if (!PRICE_ID_PATTERN.test(priceId)) return false;
  if (RESTAURANT_PRICE_IDS.has(priceId)) return false;
  if (CUSTOMER_MEMBERSHIP_PRICE_IDS.has(priceId)) return true;
  if (!stripeCustomerId) return false;
  return customerHasHadPrice(stripeCustomerId, priceId);
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let authenticatedUserId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId?: unknown };
      if (typeof decoded?.userId !== "string" || !decoded.userId) throw new Error("missing userId");
      authenticatedUserId = decoded.userId;
    } catch {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    let body: { email?: unknown; priceId?: unknown; referral?: unknown; voucherCode?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { email, priceId, referral, voucherCode } = body ?? {};

    if (priceId !== undefined && priceId !== null && typeof priceId !== "string") {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }
    if (voucherCode !== undefined && voucherCode !== null && typeof voucherCode !== "string") {
      return NextResponse.json({ error: "Invalid voucher code" }, { status: 400 });
    }
    if (referral !== undefined && referral !== null && typeof referral !== "string") {
      return NextResponse.json({ error: "Invalid referral" }, { status: 400 });
    }

    // Start the voucher lookup right away so it runs in parallel with the DB
    // work below instead of after it. Errors are captured (not thrown) so an
    // early return further down never leaves an unhandled rejection behind.
    const voucherLookup = voucherCode
      ? stripe.promotionCodes
          .list({ code: voucherCode, active: true, limit: 1 })
          .then((result) => ({ promo: result, error: null as unknown }))
          .catch((error: unknown) => ({ promo: null, error }))
      : null;

    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, stripe_customer_id, has_subscribed_before, rewardful_referral, selected_price_id")
      .eq("id", authenticatedUserId)
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    const user = userRow && {
      _id: userRow.id,
      email: userRow.email,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      stripeCustomerId: userRow.stripe_customer_id,
      hasSubscribedBefore: userRow.has_subscribed_before,
      rewardfulReferral: userRow.rewardful_referral,
      selectedPriceId: userRow.selected_price_id,
    };
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (email !== undefined && email !== null && email !== "") {
      const submittedEmail = String(email).trim().toLowerCase();
      const accountEmail = String(user.email ?? "").trim().toLowerCase();
      if (!accountEmail || submittedEmail !== accountEmail) {
        return NextResponse.json(
          { error: "This checkout does not belong to the signed-in account" },
          { status: 403 }
        );
      }
    }

    const hasSubscribedBefore = user.hasSubscribedBefore ?? false;
    const rewardfulReferral = referral || user.rewardfulReferral;
    const defaultPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    let selectedPriceId: string | undefined;
    if (priceId) {
      if (!(await isAllowedPriceForCustomer(priceId, user.stripeCustomerId))) {
        return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
      }
      selectedPriceId = priceId;
    } else if (
      user.selectedPriceId &&
      (await isAllowedPriceForCustomer(user.selectedPriceId, user.stripeCustomerId))
    ) {
      selectedPriceId = user.selectedPriceId;
    } else {
      selectedPriceId = defaultPriceId;
    }

    if (!selectedPriceId) {
      return NextResponse.json({ error: "No valid price ID found" }, { status: 400 });
    }

    // Resolve voucher code to a Stripe promotion code, if provided
    let promotionCodeId: string | undefined;
    let appliedVoucherCode: string | null = null;
    let promoCoupon: Stripe.Coupon | undefined;
    if (voucherLookup) {
      const { promo, error: voucherError } = await voucherLookup;
      if (voucherError) throw voucherError;
      if (!promo || promo.data.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired voucher code" },
          { status: 400 }
        );
      }
      promotionCodeId = promo.data[0].id;
      appliedVoucherCode = promo.data[0].code;
      promoCoupon = promo.data[0].coupon;
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
      const { error: customerSaveError } = await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user._id);
      if (customerSaveError) throw new Error(customerSaveError.message);
    }

    // Never touch an existing member's subscription from checkout: updating it
    // here would change their price, strip their voucher or reset trial dates.
    const confirmedSub = await findConfirmedSubscription(stripeCustomerId);
    if (confirmedSub) {
      return NextResponse.json(
        { error: "You already have an EatinOut membership.", code: "already_subscribed" },
        { status: 409 }
      );
    }

    if (!hasSubscribedBefore) {
      return startTrialCheckout({
        userId: user._id,
        stripeCustomerId,
        selectedPriceId,
        promotionCodeId,
        promoCoupon,
        rewardfulReferral,
      });
    }

    // Returning customers pay up front. Reuse an incomplete subscription
    // instead of creating a new one on every page load / voucher reapply.
    // Trialing subscriptions are never reused: confirmed ones were rejected
    // above and unconfirmed ones are abandoned trial checkouts.
    const incompleteList = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "incomplete",
      limit: 1,
    });
    const existingSub: Stripe.Subscription | undefined = incompleteList.data[0];

    if (existingSub && stripeIdOf(existingSub.customer) !== stripeCustomerId) {
      console.error("[create-subscription] Subscription/customer mismatch:", existingSub.id);
      return NextResponse.json({ error: "Subscription does not belong to this account" }, { status: 403 });
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
        ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
          // Restrict to card only — matches the approved design (Apple Pay /
          // Google Pay buttons are shown as static placeholders for now, and
          // we don't want Stripe silently offering Klarna, Cash App, Link, etc.
          payment_method_types: ["card"],
        },
        metadata: {
          ...(rewardfulReferral ? { rewardful_referral: rewardfulReferral } : {}),
        },
        expand: ["pending_setup_intent", "latest_invoice.payment_intent", "items.data.price"],
      });
    }

    // For trialing subscriptions Stripe creates a SetupIntent
    // (pending_setup_intent) which does NOT automatically inherit the
    // payment_method_types restriction above — restrict it explicitly too.
    // Also persist the chosen plan / referral / voucher immediately so we
    // don't depend only on the webhook for saving the voucher code.
    await Promise.all([
      subscription.pending_setup_intent
        ? stripe.setupIntents.update((subscription.pending_setup_intent as Stripe.SetupIntent).id, {
            payment_method_types: ["card"],
          })
        : Promise.resolve(),
      supabaseAdmin
        .from("users")
        .update({
          selected_price_id: selectedPriceId,
          rewardful_referral: rewardfulReferral || null,
          used_voucher_code: appliedVoucherCode,
        })
        .eq("id", user._id)
        .then((res) => {
          if (res.error) throw new Error(res.error.message);
        }),
    ]);

       // Newer Stripe API versions no longer return invoice.payment_intent;
    // the invoice's confirmation_secret holds the client secret instead.
    let invoiceConfirmationSecret: string | undefined;
    if (
      !subscription.pending_setup_intent &&
      !(subscription.latest_invoice as any)?.payment_intent
    ) {
      const invoiceId =
        typeof subscription.latest_invoice === "string"
          ? subscription.latest_invoice
          : (subscription.latest_invoice as any)?.id;
      if (invoiceId) {
        try {
          const inv: any = await stripe.invoices.retrieve(invoiceId, {
            expand: ["confirmation_secret"],
          });
          invoiceConfirmationSecret = inv?.confirmation_secret?.client_secret;
        } catch (e) {
          console.error("Could not load invoice confirmation_secret:", e);
        }
      }
    }

    const clientSecret =
      (subscription.pending_setup_intent as any)?.client_secret ??
      (subscription.latest_invoice as any)?.payment_intent?.client_secret ??
      invoiceConfirmationSecret;

    if (!clientSecret) {
      console.error("No client secret returned from subscription:", subscription.id);
      return NextResponse.json(
        { error: "Could not initialize payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      mode: subscription.pending_setup_intent ? "setup" : "payment",
      pricing: buildPricing(subscription.items.data[0]?.price as Stripe.Price | undefined, promoCoupon),
    });
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
