// app/api/webhooks/stripe/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { activateSubscription } from '@/lib/activate-subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

/**
 * Sync subscription status + voucher code onto the user record. Called on
 * every created/updated event so status and voucher always stay current.
 * This function NEVER sends emails — emails are handled by
 * activateSubscription (shared with /api/payment/verify-subscription),
 * which only runs once a card/payment is actually confirmed.
 */
async function syncSubscriptionToUser(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.warn(`[Webhook] No user found for customer ${customerId}`);
    return;
  }

  // GUARD: a trial subscription flips to "trialing" the instant it's
  // created — before the customer has entered any card details, since
  // create-subscription runs as soon as the checkout page loads. Writing
  // subscriptionId/isTrialing to the DB at that point marks the user as
  // subscribed even though they never completed checkout. Only treat a
  // trialing subscription as real once a payment method has actually been
  // attached to it — that only happens after confirmCardSetup succeeds
  // (payment_settings.save_default_payment_method: "on_subscription").
  const hasPaymentMethod = !!subscription.default_payment_method;
  if (status === 'trialing' && !hasPaymentMethod) {
    console.log(`[Webhook] Skipping sync for customer ${customerId} — trialing subscription has no payment method attached yet (checkout not completed)`);
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

  // Capture voucher code (if any). undefined = lookup failed, so we leave
  // the existing DB value untouched instead of overwriting it with null.
  let usedVoucherCode: string | null | undefined = undefined;
  try {
    const full: any = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['discounts.promotion_code'],
    });
    const discount = full.discounts?.[0] ?? full.discount;
    let promo = discount?.promotion_code;

    if (typeof promo === 'string') {
      promo = await stripe.promotionCodes.retrieve(promo);
    }

    usedVoucherCode = promo?.code ?? null;
  } catch (expandErr) {
    console.error('[Webhook] Error expanding subscription for voucher info:', expandErr);
  }

  user.subscriptionStatus = ourStatus;
  user.isTrialing = isTrialing;
  user.subscriptionId = subscription.id;
  if (usedVoucherCode !== undefined) {
    user.usedVoucherCode = usedVoucherCode;
  }
  user.stripeCustomerId = customerId;
  await user.save();

  console.log(`[Webhook] Synced user ${user.email} — status: ${ourStatus}, trialing: ${isTrialing}, voucher: ${user.usedVoucherCode ?? "none"}`);
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
        // Keep status/voucher in sync on every change. Never send emails here.
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
      // (30-day free trial signups). Backup path: the client normally
      // triggers activation first via /api/payment/verify-subscription.
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
            await activateSubscription(sub.id);
          }
        }
        break;
      }

      // Fires when a non-trial (returning customer) payment actually succeeds.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        // Ignore the £0 trial invoice: it is created at page load, before any card is entered.
        if (subscriptionId && (invoice.amount_paid ?? 0) > 0) {
          await activateSubscription(subscriptionId);
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