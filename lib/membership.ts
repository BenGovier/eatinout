import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveMembershipFromStripe } from "@/lib/subscription";

export type PremiumAccessResult =
  | { status: "granted"; stripeStatus: string }
  | { status: "denied"; reason: "user_not_found" | "no_subscription" | "subscription_not_entitled" }
  | { status: "unverifiable"; reason: string };

type StripeSubscriptionLike = {
  status?: string | null;
  cancel_at_period_end?: boolean | null;
};

export interface MembershipDeps {
  getUserBilling: (
    userId: string
  ) => Promise<{ subscriptionId: string | null; stripeCustomerId: string | null } | null>;
  retrieveSubscription: (subscriptionId: string) => Promise<StripeSubscriptionLike>;
  listCustomerSubscriptions: (customerId: string) => Promise<StripeSubscriptionLike[]>;
}

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Matches the API version pinned in app/api/subscriptions/route.ts.
      // @ts-expect-error - intentionally pinning a non-latest API version at runtime
      apiVersion: "2023-10-16",
    });
  }
  return stripeClient;
}

const defaultDeps: MembershipDeps = {
  async getUserBilling(userId) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("subscription_id, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`User lookup failed: ${error.message}`);
    if (!data) return null;
    return {
      subscriptionId: data.subscription_id ?? null,
      stripeCustomerId: data.stripe_customer_id ?? null,
    };
  },
  async retrieveSubscription(subscriptionId) {
    return getStripe().subscriptions.retrieve(subscriptionId);
  },
  async listCustomerSubscriptions(customerId) {
    const list = await getStripe().subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    return list.data;
  },
};

/**
 * Server-side Premium entitlement check based on the live Stripe subscription,
 * using the same rule as GET /api/subscriptions (resolveMembershipFromStripe):
 * access only while Stripe reports `active` (including cancel_at_period_end)
 * or `trialing`. Never trusts registration_type, cached DB status or JWT claims.
 */
export async function checkPremiumAccess(
  userId: string,
  deps: MembershipDeps = defaultDeps
): Promise<PremiumAccessResult> {
  if (!userId) return { status: "denied", reason: "user_not_found" };

  try {
    const billing = await deps.getUserBilling(userId);
    if (!billing) return { status: "denied", reason: "user_not_found" };

    if (billing.subscriptionId) {
      const subscription = await deps.retrieveSubscription(billing.subscriptionId);
      if (resolveMembershipFromStripe(subscription).hasAccess) {
        return { status: "granted", stripeStatus: subscription.status ?? "" };
      }
    }

    // Covers a stored subscription_id that is stale or not yet written by the webhook.
    if (billing.stripeCustomerId) {
      const subscriptions = await deps.listCustomerSubscriptions(billing.stripeCustomerId);
      const entitled = subscriptions.find((s) => resolveMembershipFromStripe(s).hasAccess);
      if (entitled) return { status: "granted", stripeStatus: entitled.status ?? "" };
    }

    if (!billing.subscriptionId && !billing.stripeCustomerId) {
      return { status: "denied", reason: "no_subscription" };
    }
    return { status: "denied", reason: "subscription_not_entitled" };
  } catch (error) {
    return {
      status: "unverifiable",
      reason: error instanceof Error ? error.message : "Unknown entitlement error",
    };
  }
}
