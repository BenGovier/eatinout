// // app/api/webhooks/stripe/route.ts

// import { NextResponse } from 'next/server';
// import Stripe from 'stripe';
// import connectToDatabase from '@/lib/mongodb';
// import User from '@/models/User';
// import { activateSubscription } from '@/lib/activate-subscription';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// /**
//  * Sync subscription status + voucher code onto the user record. Called on
//  * every created/updated event so status and voucher always stay current.
//  * This function NEVER sends emails — emails are handled by
//  * activateSubscription (shared with /api/payment/verify-subscription),
//  * which only runs once a card/payment is actually confirmed.
//  */
// async function syncSubscriptionToUser(subscription: Stripe.Subscription) {
//   const customerId = subscription.customer as string;
//   const status = subscription.status;

//   const user = await User.findOne({ stripeCustomerId: customerId });
//   if (!user) {
//     console.warn(`[Webhook] No user found for customer ${customerId}`);
//     return;
//   }

//   // GUARD: a trial subscription flips to "trialing" the instant it's
//   // created — before the customer has entered any card details, since
//   // create-subscription runs as soon as the checkout page loads. Writing
//   // subscriptionId/isTrialing to the DB at that point marks the user as
//   // subscribed even though they never completed checkout. Only treat a
//   // trialing subscription as real once a payment method has actually been
//   // attached to it — that only happens after confirmCardSetup succeeds
//   // (payment_settings.save_default_payment_method: "on_subscription").
//   const hasPaymentMethod = !!subscription.default_payment_method;
//   if (status === 'trialing' && !hasPaymentMethod) {
//     console.log(`[Webhook] Skipping sync for customer ${customerId} — trialing subscription has no payment method attached yet (checkout not completed)`);
//     return;
//   }

//   let ourStatus = 'inactive';
//   let isTrialing = false;

//   if (status === 'trialing') {
//     ourStatus = 'inactive';
//     isTrialing = true;
//   } else if (status === 'active') {
//     ourStatus = 'active';
//     isTrialing = false;
//   } else if (status === 'canceled') {
//     ourStatus = 'cancelled';
//     isTrialing = false;
//   } else {
//     // incomplete, incomplete_expired, past_due, unpaid, paused
//     ourStatus = 'inactive';
//     isTrialing = false;
//   }

//   // Capture voucher code (if any). undefined = lookup failed, so we leave
//   // the existing DB value untouched instead of overwriting it with null.
//   let usedVoucherCode: string | null | undefined = undefined;
//   try {
//     const full: any = await stripe.subscriptions.retrieve(subscription.id, {
//       expand: ['discounts.promotion_code'],
//     });
//     const discount = full.discounts?.[0] ?? full.discount;
//     let promo = discount?.promotion_code;

//     if (typeof promo === 'string') {
//       promo = await stripe.promotionCodes.retrieve(promo);
//     }

//     usedVoucherCode = promo?.code ?? null;
//   } catch (expandErr) {
//     console.error('[Webhook] Error expanding subscription for voucher info:', expandErr);
//   }

//   user.subscriptionStatus = ourStatus;
//   user.isTrialing = isTrialing;
//   user.subscriptionId = subscription.id;
//   if (usedVoucherCode !== undefined) {
//     user.usedVoucherCode = usedVoucherCode;
//   }
//   user.stripeCustomerId = customerId;
//   await user.save();

//   console.log(`[Webhook] Synced user ${user.email} — status: ${ourStatus}, trialing: ${isTrialing}, voucher: ${user.usedVoucherCode ?? "none"}`);
// }

// export async function POST(req: Request) {
//   try {
//     const rawBody = await req.text();
//     const signature = req.headers.get('stripe-signature');

//     if (!signature) {
//       return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
//     }

//     if (!webhookSecret) {
//       console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
//       return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
//     }

//     let event: Stripe.Event;

//     try {
//       event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
//     } catch (err: any) {
//       console.error(`Webhook signature verification failed: ${err.message}`);
//       return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
//     }

//     await connectToDatabase();

//     switch (event.type) {
//       case 'customer.subscription.created':
//       case 'customer.subscription.updated': {
//         // Keep status/voucher in sync on every change. Never send emails here.
//         const subscription = event.data.object as Stripe.Subscription;
//         await syncSubscriptionToUser(subscription);
//         break;
//       }

//       case 'customer.subscription.deleted': {
//         const subscription = event.data.object as Stripe.Subscription;
//         const customerId = subscription.customer as string;
//         console.log(`[Webhook] Subscription deleted for customer ${customerId}`);
//         await User.updateOne(
//           { stripeCustomerId: customerId },
//           { $set: { subscriptionStatus: 'cancelled', isTrialing: false } }
//         );
//         break;
//       }

//       // Fires the instant the customer's card is confirmed for a trial
//       // (30-day free trial signups). Backup path: the client normally
//       // triggers activation first via /api/payment/verify-subscription.
//       case 'setup_intent.succeeded': {
//         const setupIntent = event.data.object as Stripe.SetupIntent;
//         const customerId = setupIntent.customer as string;
//         if (customerId) {
//           const subs = await stripe.subscriptions.list({
//             customer: customerId,
//             limit: 1,
//             status: 'trialing',
//           });
//           const sub = subs.data[0];
//           if (sub) {
//             await activateSubscription(sub.id);
//           }
//         }
//         break;
//       }

//       // Fires when a non-trial (returning customer) payment actually succeeds.
//       case 'invoice.payment_succeeded': {
//         const invoice = event.data.object as Stripe.Invoice;
//         const subscriptionId = (invoice as any).subscription as string | undefined;
//         // Ignore the £0 trial invoice: it is created at page load, before any card is entered.
//         if (subscriptionId && (invoice.amount_paid ?? 0) > 0) {
//           await activateSubscription(subscriptionId);
//         }
//         break;
//       }

//       case 'invoice.payment_failed': {
//         const invoice = event.data.object as Stripe.Invoice;
//         console.log(`[Webhook] Payment failed for invoice ${invoice.id}`);
//         break;
//       }

//       default:
//         console.log(`[Webhook] Unhandled event type ${event.type}`);
//     }

//     return NextResponse.json({ received: true });
//   } catch (err: any) {
//     console.error(`Webhook Error: ${err.message}`);
//     return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
//   }
// }
// app/api/webhooks/stripe/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import supabaseAdmin from '@/lib/supabase/admin';
import { activateSubscription } from '@/lib/activate-subscription';
import {
  TRIAL_SETUP_PURPOSE,
  isConfirmedSubscription,
  startTrialFromSetupIntent,
  stripeIdOf,
} from '@/lib/start-trial';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

/**
 * Sync subscription status + voucher code onto the user record. Called on
 * every created/updated event so status and voucher always stay current.
 * This function NEVER sends emails — emails are handled by
 * activateSubscription (shared with /api/payment/verify-subscription),
 * which only runs once a card/payment is actually confirmed.
 */
async function syncSubscriptionToUser(eventSubscription: Stripe.Subscription) {
  const customerId = stripeIdOf(eventSubscription.customer as any) as string;

  // Re-read the live subscription so a duplicated or out-of-order event can
  // never write a stale status.
  const full: any = await stripe.subscriptions.retrieve(eventSubscription.id, {
    expand: ['discounts.promotion_code'],
  });
  const subscription = full as Stripe.Subscription;
  if (stripeIdOf(subscription.customer as any) !== customerId) {
    console.warn(`[Webhook] Subscription ${subscription.id} customer mismatch; skipping sync`);
    return;
  }
  const status = subscription.status;

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, subscription_status, is_trialing, subscription_id, used_voucher_code, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle();
  if (userError) throw new Error(userError.message);
  const user = userRow && {
    _id: userRow.id,
    email: userRow.email,
    subscriptionStatus: userRow.subscription_status,
    isTrialing: userRow.is_trialing,
    subscriptionId: userRow.subscription_id,
    usedVoucherCode: userRow.used_voucher_code,
    stripeCustomerId: userRow.stripe_customer_id,
  };
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

  // Only the user's current subscription may change their status. Another
  // subscription can take over only if it is confirmed and the current one
  // is not — so an abandoned trial ending never overwrites a real member.
  if (user.subscriptionId !== subscription.id) {
    if (!isConfirmedSubscription(subscription)) {
      console.log(`[Webhook] Ignoring ${status} event for non-current subscription ${subscription.id}`);
      return;
    }
    if (user.subscriptionId) {
      const stored = await stripe.subscriptions.retrieve(user.subscriptionId).catch(() => null);
      if (stored && isConfirmedSubscription(stored)) {
        console.log(`[Webhook] Keeping confirmed current subscription ${stored.id}; ignoring ${subscription.id}`);
        return;
      }
    }
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
  const { error: saveError } = await supabaseAdmin
    .from('users')
    .update({
      subscription_status: user.subscriptionStatus,
      is_trialing: user.isTrialing,
      subscription_id: user.subscriptionId,
      used_voucher_code: user.usedVoucherCode,
      stripe_customer_id: user.stripeCustomerId,
    })
    .eq('id', user._id);
  if (saveError) throw new Error(saveError.message);

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
        const customerId = stripeIdOf(subscription.customer as any) as string;
        // Only cancel the user whose current subscription this is. A user with
        // no stored subscription is matched only if this one had a saved card.
        const { data: owners, error: ownersError } = await supabaseAdmin
          .from('users')
          .select('id, subscription_id')
          .eq('stripe_customer_id', customerId);
        if (ownersError) throw new Error(ownersError.message);
        const ownerIds = (owners ?? [])
          .filter((u) =>
            u.subscription_id
              ? u.subscription_id === subscription.id
              : !!subscription.default_payment_method
          )
          .map((u) => u.id);
        if (ownerIds.length === 0) {
          console.log(`[Webhook] Ignoring deletion of non-current subscription ${subscription.id}`);
          break;
        }
        console.log(`[Webhook] Subscription ${subscription.id} deleted for customer ${customerId}`);
        const { error: deleteSyncError } = await supabaseAdmin
          .from('users')
          .update({ subscription_status: 'cancelled', is_trialing: false })
          .in('id', ownerIds);
        if (deleteSyncError) throw new Error(deleteSyncError.message);
        break;
      }

      // Fires the instant the customer's card is confirmed. Backup path for
      // when the browser closes before /api/payment/verify-subscription runs.
      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const customerId = stripeIdOf(setupIntent.customer as any);
        if (!customerId) break;

        if (setupIntent.metadata?.purpose === TRIAL_SETUP_PURPOSE) {
          const trial = await startTrialFromSetupIntent(setupIntent.id, customerId);
          if (!trial.ok) {
            if (trial.retryable) throw new Error(`Trial start pending: ${trial.reason}`);
            console.warn(`[Webhook] Trial not started for ${setupIntent.id}: ${trial.reason}`);
            break;
          }
          const activated = await activateSubscription(trial.subscriptionId, customerId);
          if (!activated.ok) throw new Error(`Activation failed: ${activated.reason}`);
          break;
        }

        // Checkouts opened before SetupIntent-first trials: activate only the
        // trial this SetupIntent belongs to, never an unrelated trialing one.
        const paymentMethodId = stripeIdOf(setupIntent.payment_method as any);
        const trialing = await stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 10 });
        const sub = trialing.data.find(
          (s) =>
            stripeIdOf(s.pending_setup_intent as any) === setupIntent.id ||
            (!!paymentMethodId && stripeIdOf(s.default_payment_method as any) === paymentMethodId)
        );
        if (sub) {
          const activated = await activateSubscription(sub.id, customerId);
          if (!activated.ok) throw new Error(`Activation failed: ${activated.reason}`);
        }
        break;
      }

      // Fires when a non-trial (returning customer) payment actually succeeds.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        // Ignore the £0 trial invoice: it is created at page load, before any card is entered.
              if (
          subscriptionId &&
          (invoice as any).billing_reason === 'subscription_create' &&
          (invoice.amount_paid ?? 0) > 0
        ) {
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
