import {
  ONE_POUND_CAMPAIGN_ID,
  ONE_POUND_EXPECTED,
  VOIDED_METADATA_KEY,
  VOIDED_METADATA_VALUE,
  evaluateOnePoundEligibility,
  findResumableOnePoundSubscription,
  misconfiguredResult,
  onePoundIdempotencyKey,
  priceProductId,
  validateOnePoundCoupon,
  validateOnePoundPrice,
  verifyOnePoundFirstInvoice,
} from "@/lib/one-pound-campaign";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Only the Stripe calls this flow makes, so tests can supply a fake client.
export type OnePoundStripe = {
  coupons: { retrieve(id: string, params?: any): Promise<any> };
  prices: { retrieve(id: string, params?: any): Promise<any> };
  subscriptions: {
    create(params: any, options?: any): Promise<any>;
    retrieve(id: string, params?: any): Promise<any>;
    update(id: string, params: any): Promise<any>;
    cancel(id: string, params?: any): Promise<any>;
  };
  invoices: {
    retrieve(id: string, params?: any): Promise<any>;
    voidInvoice(id: string, params?: any): Promise<any>;
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export type OnePoundDeps = {
  stripe: OnePoundStripe;
  listCustomerSubscriptions(customerId: string): Promise<{ id: string; status: string; metadata?: Record<string, string> | null }[]>;
  /** Persists plan, referral and campaign attribution. Runs before anything is created in Stripe. */
  saveCheckout(userId: string, details: { priceId: string; rewardfulReferral: string | null }): Promise<void>;
  sleep?(ms: number): Promise<void>;
  log?(message: string, detail?: unknown): void;
};

export type OnePoundCheckoutInput = {
  couponId: string;
  priceId: string;
  userId: string;
  stripeCustomerId: string;
  hasSubscribedBefore: boolean | null | undefined;
  rewardfulReferral: string | null | undefined;
};

export type OnePoundCheckoutResult = { status: number; body: Record<string, unknown> };

const INELIGIBLE_MESSAGE =
  "The £1 first month offer is for new EatinOut members who haven't had a membership or free trial before.";
const IN_PROGRESS_MESSAGE = "Your £1 checkout is already being set up. Please refresh the page in a moment.";

function failClosed(detail: string): OnePoundCheckoutResult {
  const result = misconfiguredResult(detail);
  return { status: 503, body: { error: result.message, code: result.code } };
}

function invoiceIdOf(subscription: { latest_invoice?: unknown }): string | undefined {
  const inv = subscription.latest_invoice;
  if (typeof inv === "string") return inv;
  if (inv && typeof inv === "object" && typeof (inv as { id?: unknown }).id === "string") return (inv as { id: string }).id;
  return undefined;
}

function isIdempotencyConflict(error: unknown): boolean {
  const e = error as { type?: string; rawType?: string; code?: string } | null;
  return e?.type === "StripeIdempotencyError" || e?.rawType === "idempotency_error" || e?.code === "idempotency_key_in_use";
}

/**
 * Starts (or resumes) a £1 first-month checkout on the existing £4.99 monthly
 * price. The customer is charged the first invoice immediately (no trial);
 * Premium is activated later by activateSubscription once Stripe reports the
 * subscription active, exactly like the existing paid path.
 */
export async function startOnePoundCheckout(
  deps: OnePoundDeps,
  input: OnePoundCheckoutInput
): Promise<OnePoundCheckoutResult> {
  const { stripe } = deps;
  const log = deps.log ?? ((message: string, detail?: unknown) => console.error(`[one-pound] ${message}`, detail ?? ""));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const { couponId, priceId, userId, stripeCustomerId } = input;
  const rewardfulReferral = input.rewardfulReferral || null;

  let subscriptions = await deps.listCustomerSubscriptions(stripeCustomerId);
  const eligibility = evaluateOnePoundEligibility({ hasSubscribedBefore: input.hasSubscribedBefore, subscriptions });
  if (!eligibility.eligible) {
    return { status: 409, body: { error: INELIGIBLE_MESSAGE, code: "campaign_ineligible" } };
  }

  const [price, coupon] = await Promise.all([
    stripe.prices.retrieve(priceId).catch(() => null),
    stripe.coupons.retrieve(couponId, { expand: ["applies_to"] }).catch(() => null),
  ]);
  const configError =
    validateOnePoundPrice(price, priceId) ?? validateOnePoundCoupon(coupon, couponId, priceProductId(price));
  if (configError) {
    log("Campaign configuration rejected", configError);
    return failClosed(configError);
  }

  await deps.saveCheckout(userId, { priceId, rewardfulReferral });

  let subscriptionId = findResumableOnePoundSubscription(subscriptions)?.id;
  if (!subscriptionId) {
    const params = {
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      discounts: [{ coupon: couponId }],
      payment_behavior: "default_incomplete",
      trial_from_plan: false,
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      metadata: {
        campaign: ONE_POUND_CAMPAIGN_ID,
        eatinout_user_id: userId,
        ...(rewardfulReferral ? { rewardful_referral: rewardfulReferral } : {}),
      },
    };
    const idempotencyKey = onePoundIdempotencyKey(stripeCustomerId, subscriptions);
    try {
      const created = await stripe.subscriptions.create(params, { idempotencyKey });
      subscriptionId = created.id as string;
    } catch (error) {
      if (!isIdempotencyConflict(error)) throw error;
      // A duplicate submission is creating the same subscription right now.
      await sleep(1500);
      subscriptions = await deps.listCustomerSubscriptions(stripeCustomerId);
      subscriptionId = findResumableOnePoundSubscription(subscriptions)?.id;
      if (!subscriptionId) return { status: 409, body: { error: IN_PROGRESS_MESSAGE, code: "checkout_in_progress" } };
    }
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["discounts", "items.data.price"],
  });
  const invoiceId = invoiceIdOf(subscription);
  const invoice = invoiceId
    ? await stripe.invoices.retrieve(invoiceId, { expand: ["confirmation_secret"] }).catch(() => null)
    : null;

  const invoiceError = verifyOnePoundFirstInvoice(subscription, invoice, { couponId, priceId });
  if (invoiceError) {
    log(`First invoice for ${subscriptionId} rejected; voiding checkout`, invoiceError);
    await voidCheckout(stripe, subscriptionId, invoiceId, log);
    return failClosed(invoiceError);
  }

  const clientSecret: string | undefined = invoice?.confirmation_secret?.client_secret;
  if (!clientSecret) {
    log(`No confirmation secret for invoice ${invoiceId}`);
    return { status: 500, body: { error: "Could not initialize payment" } };
  }

  return {
    status: 200,
    body: {
      clientSecret,
      subscriptionId,
      mode: "payment",
      campaign: ONE_POUND_CAMPAIGN_ID,
      pricing: {
        baseAmount: ONE_POUND_EXPECTED.baseAmount,
        discountedAmount: ONE_POUND_EXPECTED.baseAmount,
        currency: ONE_POUND_EXPECTED.currency,
        interval: "month",
        intervalCount: 1,
        discountLabel: "£1 first month",
        firstPaymentAmount: invoice.amount_due,
      },
    },
  };
}

// Tags first so eligibility ignores it even if a later call fails, then makes
// the invoice unpayable and ends the subscription.
async function voidCheckout(
  stripe: OnePoundStripe,
  subscriptionId: string,
  invoiceId: string | undefined,
  log: (message: string, detail?: unknown) => void
) {
  try {
    await stripe.subscriptions.update(subscriptionId, { metadata: { [VOIDED_METADATA_KEY]: VOIDED_METADATA_VALUE } });
  } catch (error) {
    log(`Could not tag ${subscriptionId} as voided`, error);
  }
  if (invoiceId) {
    try {
      await stripe.invoices.voidInvoice(invoiceId);
    } catch (error) {
      log(`Could not void invoice ${invoiceId}`, error);
    }
  }
  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    log(`Could not cancel ${subscriptionId}`, error);
  }
}
