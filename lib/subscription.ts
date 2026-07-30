// Shared client/server types + helpers for the normalized subscription object
// returned by GET /api/subscriptions.

export type EffectiveStatus =
  | "trialing"
  | "active"
  | "scheduled_cancellation"
  | "cancelled_with_access"
  | "cancelled"
  | "past_due"
  | "inactive";

export interface NormalizedSubscription {
  subscriptionId: string;
  status: string;
  effectiveStatus: EffectiveStatus;
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
  trialExtensionUsed?: boolean;
  retentionDiscountUsed?: boolean;
}

/** Format an ISO date string as e.g. "12 August 2026" (UK). */
export function formatUKDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Whole days remaining until an ISO date (never negative). */
export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return 0;
  const diffMs = target - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/** Human "18 days remaining" / "1 day remaining" / "Ends today". */
export function daysRemainingLabel(iso: string | null | undefined): string {
  const days = daysUntil(iso);
  if (days <= 0) return "Ends today";
  if (days === 1) return "1 day remaining";
  return `${days} days remaining`;
}

/** Friendly billing cadence, e.g. "per month", "every 6 months", "per year". */
export function billingCadence(
  interval: string | null | undefined,
  count: number | null | undefined
): string {
  const c = count ?? 1;
  if (!interval) return "";
  if (interval === "month" && c === 1) return "per month";
  if (interval === "year" && c === 1) return "per year";
  if (interval === "week" && c === 1) return "per week";
  if (interval === "day" && c === 1) return "per day";
  return `every ${c} ${interval}${c > 1 ? "s" : ""}`;
}

/** Segment string used for analytics (no personal data). */
export function subscriptionSegment(sub: NormalizedSubscription | null): string {
  if (!sub) return "none";
  if (sub.isTrialing) return "trial";
  if (sub.effectiveStatus === "scheduled_cancellation") return "scheduled_cancellation";
  if (sub.effectiveStatus === "cancelled_with_access") return "cancelled_with_access";
  if (sub.effectiveStatus === "cancelled" || sub.effectiveStatus === "inactive") return "inactive";
  const c = sub.billingIntervalCount ?? 1;
  if (sub.billingInterval === "month" && c === 1) return "monthly";
  if (sub.billingInterval === "month" && c === 6) return "six_month";
  if (sub.billingInterval === "year") return "annual";
  return "paid";
}

// ---------------------------------------------------------------------------
// Authoritative membership resolver (single source of truth for access)
// ---------------------------------------------------------------------------

/**
 * The ONLY statuses that grant access to member offers. This is the effective
 * rule required across the whole app: access is granted when — and only when —
 * the latest Stripe subscription status is `active` or `trialing`. Every other
 * status (`past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`,
 * `paused`, …) removes access.
 */
export function isAccessGrantingStripeStatus(stripeStatus: string | null | undefined): boolean {
  return stripeStatus === "active" || stripeStatus === "trialing";
}

/** Fields we persist on the existing User document (no schema change). */
export interface ResolvedMembership {
  /** True only when the Stripe status is `active` or `trialing`. */
  hasAccess: boolean;
  /** Mirrors Stripe `trialing`; drives the existing trial-access gate. */
  isTrialing: boolean;
  /**
   * Enum-safe value for the existing `User.subscriptionStatus` field, whose
   * schema only permits: "active" | "inactive" | "cancelled" |
   * "cancelled_with_access". We never introduce new enum values.
   */
  subscriptionStatus: "active" | "inactive" | "cancelled" | "cancelled_with_access";
}

/**
 * Map a live Stripe subscription onto the existing User fields. Used by the
 * Stripe webhook (real-time) so a failed recurring payment immediately removes
 * access, and available to any other server path that must stay consistent.
 *
 * Mapping (uses only the existing enum values):
 *  - active  + cancel_at_period_end  -> "cancelled_with_access" (still has access)
 *  - active                          -> "active"                (has access)
 *  - trialing                        -> "inactive" + isTrialing (has access via trial gate)
 *  - trialing + cancel_at_period_end -> "cancelled_with_access" + isTrialing (has access)
 *  - canceled                        -> "cancelled"             (no access)
 *  - past_due/unpaid/incomplete/
 *    incomplete_expired/paused/other -> "inactive"              (no access, recoverable)
 */
export function resolveMembershipFromStripe(subscription: {
  status?: string | null;
  cancel_at_period_end?: boolean | null;
}): ResolvedMembership {
  const status = subscription?.status ?? "";
  const cancelAtPeriodEnd = !!subscription?.cancel_at_period_end;

  if (status === "active") {
    return {
      hasAccess: true,
      isTrialing: false,
      subscriptionStatus: cancelAtPeriodEnd ? "cancelled_with_access" : "active",
    };
  }

  if (status === "trialing") {
    return {
      hasAccess: true,
      isTrialing: true,
      subscriptionStatus: cancelAtPeriodEnd ? "cancelled_with_access" : "inactive",
    };
  }

  if (status === "canceled") {
    return { hasAccess: false, isTrialing: false, subscriptionStatus: "cancelled" };
  }

  // past_due, unpaid, incomplete, incomplete_expired, paused, and anything else.
  // "inactive" (with isTrialing=false) is the existing no-access state and lets
  // the subscription recover to "active" later (e.g. dunning succeeds, resume).
  return { hasAccess: false, isTrialing: false, subscriptionStatus: "inactive" };
}
