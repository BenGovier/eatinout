import Stripe from "stripe";
import supabaseAdmin from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const TRIAL_SETUP_PURPOSE = "eatinout_trial";
export const TRIAL_DAYS = 30;

type SubscriptionLike = {
  id?: string;
  status?: string | null;
  default_payment_method?: unknown;
  metadata?: Record<string, string> | null;
};

export function stripeIdOf(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

/**
 * A subscription the customer has actually committed to: paid/billing states,
 * or a trial with a saved card. Abandoned checkout trials (trialing with no
 * payment method) and ended subscriptions are not confirmed.
 */
export function isConfirmedSubscription(sub: SubscriptionLike): boolean {
  if (sub.status === "active" || sub.status === "past_due" || sub.status === "unpaid") return true;
  return sub.status === "trialing" && !!sub.default_payment_method;
}

export async function listCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  const subs: Stripe.Subscription[] = [];
  for await (const sub of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
    if (stripeIdOf(sub.customer) === customerId) subs.push(sub);
  }
  return subs;
}

export async function findConfirmedSubscription(customerId: string): Promise<Stripe.Subscription | undefined> {
  const subs = await listCustomerSubscriptions(customerId);
  return subs.find(isConfirmedSubscription);
}

export type StartTrialResult =
  | { ok: true; subscriptionId: string; created: boolean }
  | { ok: false; reason: string; retryable: boolean };

/**
 * Starts the 30-day trial only after the customer's card has been confirmed on
 * a tagged SetupIntent. Shared by /api/payment/verify-subscription and the
 * setup_intent.succeeded webhook, which can run concurrently: the
 * existing-subscription check handles retries and late duplicates, and the
 * Stripe idempotency key covers two calls racing past that check.
 */
export async function startTrialFromSetupIntent(
  setupIntentId: string,
  expectedCustomerId?: string
): Promise<StartTrialResult> {
  if (typeof setupIntentId !== "string" || !setupIntentId.startsWith("seti_")) {
    return { ok: false, reason: "Invalid setup reference", retryable: false };
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const customerId = stripeIdOf(setupIntent.customer as any);
  const paymentMethodId = stripeIdOf(setupIntent.payment_method as any);

  if (setupIntent.metadata?.purpose !== TRIAL_SETUP_PURPOSE) {
    return { ok: false, reason: "Setup is not a trial checkout", retryable: false };
  }
  if (!customerId || (expectedCustomerId && customerId !== expectedCustomerId)) {
    return { ok: false, reason: "Setup does not belong to this account", retryable: false };
  }
  if (setupIntent.status !== "succeeded" || !paymentMethodId) {
    const retryable = setupIntent.status === "processing";
    return { ok: false, reason: `Payment method not confirmed (${setupIntent.status})`, retryable };
  }

  const subscriptions = await listCustomerSubscriptions(customerId);

  const fromThisSetup = subscriptions.find((s) => s.metadata?.eatinout_setup_intent === setupIntent.id);
  if (fromThisSetup) return { ok: true, subscriptionId: fromThisSetup.id, created: false };

  const confirmed = subscriptions.find(isConfirmedSubscription);
  if (confirmed) return { ok: true, subscriptionId: confirmed.id, created: false };

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, has_subscribed_before")
    .eq("stripe_customer_id", customerId)
    .limit(1)
    .maybeSingle();
  if (userError) throw new Error(userError.message);
  if (!userRow) return { ok: false, reason: "User not found", retryable: true };
  if (userRow.has_subscribed_before) {
    return { ok: false, reason: "Account is not eligible for a free trial", retryable: false };
  }

  const priceId = setupIntent.metadata?.price_id;
  if (!priceId || !/^price_[A-Za-z0-9]{1,250}$/.test(priceId)) {
    return { ok: false, reason: "Checkout plan is missing", retryable: false };
  }

  let promotionCodeId: string | undefined = setupIntent.metadata?.promotion_code_id || undefined;
  if (promotionCodeId) {
    const promo = await stripe.promotionCodes.retrieve(promotionCodeId);
    if (!promo.active) {
      console.warn(`[start-trial] Promotion code ${promotionCodeId} is no longer active; starting trial without it`);
      promotionCodeId = undefined;
    }
  }

  const referral = setupIntent.metadata?.rewardful_referral;
  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: TRIAL_DAYS,
      default_payment_method: paymentMethodId,
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      metadata: {
        eatinout_setup_intent: setupIntent.id,
        ...(referral ? { rewardful_referral: referral } : {}),
      },
    },
    { idempotencyKey: `eatinout-trial-${setupIntent.id}` }
  );

  return { ok: true, subscriptionId: subscription.id, created: true };
}
