import { render } from '@react-email/render';
import sendEmail from "@/lib/sendEmail";
import SubscriptionCancellationEmail from "@/utils/email-templates/SubscriptionCancellationEmail";
import SubscriptionReactivationEmail from "@/utils/email-templates/SubscriptionReactivationEmail";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "@/models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // The installed stripe@18.5.0 types only permit the latest API version literal
  // ('2025-08-27.basil'), but this route intentionally pins the account's
  // "2023-10-16" behaviour because it reads the top-level `current_period_end`
  // field, which the newer "basil" API moved onto subscription items. Per
  // Stripe's own StripeConfig type guidance, pin the version and suppress the
  // literal-type mismatch with @ts-expect-error.
  // @ts-expect-error - intentionally pinning a non-latest API version at runtime
  apiVersion: "2023-10-16",
});

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

interface NormalizedSubscription {
  subscriptionId: string;
  status: string;
  effectiveStatus:
    | "trialing"
    | "active"
    | "scheduled_cancellation"
    | "cancelled_with_access"
    | "cancelled"
    | "past_due"
    | "inactive";
  isTrialing: boolean;
  trialStart: string | null;
  trialEnd: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  accessEndDate: string | null;
  planName: string;
  billingInterval: string | null;
  billingIntervalCount: number | null;
  recurringAmount: number | null;
  currency: string | null;
  formattedRecurringAmount: string | null;
  paymentMethod: {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  } | null;
  hasAccess: boolean;
  canReactivate: boolean;
  canExtendTrial: boolean;
  canApplyRetentionDiscount: boolean;
  trialExtensionUsed: boolean;
  retentionDiscountUsed: boolean;
}

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

  // Access + effective status
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

  const trialExtensionUsed = customerMetadata?.[TRIAL_EXTENSION_METADATA_KEY] === "true";
  const retentionDiscountUsed =
    customerMetadata?.[RETENTION_DISCOUNT_METADATA_KEY] === "true";

  const trialStillValid = !!trialEndUnix && trialEndUnix * 1000 > now;
  const canExtendTrial =
    isTrialing && trialStillValid && !cancelAtPeriodEnd && !trialExtensionUsed;

  const isMonthly = billingInterval === "month" && (billingIntervalCount ?? 1) === 1;
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

async function getAuthedUser(): Promise<
  | { error: NextResponse }
  | { user: any }
> {
  const cookieStore: any = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Authentication token required", code: "auth_expired" },
        { status: 401 }
      ),
    };
  }

  let decodedToken: { userId: string };
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Your session has expired. Please sign in again.", code: "auth_expired" },
        { status: 401 }
      ),
    };
  }

  const user = await User.findById(decodedToken.userId);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "User not found", code: "user_not_found" },
        { status: 404 }
      ),
    };
  }

  return { user };
}

async function fetchStripeContext(user: any) {
  const subscription: any = await stripe.subscriptions.retrieve(
    user.subscriptionId,
    { expand: ["items.data.price"] }
  );

  let paymentMethod: Stripe.PaymentMethod | undefined;
  let customerMetadata: Record<string, string> | undefined;

  if (user.stripeCustomerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });
      paymentMethod = paymentMethods.data[0];
    } catch (e) {
      console.error("[subscriptions] Failed to list payment methods:", e);
    }

    try {
      const customer: any = await stripe.customers.retrieve(user.stripeCustomerId);
      if (customer && !customer.deleted) {
        customerMetadata = customer.metadata || {};
      }
    } catch (e) {
      console.error("[subscriptions] Failed to retrieve customer:", e);
    }
  }

  return { subscription, paymentMethod, customerMetadata };
}

// ---------------------------------------------------------------------------
// POST — Create subscription (unchanged behaviour, kept for compatibility)
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const authed = await getAuthedUser();
    if ("error" in authed) return authed.error;
    const user = authed.user;

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
    console.error("[subscriptions] Error creating subscription:", error);
    return NextResponse.json(
      { error: "Error creating subscription" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — Schedule cancellation at end of trial / billing period
// (No longer performs an immediate Stripe cancellation.)
// ---------------------------------------------------------------------------
export async function DELETE() {
  try {
    const authed = await getAuthedUser();
    if ("error" in authed) return authed.error;
    const user = authed.user;

    if (!user.subscriptionId) {
      return NextResponse.json(
        { error: "We couldn't find an active membership to cancel.", code: "subscription_not_found" },
        { status: 404 }
      );
    }

    let ctx;
    try {
      ctx = await fetchStripeContext(user);
    } catch (e) {
      console.error("[subscriptions] Stripe retrieve failed (DELETE):", e);
      return NextResponse.json(
        { error: "We're having trouble reaching our payment provider. Please try again shortly.", code: "stripe_unavailable" },
        { status: 502 }
      );
    }

    let { subscription } = ctx;
    const { paymentMethod, customerMetadata } = ctx;

    // Already fully cancelled in Stripe — nothing to schedule.
    if (subscription.status === "canceled") {
      const normalized = normalizeSubscription(subscription, paymentMethod, customerMetadata);
      return NextResponse.json({
        success: true,
        cancelAtPeriodEnd: false,
        accessEndDate: normalized.accessEndDate,
        effectiveStatus: normalized.effectiveStatus,
        message: "Your membership has already been cancelled.",
        subscription: normalized,
      });
    }

    const wasAlreadyScheduled = subscription.cancel_at_period_end === true;

    if (!wasAlreadyScheduled) {
      subscription = await stripe.subscriptions.update(user.subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const normalized = normalizeSubscription(subscription, paymentMethod, customerMetadata);

    // Only email when the state actually changes from active -> scheduled.
    if (!wasAlreadyScheduled) {
      try {
        const formattedDate = normalized.accessEndDate
          ? new Date(normalized.accessEndDate).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "";

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
      }
    }

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd: true,
      accessEndDate: normalized.accessEndDate,
      effectiveStatus: normalized.effectiveStatus,
      message: wasAlreadyScheduled
        ? "Your membership is already scheduled to end."
        : "Your membership will remain active until the end of your current period.",
      subscription: normalized,
    });
  } catch (error) {
    console.error("[subscriptions] Error scheduling cancellation:", error);
    return NextResponse.json(
      { error: "We couldn't process your cancellation. Please try again.", code: "cancellation_failed" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Normalized subscription status
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const authed = await getAuthedUser();
    if ("error" in authed) return authed.error;
    const user = authed.user;

    if (!user.subscriptionId) {
      return NextResponse.json({
        status: user.subscriptionStatus,
        effectiveStatus: user.subscriptionStatus === "active" ? "active" : "inactive",
        hasAccess: false,
        email: user.email,
        card: null,
        subscription: null,
      });
    }

    let ctx;
    try {
      ctx = await fetchStripeContext(user);
    } catch (e) {
      console.error("[subscriptions] Stripe retrieve failed (GET):", e);
      return NextResponse.json(
        { error: "Error fetching subscription status", code: "stripe_unavailable" },
        { status: 500 }
      );
    }

    const { subscription, paymentMethod, customerMetadata } = ctx;
    const normalized = normalizeSubscription(subscription, paymentMethod, customerMetadata);

    // Keep local DB status roughly in sync without ever downgrading a member who
    // still has access. Scheduled cancellations remain "active" so access is kept.
    let dbStatus = user.subscriptionStatus;
    if (normalized.effectiveStatus === "cancelled") {
      dbStatus = "cancelled";
    } else if (normalized.effectiveStatus === "cancelled_with_access") {
      dbStatus = "cancelled_with_access";
    } else if (normalized.hasAccess) {
      dbStatus = "active";
    } else if (normalized.effectiveStatus === "inactive") {
      dbStatus = "inactive";
    }

    if (dbStatus !== user.subscriptionStatus) {
      try {
        user.subscriptionStatus = dbStatus;
        await user.save();
      } catch (updateError) {
        console.error("[subscriptions] Error updating user status:", updateError);
      }
    }

    return NextResponse.json({
      // Normalized object (preferred by new consumers)
      subscription: normalized,

      // Flattened normalized fields
      subscriptionId: normalized.subscriptionId,
      effectiveStatus: normalized.effectiveStatus,
      isTrialing: normalized.isTrialing,
      trialStart: normalized.trialStart,
      trialEnd: normalized.trialEnd,
      currentPeriodStart: normalized.currentPeriodStart,
      currentPeriodEnd: normalized.currentPeriodEnd,
      cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
      canceledAt: normalized.canceledAt,
      accessEndDate: normalized.accessEndDate,
      planName: normalized.planName,
      billingInterval: normalized.billingInterval,
      billingIntervalCount: normalized.billingIntervalCount,
      recurringAmount: normalized.recurringAmount,
      currency: normalized.currency,
      formattedRecurringAmount: normalized.formattedRecurringAmount,
      paymentMethod: normalized.paymentMethod,
      hasAccess: normalized.hasAccess,
      canReactivate: normalized.canReactivate,
      canExtendTrial: normalized.canExtendTrial,
      canApplyRetentionDiscount: normalized.canApplyRetentionDiscount,

      // Backwards-compatible fields (existing consumers)
      status: normalized.effectiveStatus,
      stripeStatus: normalized.status,
      subscriptionDetails: subscription,
      email: user.email,
      currentPeriodEndDate: normalized.currentPeriodEnd,
      trialEndDate: normalized.trialEnd,
      card: normalized.paymentMethod,
    });
  } catch (error) {
    console.error("[subscriptions] Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Error fetching subscription status" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — reactivate | extend_trial | apply_retention_discount (+ legacy pause/resume)
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  try {
    const authed = await getAuthedUser();
    if ("error" in authed) return authed.error;
    const user = authed.user;

    if (!user.subscriptionId) {
      return NextResponse.json(
        { error: "We couldn't find your membership.", code: "subscription_not_found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // -------------------- Reactivate --------------------
    if (action === "reactivate") {
      let ctx;
      try {
        ctx = await fetchStripeContext(user);
      } catch (e) {
        console.error("[subscriptions] Stripe retrieve failed (reactivate):", e);
        return NextResponse.json(
          { error: "We're having trouble reaching our payment provider. Please try again shortly.", code: "stripe_unavailable" },
          { status: 502 }
        );
      }

      let { subscription } = ctx;
      const { paymentMethod, customerMetadata } = ctx;

      if (subscription.status === "canceled") {
        return NextResponse.json(
          {
            error: "This membership has already ended and can't be reactivated. Please start a new membership.",
            code: "not_reactivatable",
          },
          { status: 409 }
        );
      }

      const wasScheduled = subscription.cancel_at_period_end === true;

      if (wasScheduled) {
        subscription = await stripe.subscriptions.update(user.subscriptionId, {
          cancel_at_period_end: false,
        });
      }

      user.subscriptionStatus = "active";
      await user.save();

      const normalized = normalizeSubscription(subscription, paymentMethod, customerMetadata);

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

    // -------------------- Extend trial --------------------
    if (action === "extend_trial") {
      let ctx;
      try {
        ctx = await fetchStripeContext(user);
      } catch (e) {
        console.error("[subscriptions] Stripe retrieve failed (extend_trial):", e);
        return NextResponse.json(
          { error: "We're having trouble reaching our payment provider. Please try again shortly.", code: "stripe_unavailable" },
          { status: 502 }
        );
      }

      let { subscription } = ctx;
      const { paymentMethod, customerMetadata } = ctx;

      if (subscription.status !== "trialing" || !subscription.trial_end) {
        return NextResponse.json(
          { error: "Your free trial can no longer be extended.", code: "not_trialing" },
          { status: 409 }
        );
      }

      const now = Date.now();
      if (subscription.trial_end * 1000 <= now) {
        return NextResponse.json(
          { error: "Your free trial has already ended.", code: "trial_ended" },
          { status: 409 }
        );
      }

      if (customerMetadata?.[TRIAL_EXTENSION_METADATA_KEY] === "true") {
        return NextResponse.json(
          { error: "You've already used your one-time trial extension.", code: "trial_extension_used" },
          { status: 409 }
        );
      }

      if (!user.stripeCustomerId) {
        return NextResponse.json(
          { error: "We couldn't verify your account. Please try again.", code: "customer_not_found" },
          { status: 409 }
        );
      }

      const previousTrialEnd = subscription.trial_end as number;
      const newTrialEnd = previousTrialEnd + TRIAL_EXTENSION_DAYS * 24 * 60 * 60;

      subscription = await stripe.subscriptions.update(user.subscriptionId, {
        trial_end: newTrialEnd,
        proration_behavior: "none",
      });

      // Only persist the one-time flag after Stripe confirms the update.
      try {
        await stripe.customers.update(user.stripeCustomerId, {
          metadata: { [TRIAL_EXTENSION_METADATA_KEY]: "true" },
        });
      } catch (e) {
        console.error("[subscriptions] Failed to write trial-extension metadata:", e);
      }

      const normalized = normalizeSubscription(subscription, paymentMethod, {
        ...(customerMetadata || {}),
        [TRIAL_EXTENSION_METADATA_KEY]: "true",
      });

      return NextResponse.json({
        success: true,
        previousTrialEnd: toIso(previousTrialEnd),
        trialEnd: toIso(newTrialEnd),
        extensionDays: TRIAL_EXTENSION_DAYS,
        message: `Your free trial has been extended by ${TRIAL_EXTENSION_DAYS} days.`,
        subscription: normalized,
      });
    }

    // -------------------- Apply 50% retention discount --------------------
    if (action === "apply_retention_discount") {
      const couponId = process.env.STRIPE_RETENTION_50_PERCENT_COUPON_ID;
      if (!couponId) {
        console.error("[subscriptions] STRIPE_RETENTION_50_PERCENT_COUPON_ID is not configured.");
        return NextResponse.json(
          { error: "This offer isn't available right now.", code: "coupon_not_configured" },
          { status: 409 }
        );
      }

      let ctx;
      try {
        ctx = await fetchStripeContext(user);
      } catch (e) {
        console.error("[subscriptions] Stripe retrieve failed (discount):", e);
        return NextResponse.json(
          { error: "We're having trouble reaching our payment provider. Please try again shortly.", code: "stripe_unavailable" },
          { status: 502 }
        );
      }

      let { subscription } = ctx;
      const { paymentMethod, customerMetadata } = ctx;

      const preview = normalizeSubscription(subscription, paymentMethod, customerMetadata);

      if (customerMetadata?.[RETENTION_DISCOUNT_METADATA_KEY] === "true") {
        return NextResponse.json(
          { error: "You've already used this one-time discount.", code: "discount_used" },
          { status: 409 }
        );
      }

      if (preview.isTrialing || preview.effectiveStatus !== "active" || preview.cancelAtPeriodEnd) {
        return NextResponse.json(
          { error: "This offer isn't available for your membership.", code: "not_eligible" },
          { status: 409 }
        );
      }

      const isMonthly =
        preview.billingInterval === "month" && (preview.billingIntervalCount ?? 1) === 1;
      if (!isMonthly) {
        return NextResponse.json(
          { error: "This offer is only available on monthly memberships.", code: "not_eligible" },
          { status: 409 }
        );
      }

      // Verify the coupon exists and is valid before applying.
      try {
        const coupon = await stripe.coupons.retrieve(couponId);
        if (!coupon || (coupon as any).valid === false) {
          console.error("[subscriptions] Retention coupon is invalid.");
          return NextResponse.json(
            { error: "This offer isn't available right now.", code: "coupon_not_configured" },
            { status: 409 }
          );
        }
      } catch (e) {
        console.error("[subscriptions] Failed to retrieve retention coupon:", e);
        return NextResponse.json(
          { error: "This offer isn't available right now.", code: "coupon_not_configured" },
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
          { error: "We couldn't apply the discount. Please try again.", code: "discount_failed" },
          { status: 502 }
        );
      }

      // Only mark used after Stripe confirms the discount was applied.
      try {
        await stripe.customers.update(user.stripeCustomerId, {
          metadata: { [RETENTION_DISCOUNT_METADATA_KEY]: "true" },
        });
      } catch (e) {
        console.error("[subscriptions] Failed to write retention-discount metadata:", e);
      }

      const normalized = normalizeSubscription(subscription, paymentMethod, {
        ...(customerMetadata || {}),
        [RETENTION_DISCOUNT_METADATA_KEY]: "true",
      });

      return NextResponse.json({
        success: true,
        message: "50% off your next monthly payment has been applied.",
        subscription: normalized,
      });
    }

    // -------------------- Legacy pause/resume (not exposed in UI) --------------------
    if (action === "pause") {
      const subscription = await stripe.subscriptions.update(user.subscriptionId, {
        pause_collection: { behavior: "mark_uncollectible" },
      });
      user.subscriptionStatus = "inactive";
      await user.save();
      return NextResponse.json({
        message: "Subscription paused successfully",
        subscription,
      });
    }

    if (action === "resume") {
      const subscription = await stripe.subscriptions.update(user.subscriptionId, {
        pause_collection: null,
      });
      user.subscriptionStatus = "active";
      await user.save();
      return NextResponse.json({
        message: "Subscription resumed successfully",
        subscription,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[subscriptions] Error managing subscription:", error);
    return NextResponse.json(
      { error: "Error managing subscription" },
      { status: 500 }
    );
  }
}
