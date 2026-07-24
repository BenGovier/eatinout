// Subscription retention/cancellation analytics.
// Reuses the existing Google Tag Manager dataLayer pattern (see components/asignup/track.ts).
// Never include personal data (email, name, Stripe IDs, card details).

export type SubscriptionEvent =
  | "manage_subscription_opened"
  | "cancellation_started"
  | "cancellation_reason_selected"
  | "retention_offer_displayed"
  | "retention_offer_accepted"
  | "retention_offer_declined"
  | "cancellation_confirmed"
  | "cancellation_reversed"
  | "trial_extension_applied"
  | "retention_discount_applied";

export interface SubscriptionEventProps {
  subscription_segment?: string;
  billing_interval?: string | null;
  cancellation_reason?: string;
  offer_type?: string;
  is_trialing?: boolean;
  days_remaining?: number;
  cancel_at_period_end?: boolean;
}

export function trackSubscriptionEvent(
  event: SubscriptionEvent,
  props: SubscriptionEventProps = {}
) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  // Strip undefined so we never push empty/PII-ish keys.
  const clean: Record<string, unknown> = { event };
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined && v !== null && v !== "") clean[k] = v;
  }
  w.dataLayer.push(clean);
}
