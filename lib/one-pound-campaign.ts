// Rules for the EatinOut x WTF Giveaways "£1 first month" campaign.
// Constants are safe to import from client components; the config reader and
// validators are only meaningful on the server (they read server-only env vars).

export const ONE_POUND_CAMPAIGN_ID = "one_pound_2026";
export const ONE_POUND_CAMPAIGN_PARAM = "one-pound";
export const ONE_POUND_CHECKOUT_PATH = `/checkout?campaign=${ONE_POUND_CAMPAIGN_PARAM}`;
export const ONE_POUND_JOIN_PATH = `/join?plan=premium&campaign=${ONE_POUND_CAMPAIGN_PARAM}`;

// Set on a campaign subscription that was cancelled before payment because
// its amount could not be verified, so it never counts against eligibility.
export const VOIDED_METADATA_KEY = "campaign_checkout";
export const VOIDED_METADATA_VALUE = "voided";

export const ONE_POUND_EXPECTED = {
  currency: "gbp",
  baseAmount: 499,
  couponAmountOff: 399,
  firstPaymentAmount: 100,
} as const;

const PRICE_ID_PATTERN = /^price_[A-Za-z0-9]{1,250}$/;
const COUPON_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isOnePoundCampaignParam(value: unknown): boolean {
  return value === ONE_POUND_CAMPAIGN_PARAM;
}

export type OnePoundConfig =
  | { ok: true; couponId: string; priceId: string }
  | { ok: false; code: "campaign_unavailable" | "campaign_misconfigured"; message: string; detail: string };

const UNAVAILABLE_MESSAGE = "The £1 first month offer isn't available right now.";
const MISCONFIGURED_MESSAGE =
  "We couldn't confirm the £1 offer price, so no payment has been taken. Please try again later.";

export function getOnePoundConfig(env: Record<string, string | undefined> = process.env): OnePoundConfig {
  if (env.ONE_POUND_CHECKOUT_ENABLED !== "true") {
    return { ok: false, code: "campaign_unavailable", message: UNAVAILABLE_MESSAGE, detail: "feature flag disabled" };
  }
  const couponId = env.STRIPE_ONE_POUND_COUPON_ID?.trim();
  if (!couponId || !COUPON_ID_PATTERN.test(couponId)) {
    return { ok: false, code: "campaign_misconfigured", message: MISCONFIGURED_MESSAGE, detail: "coupon env var missing or malformed" };
  }
  const priceId = env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim();
  if (!priceId || !PRICE_ID_PATTERN.test(priceId)) {
    return { ok: false, code: "campaign_misconfigured", message: MISCONFIGURED_MESSAGE, detail: "monthly price env var missing or malformed" };
  }
  return { ok: true, couponId, priceId };
}

export function isOnePoundCheckoutEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return getOnePoundConfig(env).ok;
}

export function misconfiguredResult(detail: string) {
  return { ok: false as const, code: "campaign_misconfigured" as const, message: MISCONFIGURED_MESSAGE, detail };
}

type SubscriptionLike = {
  id?: string;
  status?: string | null;
  metadata?: Record<string, string> | null;
};

export function isOnePoundSubscription(sub: SubscriptionLike): boolean {
  return sub.metadata?.campaign === ONE_POUND_CAMPAIGN_ID;
}

export function isVoidedOnePoundSubscription(sub: SubscriptionLike): boolean {
  return isOnePoundSubscription(sub) && sub.metadata?.[VOIDED_METADATA_KEY] === VOIDED_METADATA_VALUE;
}

// Subscriptions that never took a payment or started a trial.
const NEVER_STARTED_STATUSES = new Set(["incomplete", "incomplete_expired"]);

export type OnePoundEligibility = { eligible: true } | { eligible: false; reason: string };

/**
 * New members only: no recorded subscription on the account and no Stripe
 * subscription that ever reached a trial, paid or cancelled state. Unpaid
 * checkout attempts (incomplete / expired) and voided campaign attempts don't count.
 */
export function evaluateOnePoundEligibility({
  hasSubscribedBefore,
  subscriptions,
}: {
  hasSubscribedBefore: boolean | null | undefined;
  subscriptions: SubscriptionLike[];
}): OnePoundEligibility {
  if (hasSubscribedBefore) return { eligible: false, reason: "account has subscribed before" };
  const previous = subscriptions.find(
    (sub) => !isVoidedOnePoundSubscription(sub) && !NEVER_STARTED_STATUSES.has(sub.status ?? "")
  );
  if (previous) return { eligible: false, reason: `previous subscription ${previous.id} is ${previous.status}` };
  return { eligible: true };
}

/** An unpaid campaign checkout that can be resumed with its original £1 invoice. */
export function findResumableOnePoundSubscription<T extends SubscriptionLike>(subscriptions: T[]): T | undefined {
  return subscriptions.find(
    (sub) => sub.status === "incomplete" && isOnePoundSubscription(sub) && !isVoidedOnePoundSubscription(sub)
  );
}

// Stable per attempt: concurrent submissions see the same count and share one
// subscription; once an attempt expires the count moves on and a new key is used.
export function onePoundIdempotencyKey(customerId: string, subscriptions: SubscriptionLike[]): string {
  const attempt = subscriptions.filter(isOnePoundSubscription).length;
  return `eatinout-${ONE_POUND_CAMPAIGN_ID}-${customerId}-${attempt}`;
}

function idOf(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return undefined;
}

type PriceLike = {
  id?: string;
  active?: boolean;
  type?: string;
  currency?: string;
  unit_amount?: number | null;
  tax_behavior?: string | null;
  product?: unknown;
  recurring?: { interval?: string; interval_count?: number; trial_period_days?: number | null } | null;
};

export function validateOnePoundPrice(price: PriceLike | null | undefined, priceId: string): string | null {
  if (!price || price.id !== priceId) return "monthly price not found";
  if (!price.active) return "monthly price is inactive";
  if (price.type !== "recurring") return "monthly price is not recurring";
  if (price.currency !== ONE_POUND_EXPECTED.currency) return `price currency is ${price.currency}`;
  if (price.unit_amount !== ONE_POUND_EXPECTED.baseAmount) return `price amount is ${price.unit_amount}`;
  if (price.recurring?.interval !== "month" || (price.recurring?.interval_count ?? 1) !== 1) {
    return "price is not billed monthly";
  }
  if (price.tax_behavior === "exclusive") return "price adds tax on top";
  return null;
}

type CouponLike = {
  id?: string;
  deleted?: boolean;
  valid?: boolean;
  amount_off?: number | null;
  percent_off?: number | null;
  currency?: string | null;
  duration?: string;
  applies_to?: { products?: string[] } | null;
};

export function validateOnePoundCoupon(
  coupon: CouponLike | null | undefined,
  couponId: string,
  productId: string | undefined
): string | null {
  if (!coupon || coupon.deleted || coupon.id !== couponId) return "coupon not found";
  if (coupon.valid !== true) return "coupon is no longer valid";
  if (coupon.percent_off) return "coupon is a percentage discount";
  if (coupon.amount_off !== ONE_POUND_EXPECTED.couponAmountOff) return `coupon amount_off is ${coupon.amount_off}`;
  if (coupon.currency !== ONE_POUND_EXPECTED.currency) return `coupon currency is ${coupon.currency}`;
  if (coupon.duration !== "once") return `coupon duration is ${coupon.duration}`;
  const products = coupon.applies_to?.products;
  if (products && products.length > 0 && (!productId || !products.includes(productId))) {
    return "coupon does not apply to the Premium product";
  }
  return null;
}

export function priceProductId(price: PriceLike | null | undefined): string | undefined {
  return idOf(price?.product);
}

type DiscountLike = {
  coupon?: unknown;
  source?: { coupon?: unknown } | null;
  promotion_code?: unknown;
};

function couponIdOfDiscount(discount: unknown): string | undefined {
  if (!discount || typeof discount !== "object") return undefined;
  const d = discount as DiscountLike;
  return idOf(d.source?.coupon) ?? idOf(d.coupon);
}

type InvoiceLike = {
  id?: string;
  status?: string | null;
  currency?: string;
  billing_reason?: string | null;
  subtotal?: number;
  total?: number;
  amount_due?: number;
  amount_remaining?: number;
  total_discount_amounts?: { amount: number }[] | null;
};

type VerifiableSubscription = SubscriptionLike & {
  trial_end?: number | null;
  discounts?: unknown[] | null;
  items?: { data: { price?: { id?: string } | null }[] };
};

/**
 * Last check before the customer is shown a card form: the open first invoice
 * must be exactly £1.00 GBP (£4.99 less the £3.99 campaign coupon and nothing
 * else), with no trial. Any mismatch returns a reason and checkout fails closed.
 */
export function verifyOnePoundFirstInvoice(
  subscription: VerifiableSubscription,
  invoice: InvoiceLike | null | undefined,
  { couponId, priceId }: { couponId: string; priceId: string }
): string | null {
  if (subscription.status !== "incomplete") return `subscription status is ${subscription.status}`;
  if (subscription.trial_end) return "subscription has a trial";
  if (!isOnePoundSubscription(subscription)) return "subscription is missing campaign metadata";

  const items = subscription.items?.data ?? [];
  if (items.length !== 1 || items[0]?.price?.id !== priceId) return "subscription is not on the monthly price";

  const discounts = subscription.discounts ?? [];
  if (discounts.length !== 1) return `subscription has ${discounts.length} discounts`;
  if (couponIdOfDiscount(discounts[0]) !== couponId) return "subscription discount is not the campaign coupon";

  if (!invoice) return "first invoice missing";
  if (invoice.status !== "open") return `first invoice status is ${invoice.status}`;
  if (invoice.billing_reason !== "subscription_create") return `invoice billing_reason is ${invoice.billing_reason}`;
  if (invoice.currency !== ONE_POUND_EXPECTED.currency) return `invoice currency is ${invoice.currency}`;
  if (invoice.subtotal !== ONE_POUND_EXPECTED.baseAmount) return `invoice subtotal is ${invoice.subtotal}`;
  const discountTotal = (invoice.total_discount_amounts ?? []).reduce((sum, d) => sum + (d?.amount ?? 0), 0);
  if (discountTotal !== ONE_POUND_EXPECTED.couponAmountOff) return `invoice discount total is ${discountTotal}`;
  if (invoice.total !== ONE_POUND_EXPECTED.firstPaymentAmount) return `invoice total is ${invoice.total}`;
  if (invoice.amount_due !== ONE_POUND_EXPECTED.firstPaymentAmount) return `invoice amount_due is ${invoice.amount_due}`;
  if ((invoice.amount_remaining ?? invoice.amount_due) !== ONE_POUND_EXPECTED.firstPaymentAmount) {
    return `invoice amount_remaining is ${invoice.amount_remaining}`;
  }
  return null;
}
