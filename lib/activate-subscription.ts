import Stripe from "stripe";
import supabaseAdmin from "@/lib/supabase/admin";
import sendEmail from "@/lib/sendEmail";
import { render } from "@react-email/render";
import { SubscriptionConfirmationEmail } from "@/utils/email-templates/subscription-confirmation";
import { WelcomeEmail } from "@/utils/email-templates/welcome";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Signup page uses the *_DISCOUNT price IDs, so both sets are listed here.
const PLANS = [
  { name: "Monthly", price: "£4.99", period: "/month", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID },
  { name: "6 Months", price: "£29.94", period: "/6 months", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS },
  { name: "6 Months", price: "£25.45", period: "/6 months", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS_DISCOUNT },
  { name: "Annual", price: "£59.88", period: "/year", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR },
  { name: "Annual", price: "£47.90", period: "/year", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR_DISCOUNT },
  { name: "18 Months", price: "£89.82", period: "", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_18MONTHS },
];

// Supabase: columns returned to callers + mapping to the camelCase user shape they use
const USER_COLUMNS = "id, email, role, first_name, subscription_status, is_trialing";
const mapUser = (row: any) =>
  row
    ? {
        _id: row.id,
        email: row.email,
        role: row.role,
        firstName: row.first_name,
        subscriptionStatus: row.subscription_status,
        isTrialing: row.is_trialing,
      }
    : null;

/**
 * Same job the old verify-checkout-session did: update status, voucher,
 * hasSubscribedBefore, clear selectedPriceId, and send Welcome + Confirmation
 * emails. Safe to call from both the client verify route and the webhook:
 * the atomic claim below guarantees emails go out only once.
 */
export async function activateSubscription(subscriptionId: string, expectedCustomerId?: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice", "discounts.promotion_code"],
  });

  const customerId = subscription.customer as string;
  if (expectedCustomerId && expectedCustomerId !== customerId) {
    return { ok: false as const, reason: "Subscription does not belong to user" };
  }
  if (subscription.status !== "trialing" && subscription.status !== "active") {
    return { ok: false as const, reason: `Subscription status is ${subscription.status}` };
  }

  // Voucher code
  let usedVoucherCode: string | null | undefined = undefined;
  try {
    const sub: any = subscription;
    const discount = sub.discounts?.[0] ?? sub.discount;
    let promo = discount?.promotion_code;
    if (typeof promo === "string") promo = await stripe.promotionCodes.retrieve(promo);
    usedVoucherCode = promo?.code ?? null;
  } catch (e) {
    console.error("[Activate] voucher lookup failed:", e);
  }

  const isTrialing = subscription.status === "trialing";
  const update: any = {
    subscription_status: isTrialing ? "inactive" : "active",
    is_trialing: isTrialing,
    subscription_id: subscription.id,
    has_subscribed_before: true,
    selected_price_id: null,
  };
  if (usedVoucherCode !== undefined) update.used_voucher_code = usedVoucherCode;

  // Atomic claim: only ONE caller gets the user back and sends the emails.
  // (A single UPDATE ... WHERE is atomic in Postgres: a concurrent caller re-checks the
  // WHERE after the first commit and no longer matches. NULL subscription_id counts as "not equal".)
  const { data: claimedRows, error: claimError } = await supabaseAdmin
    .from("users")
    .update({ ...update, welcome_email_sent: true })
    .eq("stripe_customer_id", customerId)
    .or(`welcome_email_sent.eq.false,subscription_id.is.null,subscription_id.neq.${subscription.id}`)
    .select(USER_COLUMNS);
  if (claimError) throw new Error(claimError.message);
  const claimed = mapUser(claimedRows?.[0]);

  if (!claimed) {
    // Already activated + emailed (by webhook or an earlier call)
    const { data: existingRow, error: existingError } = await supabaseAdmin
      .from("users")
      .select(USER_COLUMNS)
      .eq("stripe_customer_id", customerId)
      .limit(1)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    const existing = mapUser(existingRow);
    return { ok: true as const, user: existing, emailsSent: false };
  }

  const user = claimed;

  // Renewal / trial-end par DB update ho chuka hai, bas mail mat bhejo.
  const latestInv: any = subscription.latest_invoice;
  const billingReason = typeof latestInv === "object" ? latestInv?.billing_reason : undefined;
  if (billingReason && billingReason !== "subscription_create") {
    return { ok: true as const, user, emailsSent: false };
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const selectedPlan = PLANS.find((p) => p.priceId && p.priceId === priceId) ?? PLANS[0];

  const trialEndDate = new Date();
  if (subscription.trial_end) trialEndDate.setTime(subscription.trial_end * 1000);
  else trialEndDate.setDate(trialEndDate.getDate() + 30);

  const sendWelcome = async () => {
    try {
      const html = await render(
        WelcomeEmail({
          firstName: user.firstName,
          trialEndDate: trialEndDate.toISOString(),
          selectedPlan: { name: selectedPlan.name, price: selectedPlan.price, period: selectedPlan.period },
        })
      );
      await sendEmail(user.email, "Welcome to Eatinout - Your 30 days free Trial Starts Now!", html);
      console.log("Welcome email sent successfully to:", user.email);
      return true;
    } catch (e) {
      console.error("Error sending welcome email:", e);
      return false;
    }
  };

  const sendConfirmation = async () => {
    try {
      const inv: any = subscription.latest_invoice;
      const amountTotal = typeof inv === "object" && inv ? (inv.amount_paid ?? inv.amount_due ?? 0) : 0;
      const currency = (typeof inv === "object" && inv?.currency) || "gbp";
      const html = await render(
        SubscriptionConfirmationEmail({
          firstName: user.firstName,
          planName: selectedPlan.name,
          amount: `${(amountTotal / 100).toFixed(2)} ${currency.toUpperCase()}`,
          billingDate: "15th of each month",
          startDate: new Date().toISOString(),
        })
      );
      await sendEmail(user.email, "Your Subscription is Confirmed!", html);
      console.log("Subscription confirmation email sent successfully to:", user.email);
      return true;
    } catch (e) {
      console.error("Error sending subscription confirmation email:", e);
      return false;
    }
  };

  // Both emails go out in parallel to keep the checkout wait short.
  const [welcomeOk, confirmOk] = await Promise.all([sendWelcome(), sendConfirmation()]);

  // If both emails failed, release the claim so a retry (webhook) can resend.
  if (!welcomeOk && !confirmOk) {
    const { error: releaseError } = await supabaseAdmin
      .from("users")
      .update({ welcome_email_sent: false })
      .eq("id", user._id);
    if (releaseError) throw new Error(releaseError.message);
  }

  return { ok: true as const, user, emailsSent: welcomeOk || confirmOk };
}