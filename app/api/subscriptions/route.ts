import { render } from '@react-email/render';
import sendEmail from "@/lib/sendEmail";
import SubscriptionCancellationEmail from "@/utils/email-templates/SubscriptionCancellationEmail";
import SubscriptionReactivationEmail from "@/utils/email-templates/SubscriptionReactivationEmail";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "@/models/User";
import type { NormalizedSubscription } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // The installed stripe@18.5.0 types only permit the latest API version literal
  // ('2025-08-27.basil'), but this route intentionally pins the account's
  // "2023-10-16" behaviour because it reads the top-level `current_period_end`
  // and `trial_end` fields, which the newer "basil" API moved onto subscription
  // items. Per Stripe's own StripeConfig guidance, pin the version and suppress
  // only this single literal-type mismatch.
  // @ts-expect-error - intentionally pinning a non-latest API version at runtime
  apiVersion: "2023-10-16",
});

// One-time-use flags stored on the Stripe customer (never in our DB).
const TRIAL_EXTENSION_METADATA_KEY = "eatinout_trial_extension_used";
const RETENTION_DISCOUNT_METADATA_KEY = "eatinout_retention_discount_used";
const TRIAL_EXTENSION_DAYS = 14;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIso(unixSeconds?: number | null): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function formatCurrency(amountMajor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: (currency || "gbp").toUpperCase(),
    }).format(amountMajor);
  } catch {
    return `£${amountMajor.toFixed(2)}`;
  }
}

function derivePlanName(
  interval: string | undefined,
  count: number | undefined,
  nickname?: string | null
): string {
  if (nickname) return nickname;
  const c = count || 1;
  if (interval === "month" && c === 1) return "Monthly membership";
  if (interval === "month" && c === 6) return "6-month membership";
  if (interval === "month" && c === 18) return "18-month membership";
  if (interval === "year" && c === 1) return "Annual membership";
  if (interval === "week") return c === 1 ? "Weekly membership" : `${c}-week membership`;
  if (interval === "day") return `${c}-day membership`;
  if (interval === "month") return `${c}-month membership`;
  if (interval === "year") return `${c}-year membership`;
  return "Membership";
}

/** Retrieve customer metadata (used only for one-time-use eligibility flags). */
async function getCustomerMetadata(
  customerId?: string | null
): Promise<Record<string, string> | undefined> {
  if (!customerId) return undefined;
  try {
    const customer: any = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) {
      return customer.metadata || {};
    }
  } catch (e) {
    console.error("[subscriptions] Failed to retrieve customer metadata:", e);
  }
  return undefined;
}

/**
 * Build the normalized subscription object returned to new consumers.
 * Billing cadence is derived strictly from price.recurring (never inferred
 * from the amount).
 */
function normalizeSubscription(
  subscription: any,
  paymentMethod: Stripe.PaymentMethod | undefined,
  customerMetadata: Record<string, string> | undefined
): NormalizedSubscription {
  const now = Date.now();

  const item = subscription.items?.data?.[0];
  const price = item?.price;
  const recurring = price?.recurring;

  const billingInterval: string | null = recurring?.interval ?? null;
  const billingIntervalCount: number | null = recurring?.interval_count ?? null;
  const currency: string | null = price?.currency ?? null;
  const recurringAmount: number | null =
    typeof price?.unit_amount === "number" ? price.unit_amount / 100 : null;
  const formattedRecurringAmount =
    recurringAmount != null && currency
      ? formatCurrency(recurringAmount, currency)
      : null;

  const stripeStatus: string = subscription.status;
  const cancelAtPeriodEnd: boolean = !!subscription.cancel_at_period_end;
  const isTrialing = stripeStatus === "trialing";

  const trialEndUnix: number | null = subscription.trial_end ?? null;
  const currentPeriodEndUnix: number | null =
    subscription.current_period_end ?? null;

  // Access ends at trial_end while trialing, otherwise at the end of the period.
  const accessEndUnix =
    isTrialing && trialEndUnix ? trialEndUnix : currentPeriodEndUnix;
  const accessEndDate = toIso(accessEndUnix);
  const accessEndMs = accessEndUnix ? accessEndUnix * 1000 : 0;

  let hasAccess = false;
  let effectiveStatus: NormalizedSubscription["effectiveStatus"] = "inactive";

  if (stripeStatus === "active" || stripeStatus === "trialing") {
    hasAccess = true;
    if (cancelAtPeriodEnd) {
      effectiveStatus = "scheduled_cancellation";
    } else {
      effectiveStatus = isTrialing ? "trialing" : "active";
    }
  } else if (stripeStatus === "past_due") {
    hasAccess = accessEndMs > now;
    effectiveStatus = "past_due";
  } else if (stripeStatus === "canceled") {
    if (accessEndMs > now) {
      hasAccess = true;
      effectiveStatus = "cancelled_with_access";
    } else {
      hasAccess = false;
      effectiveStatus = "cancelled";
    }
  } else {
    hasAccess = false;
    effectiveStatus = "inactive";
  }

  // Reactivation only makes sense while the subscription is still live in Stripe
  // (a fully "canceled" subscription cannot have cancel_at_period_end cleared).
  const canReactivate =
    cancelAtPeriodEnd &&
    (stripeStatus === "active" || stripeStatus === "trialing");

  const trialExtensionUsed =
    customerMetadata?.[TRIAL_EXTENSION_METADATA_KEY] === "true";
  const retentionDiscountUsed =
    customerMetadata?.[RETENTION_DISCOUNT_METADATA_KEY] === "true";

  const trialStillValid = !!trialEndUnix && trialEndUnix * 1000 > now;
  const canExtendTrial =
    isTrialing && trialStillValid && !cancelAtPeriodEnd && !trialExtensionUsed;

  const isMonthly =
    billingInterval === "month" && (billingIntervalCount ?? 1) === 1;
  const canApplyRetentionDiscount =
    !isTrialing &&
    stripeStatus === "active" &&
    !cancelAtPeriodEnd &&
    isMonthly &&
    !retentionDiscountUsed &&
    !!process.env.STRIPE_RETENTION_50_PERCENT_COUPON_ID;

  return {
    subscriptionId: subscription.id,
    status: stripeStatus,
    effectiveStatus,
    isTrialing,
    trialStart: toIso(subscription.trial_start),
    trialEnd: toIso(trialEndUnix),
    currentPeriodStart: toIso(subscription.current_period_start),
    currentPeriodEnd: toIso(currentPeriodEndUnix),
    cancelAtPeriodEnd,
    canceledAt: toIso(subscription.canceled_at),
    accessEndDate,
    planName: derivePlanName(
      billingInterval ?? undefined,
      billingIntervalCount ?? undefined,
      price?.nickname
    ),
    billingInterval,
    billingIntervalCount,
    recurringAmount,
    currency,
    formattedRecurringAmount,
    paymentMethod: paymentMethod
      ? {
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          expMonth: paymentMethod.card?.exp_month,
          expYear: paymentMethod.card?.exp_year,
        }
      : null,
    hasAccess,
    canReactivate,
    canExtendTrial,
    canApplyRetentionDiscount,
    trialExtensionUsed,
    retentionDiscountUsed,
  };
}

// Customer-safe response used when Stripe can't be reached. Kept as a helper so
// the four inline retrieval failures return an identical status code and body.
function stripeUnavailable() {
  return NextResponse.json(
    {
      error:
        "We're having trouble reaching our payment provider. Please try again shortly.",
    },
    { status: 502 }
  );
}

// Create subscription
export async function POST(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    // Decode token to get userId
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    user.subscriptionId = subscription.id;
    user.subscriptionStatus = "active";
    await user.save();

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent
        .client_secret,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating subscription" },
      { status: 500 }
    );
  }
}

// Cancel subscription — schedules cancellation at period/trial end (idempotent).
// No immediate Stripe cancellation is performed, so access is retained until the
// end of the paid period. The DELETE verb is kept for existing consumers.
export async function DELETE(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user || !user.subscriptionId) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Retrieve current state first so cancellation is idempotent and we only
    // email on a genuine not-scheduled -> scheduled transition.
    let subscription: any;
    try {
      subscription = await stripe.subscriptions.retrieve(user.subscriptionId, {
        expand: ["items.data.price"],
      });
    } catch (e) {
      console.error("[subscriptions] Stripe retrieve failed (DELETE):", e);
      return stripeUnavailable();
    }

    const paymentMethods = await stripe.paymentMethods
      .list({ customer: user.stripeCustomerId, type: "card" })
      .catch(() => ({ data: [] as Stripe.PaymentMethod[] }));
    const defaultPaymentMethod = paymentMethods.data[0];
    const customerMetadata = await getCustomerMetadata(user.stripeCustomerId);

    // Already fully cancelled in Stripe — nothing to schedule; return success.
    if (subscription.status === "canceled") {
      const normalized = normalizeSubscription(
        subscription,
        defaultPaymentMethod,
        customerMetadata
      );
      const now = new Date();
      const accessEnd = normalized.accessEndDate
        ? new Date(normalized.accessEndDate)
        : null;
      const canceledStatus =
        accessEnd && accessEnd > now ? "cancelled_with_access" : "cancelled";
      // Idempotent: skip the DB write when the status already matches.
      if (user.subscriptionStatus !== canceledStatus) {
        user.subscriptionStatus = canceledStatus;
        await user.save();
      }

      return NextResponse.json({
        success: true,
        message: "Your membership has already been cancelled.",
        cancelAtPeriodEnd: false,
        accessEndDate: normalized.accessEndDate,
        effectiveStatus: normalized.effectiveStatus,
        subscription: normalized,
      });
    }

    const wasAlreadyScheduled = subscription.cancel_at_period_end === true;

    if (!wasAlreadyScheduled) {
      subscription = await stripe.subscriptions.update(user.subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Determine if access should be retained until the end of the period.
    const now = new Date();
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const accessEndDate = trialEnd || currentPeriodEnd;

    const newStatus =
      accessEndDate > now ? "cancelled_with_access" : "cancelled";

    // Idempotent re-cancel: only write when the status actually changes.
    if (user.subscriptionStatus !== newStatus) {
      user.subscriptionStatus = newStatus;
      await user.save();
    }

    const normalized = normalizeSubscription(
      subscription,
      defaultPaymentMethod,
      customerMetadata
    );

    // Only email when the state actually changes from not-scheduled -> scheduled.
    if (!wasAlreadyScheduled) {
      try {
        const endDate = new Date(subscription.current_period_end * 1000);
        const formattedDate = endDate.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const emailHtml = await render(
          SubscriptionCancellationEmail({
            firstName: user.firstName,
            currentPeriodEnd: formattedDate,
          })
        );

        await sendEmail(
          user.email,
          "Your Eatinout membership cancellation is scheduled",
          emailHtml
        );
      } catch (emailError) {
        console.error("[subscriptions] Failed to send cancellation email:", emailError);
        // We don't want to fail the cancellation if email sending fails
      }
    }

    return NextResponse.json({
      success: true,
      message: wasAlreadyScheduled
        ? "Your membership is already scheduled to end."
        : "Subscription cancelled successfully",
      cancelAtPeriodEnd: true,
      accessEndDate: normalized.accessEndDate ?? accessEndDate.toISOString(),
      effectiveStatus: normalized.effectiveStatus,
      subscription: normalized,
    });
  } catch (error) {
    console.error("[subscriptions] Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Error cancelling subscription" },
      { status: 500 }
    );
  }
}

// Get subscription status
export async function GET(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.subscriptionId) {
      const subscription: any = await stripe.subscriptions.retrieve(
        user.subscriptionId,
        { expand: ["items.data.price"] }
      );

      // Get payment method details
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });

      const defaultPaymentMethod = paymentMethods.data[0];

      // One-time-use eligibility flags live on the Stripe customer.
      const customerMetadata = await getCustomerMetadata(user.stripeCustomerId);

      // Determine access based on subscription status and dates
      const now = new Date();
      let hasAccess = false;
      let accessReason = "";
      let effectiveStatus = user.subscriptionStatus;

      if (subscription.status === 'active') {
        hasAccess = true;
        if (subscription.cancel_at_period_end) {
          accessReason = "Subscription active but will cancel at period end";
          effectiveStatus = 'cancelled_with_access';
        } else {
          accessReason = "Subscription is active";
          effectiveStatus = 'active';
        }
        user.isTrialing = false;
      } else if (subscription.status === 'trialing') {
        hasAccess = true;
        if (subscription.cancel_at_period_end) {
          accessReason = "Subscription in trial but will cancel at period end";
          effectiveStatus = 'cancelled_with_access';
        } else {
          accessReason = "Subscription is in trial period";
          effectiveStatus = 'inactive';
        }
        user.isTrialing = true;
      } else if (subscription.status === 'canceled') {
        // For cancelled subscriptions, check trial_end or current_period_end
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Use trial_end if it exists, otherwise use current_period_end
        const accessEndDate = trialEnd || currentPeriodEnd;

        if (accessEndDate > now) {
          hasAccess = true;
          accessReason = `Subscription cancelled but access valid until ${accessEndDate.toISOString()}`;
          effectiveStatus = 'cancelled_with_access';
        } else {
          hasAccess = false;
          accessReason = `Subscription cancelled and access expired on ${accessEndDate.toISOString()}`;
          effectiveStatus = 'cancelled';
        }
      } else if (subscription.status === 'past_due') {
        // For past due, check if still within period
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        hasAccess = currentPeriodEnd > now;
        accessReason = hasAccess ? "Past due but still within period" : "Past due and period expired";
        effectiveStatus = 'past_due';
        user.isTrialing = false;
      } else {
        hasAccess = false;
        accessReason = `Subscription status: ${subscription.status}`;
        effectiveStatus = 'inactive';
        user.isTrialing = false;
      }

      // Update user status if needed
      if (effectiveStatus !== user.subscriptionStatus || user.isModified('isTrialing')) {
        try {
          user.subscriptionStatus = effectiveStatus;
          await user.save();
        } catch (updateError) {
          console.error("Error updating user status:", updateError);
        }
      }

      // Normalized object for new consumers (retention UI). Additive only — all
      // existing fields below are preserved for current consumers.
      const normalized = normalizeSubscription(
        subscription,
        defaultPaymentMethod,
        customerMetadata
      );

      return NextResponse.json({
        status: effectiveStatus,
        hasAccess,
        accessReason,
        subscriptionDetails: subscription,
        email: user.email,
        stripeStatus: subscription.status,
        trialEnd: subscription.trial_end,
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        currentPeriodEnd: subscription.current_period_end,
        currentPeriodEndDate: new Date(subscription.current_period_end * 1000).toISOString(),
        canceledAt: subscription.canceled_at,
        isTrialing: user.isTrialing,
        card: defaultPaymentMethod
          ? {
            brand: defaultPaymentMethod.card?.brand,
            last4: defaultPaymentMethod.card?.last4,
            expMonth: defaultPaymentMethod.card?.exp_month,
            expYear: defaultPaymentMethod.card?.exp_year,
          }
          : null,

        // The legacy top-level fields above are retained because existing
        // consumers depend on them: app layout + sign-in read `status` /
        // `hasAccess` / `accessReason` / `subscriptionDetails` / `email` /
        // `isTrialing`, and the account + payment pages read `subscriptionDetails`
        // / `card`. New subscription-management components (subscription summary
        // card, cancellation wizard) must read everything from the nested
        // `subscription` object below — not from top-level mirror fields.
        subscription: normalized,
      });
    } else {
      return NextResponse.json({
        status: user.subscriptionStatus,
        email: user.email,
        card: null,
        // Nested object is null when there is no Stripe subscription; new
        // consumers read `data.subscription` and handle the null case.
        subscription: null,
      });
    }
  } catch (error) {
    console.error("[subscriptions] Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Error fetching subscription status" },
      { status: 500 }
    );
  }
}

// Manage subscription:
//   reactivate               — clear a scheduled cancellation
//   extend_trial             — one-time +14 day trial extension
//   apply_retention_discount — one-time 50% retention coupon
//   pause / resume           — legacy actions, retained for compatibility
export async function PATCH(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user || !user.subscriptionId) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // -------------------- Reactivate --------------------
    if (action === "reactivate") {
      let subscription: any;
      try {
        subscription = await stripe.subscriptions.retrieve(user.subscriptionId, {
          expand: ["items.data.price"],
        });
      } catch (e) {
        console.error("[subscriptions] Stripe retrieve failed (reactivate):", e);
        return stripeUnavailable();
      }

      // A fully-ended subscription cannot be reactivated.
      if (subscription.status === "canceled") {
        return NextResponse.json(
          {
            error:
              "This membership has already ended and can't be reactivated. Please start a new membership.",
          },
          { status: 409 }
        );
      }

      const paymentMethods = await stripe.paymentMethods
        .list({ customer: user.stripeCustomerId, type: "card" })
        .catch(() => ({ data: [] as Stripe.PaymentMethod[] }));
      const defaultPaymentMethod = paymentMethods.data[0];
      const customerMetadata = await getCustomerMetadata(user.stripeCustomerId);

      const wasScheduled = subscription.cancel_at_period_end === true;

      if (wasScheduled) {
        subscription = await stripe.subscriptions.update(user.subscriptionId, {
          cancel_at_period_end: false,
        });
      }

      user.subscriptionStatus = "active";
      await user.save();

      const normalized = normalizeSubscription(
        subscription,
        defaultPaymentMethod,
        customerMetadata
      );

      // Only email when a scheduled cancellation is genuinely reversed.
      if (wasScheduled) {
        try {
          const nextDate = normalized.accessEndDate
            ? new Date(normalized.accessEndDate).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "";
          const emailHtml = await render(
            SubscriptionReactivationEmail({
              firstName: user.firstName,
              nextPaymentDate: nextDate,
            })
          );
          await sendEmail(
            user.email,
            "Your Eatinout membership is active again",
            emailHtml
          );
        } catch (emailError) {
          console.error("[subscriptions] Failed to send reactivation email:", emailError);
        }
      }

      return NextResponse.json({
        success: true,
        message: wasScheduled
          ? "Your membership has been reactivated."
          : "Your membership is already active.",
        subscription: normalized,
      });
    }

    // -------------------- Extend trial (one-time, +14 days) --------------------
    if (action === "extend_trial") {
      let subscription: any;
      try {
        subscription = await stripe.subscriptions.retrieve(user.subscriptionId, {
          expand: ["items.data.price"],
        });
      } catch (e) {
        console.error("[subscriptions] Stripe retrieve failed (extend_trial):", e);
        return stripeUnavailable();
      }

      if (subscription.status !== "trialing" || !subscription.trial_end) {
        return NextResponse.json(
          { error: "Your free trial can no longer be extended." },
          { status: 409 }
        );
      }

      const now = Date.now();
      if (subscription.trial_end * 1000 <= now) {
        return NextResponse.json(
          { error: "Your free trial has already ended." },
          { status: 409 }
        );
      }

      const customerMetadata = await getCustomerMetadata(user.stripeCustomerId);
      if (customerMetadata?.[TRIAL_EXTENSION_METADATA_KEY] === "true") {
        return NextResponse.json(
          { error: "You've already used your one-time trial extension." },
          { status: 409 }
        );
      }

      if (!user.stripeCustomerId) {
        return NextResponse.json(
          { error: "We couldn't verify your account. Please try again." },
          { status: 409 }
        );
      }

      // Extend from the existing trial_end (never from "now").
      const previousTrialEnd = subscription.trial_end as number;
      const newTrialEnd = previousTrialEnd + TRIAL_EXTENSION_DAYS * 24 * 60 * 60;

      subscription = await stripe.subscriptions.update(user.subscriptionId, {
        trial_end: newTrialEnd,
        proration_behavior: "none",
      });

      // The one-time flag MUST be persisted for the incentive to be safe.
      // Only after Stripe confirms the flag do we return success. If the flag
      // write fails, roll the trial back so the customer can't repeat it.
      try {
        await stripe.customers.update(user.stripeCustomerId, {
          metadata: { [TRIAL_EXTENSION_METADATA_KEY]: "true" },
        });
      } catch (metaError) {
        console.error(
          "[subscriptions] Failed to write trial-extension flag; rolling back trial_end:",
          metaError
        );
        try {
          await stripe.subscriptions.update(user.subscriptionId, {
            trial_end: previousTrialEnd,
            proration_behavior: "none",
          });
          console.error(
            "[subscriptions] Trial extension rolled back to previous trial_end after flag-write failure."
          );
        } catch (rollbackError) {
          console.error(
            "[subscriptions] CRITICAL: trial-extension rollback FAILED — Stripe subscription " +
              `${user.subscriptionId} may have an extended trial WITHOUT the one-time flag set. Manual reconciliation required.`,
            rollbackError
          );
        }
        // Never fire or return success when the eligibility flag isn't confirmed.
        return NextResponse.json(
          { error: "We couldn't complete your trial extension. Please try again." },
          { status: 502 }
        );
      }

      const paymentMethods = await stripe.paymentMethods
        .list({ customer: user.stripeCustomerId, type: "card" })
        .catch(() => ({ data: [] as Stripe.PaymentMethod[] }));
      const normalized = normalizeSubscription(
        subscription,
        paymentMethods.data[0],
        { ...(customerMetadata || {}), [TRIAL_EXTENSION_METADATA_KEY]: "true" }
      );

      return NextResponse.json({
        success: true,
        previousTrialEnd: toIso(previousTrialEnd),
        trialEnd: toIso(newTrialEnd),
        extensionDays: TRIAL_EXTENSION_DAYS,
        message: `Your free trial has been extended by ${TRIAL_EXTENSION_DAYS} days.`,
        subscription: normalized,
      });
    }

    // -------------------- Apply 50% retention discount (one-time) --------------------
    if (action === "apply_retention_discount") {
      const couponId = process.env.STRIPE_RETENTION_50_PERCENT_COUPON_ID;
      if (!couponId) {
        console.error("[subscriptions] STRIPE_RETENTION_50_PERCENT_COUPON_ID is not configured.");
        return NextResponse.json(
          { error: "This offer isn't available right now." },
          { status: 409 }
        );
      }

      let subscription: any;
      try {
        subscription = await stripe.subscriptions.retrieve(user.subscriptionId, {
          expand: ["items.data.price"],
        });
      } catch (e) {
        console.error("[subscriptions] Stripe retrieve failed (discount):", e);
        return stripeUnavailable();
      }

      const paymentMethods = await stripe.paymentMethods
        .list({ customer: user.stripeCustomerId, type: "card" })
        .catch(() => ({ data: [] as Stripe.PaymentMethod[] }));
      const defaultPaymentMethod = paymentMethods.data[0];
      const customerMetadata = await getCustomerMetadata(user.stripeCustomerId);

      if (customerMetadata?.[RETENTION_DISCOUNT_METADATA_KEY] === "true") {
        return NextResponse.json(
          { error: "You've already used this one-time discount." },
          { status: 409 }
        );
      }

      const preview = normalizeSubscription(
        subscription,
        defaultPaymentMethod,
        customerMetadata
      );

      // Eligibility: active, paying, monthly, not trialing, not already scheduled.
      if (preview.isTrialing || preview.effectiveStatus !== "active" || preview.cancelAtPeriodEnd) {
        return NextResponse.json(
          { error: "This offer isn't available for your membership." },
          { status: 409 }
        );
      }

      const isMonthly =
        preview.billingInterval === "month" && (preview.billingIntervalCount ?? 1) === 1;
      if (!isMonthly) {
        return NextResponse.json(
          { error: "This offer is only available on monthly memberships." },
          { status: 409 }
        );
      }

      // Never overwrite an existing discount on the subscription.
      const hasExistingDiscount =
        (Array.isArray(subscription.discounts) &&
          subscription.discounts.length > 0) ||
        Boolean((subscription as any).discount);
      if (hasExistingDiscount) {
        return NextResponse.json(
          { error: "A discount is already applied to your membership." },
          { status: 409 }
        );
      }

      // Confirm the coupon exists and is valid before applying.
      try {
        const coupon = await stripe.coupons.retrieve(couponId);
        if (!coupon || (coupon as any).valid === false) {
          console.error("[subscriptions] Retention coupon is invalid.");
          return NextResponse.json(
            { error: "This offer isn't available right now." },
            { status: 409 }
          );
        }
      } catch (e) {
        console.error("[subscriptions] Failed to retrieve retention coupon:", e);
        return NextResponse.json(
          { error: "This offer isn't available right now." },
          { status: 409 }
        );
      }

      try {
        // apiVersion 2023-10-16 supports applying a coupon directly on update.
        subscription = await stripe.subscriptions.update(
          user.subscriptionId,
          { coupon: couponId } as any
        );
      } catch (e) {
        console.error("[subscriptions] Failed to apply retention coupon:", e);
        return NextResponse.json(
          { error: "We couldn't apply the discount. Please try again." },
          { status: 502 }
        );
      }

      // The one-time flag MUST be persisted. Only after Stripe confirms it do
      // we return success. If the flag write fails, remove the discount we just
      // applied so the customer can't repeat the incentive.
      try {
        await stripe.customers.update(user.stripeCustomerId, {
          metadata: { [RETENTION_DISCOUNT_METADATA_KEY]: "true" },
        });
      } catch (metaError) {
        console.error(
          "[subscriptions] Failed to write retention-discount flag; removing discount:",
          metaError
        );
        try {
          // 18.5.0 removes the applied subscription discount via deleteDiscount.
          await stripe.subscriptions.deleteDiscount(user.subscriptionId);
          console.error(
            "[subscriptions] Retention discount removed after flag-write failure."
          );
        } catch (rollbackError) {
          console.error(
            "[subscriptions] CRITICAL: retention-discount rollback FAILED — Stripe subscription " +
              `${user.subscriptionId} may have a discount WITHOUT the one-time flag set. Manual reconciliation required.`,
            rollbackError
          );
        }
        // Never fire or return success when the eligibility flag isn't confirmed.
        return NextResponse.json(
          { error: "We couldn't apply your discount. Please try again." },
          { status: 502 }
        );
      }

      const normalized = normalizeSubscription(subscription, defaultPaymentMethod, {
        ...(customerMetadata || {}),
        [RETENTION_DISCOUNT_METADATA_KEY]: "true",
      });

      return NextResponse.json({
        success: true,
        message: "50% off your next monthly payment has been applied.",
        subscription: normalized,
      });
    }

    // -------------------- Legacy actions (not exposed in the new UI) --------------------
    if (action === "pause") {
      // Pause subscription
      const subscription = await stripe.subscriptions.update(
        user.subscriptionId,
        {
          pause_collection: { behavior: "mark_uncollectible" },
        }
      );

      user.subscriptionStatus = "inactive";
      await user.save();

      return NextResponse.json({
        message: "Subscription paused successfully",
        subscription: subscription,
      });
    } else if (action === "resume") {
      // Resume subscription
      const subscription = await stripe.subscriptions.update(
        user.subscriptionId,
        {
          pause_collection: null, // Remove the pause
          cancel_at_period_end: false, // Remove cancellation
        }
      );

      user.subscriptionStatus = "active";
      await user.save();

      return NextResponse.json({
        message: "Subscription resumed successfully",
        subscription: subscription,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[subscriptions] Error managing subscription:", error);
    return NextResponse.json(
      { error: "Error managing subscription" },
      { status: 500 }
    );
  }
}
