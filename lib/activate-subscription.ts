import Stripe from "stripe";
import User from "@/models/User";
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
    subscriptionStatus: isTrialing ? "inactive" : "active",
    isTrialing,
    subscriptionId: subscription.id,
    hasSubscribedBefore: true,
    selectedPriceId: null,
  };
  if (usedVoucherCode !== undefined) update.usedVoucherCode = usedVoucherCode;

  // Atomic claim: only ONE caller gets the user back and sends the emails.
  const claimed = await User.findOneAndUpdate(
    {
      stripeCustomerId: customerId,
      $or: [{ welcomeEmailSent: { $ne: true } }, { subscriptionId: { $ne: subscription.id } }],
    },
    { $set: { ...update, welcomeEmailSent: true } },
    { new: true }
  );

  if (!claimed) {
    // Already activated + emailed (by webhook or an earlier call)
    const existing = await User.findOne({ stripeCustomerId: customerId });
    return { ok: true as const, user: existing, emailsSent: false };
  }

  const user = claimed;
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
    await User.updateOne({ _id: user._id }, { $set: { welcomeEmailSent: false } });
  }

  return { ok: true as const, user, emailsSent: welcomeOk || confirmOk };
}