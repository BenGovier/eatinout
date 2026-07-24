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
