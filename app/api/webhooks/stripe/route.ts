// app/api/webhooks/stripe/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import sendEmail from '@/lib/sendEmail';
import { render } from '@react-email/render';
import { SubscriptionConfirmationEmail } from '@/utils/email-templates/subscription-confirmation';
import { WelcomeEmail } from '@/utils/email-templates/welcome';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// Keep in sync with the plans shown during signup / checkout
const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: "£4.99",
    period: "/month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
  },
  {
    id: "six",
    name: "6 Months",
    price: "£29.94",
    period: "/6 months",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS,
  },
  {
    id: "annual",
    name: "Annual",
    price: "£59.88",
    period: "/year",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR,
  },
  {
    id: "eighteen",
    name: "18 Months",
    price: "£89.82",
    period: "",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_18MONTHS,
  },
];

/**
 * Sync subscription status + voucher code onto the user record. Called on
 * every created/updated event so status and voucher always stay current.
 * This function NEVER sends emails — that only happens once we have proof
 * of an actually-confirmed payment method (see sendActivationEmailsIfNeeded).
 */
async function syncSubscriptionToUser(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.warn(`[Webhook] No user found for customer ${customerId}`);
    return;
  }

  let ourStatus = 'inactive';
  let isTrialing = false;

  if (status === 'trialing') {
    ourStatus = 'inactive';
    isTrialing = true;
  } else if (status === 'active') {
    ourStatus = 'active';
    isTrialing = false;
  } else if (status === 'canceled') {
    ourStatus = 'cancelled';
    isTrialing = false;
  } else {
    // incomplete, incomplete_expired, past_due, unpaid, paused
    ourStatus = 'inactive';
    isTrialing = false;
  }

  // Capture voucher code (if any) whenever we see this subscription —
  // do this regardless of status so it's always kept up to date.
  let usedVoucherCode: string | null = null;
  try {
    const full = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['discounts.promotion_code'],
    });
    const promo = (full.discounts?.[0] as any)?.promotion_code;
    if (promo && promo.code) {
      usedVoucherCode = promo.code;
    }
  } catch (expandErr) {
    console.error('[Webhook] Error expanding subscription for voucher info:', expandErr);
  }

  user.subscriptionStatus = ourStatus;
  user.isTrialing = isTrialing;
  user.subscriptionId = subscription.id;
  user.usedVoucherCode = usedVoucherCode;
  user.stripeCustomerId = customerId;
  await user.save();

  console.log(`[Webhook] Synced user ${user.email} — status: ${ourStatus}, trialing: ${isTrialing}, voucher: ${usedVoucherCode ?? "none"}`);
}

/**
 * Sends the welcome + subscription confirmation emails exactly once, only
 * once we have proof the customer actually confirmed a card (SetupIntent
 * or PaymentIntent succeeded). Idempotent via user.welcomeEmailSent.
 */
async function sendActivationEmailsIfNeeded(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice'],
  });

  const customerId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.warn(`[Webhook] No user found for customer ${customerId} when sending emails`);
    return;
  }

  // Idempotency: only send once per subscription
  if (user.welcomeEmailSent && user.subscriptionId === subscription.id) {
    console.log(`[Webhook] Emails already sent for subscription ${subscription.id}, skipping`);
    return;
  }

  const selectedPriceId = subscription.items.data[0]?.price?.id;
  const selectedPlan = PLANS.find((plan) => plan.priceId === selectedPriceId) ?? PLANS[0];

  const trialEndDate = new Date();
  if (subscription.trial_end) {
    trialEndDate.setTime(subscription.trial_end * 1000);
  } else {
    trialEndDate.setDate(trialEndDate.getDate() + 30);
  }

  // Send Welcome Email
  try {
    const welcomeEmailHtml = await render(
      WelcomeEmail({
        firstName: user.firstName,
        trialEndDate: trialEndDate.toISOString(),
        selectedPlan: {
          name: selectedPlan.name,
          price: selectedPlan.price,
          period: selectedPlan.period,
        },
      })
    );
    await sendEmail(
      user.email,
      "Welcome to Eatinout - Your 30 days free Trial Starts Now!",
      welcomeEmailHtml
    );
    console.log("[Webhook] Welcome email sent to:", user.email);
  } catch (emailError: any) {
    console.error("[Webhook] Error sending welcome email:", emailError);
  }

  // Send Subscription Confirmation Email
  try {
    const latestInvoice = subscription.latest_invoice;
    let amountTotal = 0;
    let currency = "gbp";
    if (typeof latestInvoice === "string") {
      const invoice = await stripe.invoices.retrieve(latestInvoice);
      amountTotal = invoice.amount_paid ?? invoice.amount_due ?? 0;
      currency = invoice.currency ?? currency;
    } else if (latestInvoice) {
      amountTotal = (latestInvoice as Stripe.Invoice).amount_paid ?? 0;
      currency = (latestInvoice as Stripe.Invoice).currency ?? currency;
    }

    const subscriptionEmailHtml = await render(
      SubscriptionConfirmationEmail({
        firstName: user.firstName,
        planName: selectedPlan.name,
        amount: `${(amountTotal / 100).toFixed(2)} ${currency.toUpperCase()}`,
        billingDate: "15th of each month",
        startDate: new Date().toISOString(),
      })
    );
    await sendEmail(user.email, "Your Subscription is Confirmed!", subscriptionEmailHtml);
    console.log("[Webhook] Subscription confirmation email sent to:", user.email);
  } catch (emailError: any) {
    console.error("[Webhook] Error sending subscription confirmation email:", emailError);
  }

  user.hasSubscribedBefore = true;
  user.selectedPriceId = null;
  user.welcomeEmailSent = true;
  await user.save();
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    await connectToDatabase();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Keep status/voucher in sync on every change (including every
        // voucher apply/reapply, which now updates the SAME subscription
        // instead of creating a new one). Never send emails from here.
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionToUser(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log(`[Webhook] Subscription deleted for customer ${customerId}`);
        await User.updateOne(
          { stripeCustomerId: customerId },
          { $set: { subscriptionStatus: 'cancelled', isTrialing: false } }
        );
        break;
      }

      // Fires the instant the customer's card is confirmed for a trial
      // (30-day free trial signups). This is the correct "checkout truly
      // completed" signal — NOT subscription.created, which can fire
      // before the customer has entered any card details.
      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const customerId = setupIntent.customer as string;
        if (customerId) {
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            limit: 1,
            status: 'trialing',
          });
          const sub = subs.data[0];
          if (sub) {
            await sendActivationEmailsIfNeeded(sub.id);
          }
        }
        break;
      }

      // Fires when a non-trial (returning customer) payment actually
      // succeeds — the equivalent "checkout truly completed" signal for
      // immediate-charge subscriptions.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        if (subscriptionId) {
          await sendActivationEmailsIfNeeded(subscriptionId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Webhook] Payment failed for invoice ${invoice.id}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}