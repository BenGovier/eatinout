import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

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

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

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
          // past_due, unpaid, paused, incomplete, incomplete_expired
          ourStatus = 'inactive';
          isTrialing = false;
        }

        console.log(`[Webhook] Updating user ${customerId} to status: ${ourStatus}, isTrialing: ${isTrialing}`);
        
        await User.updateOne(
          { stripeCustomerId: customerId },
          {
            $set: {
              subscriptionStatus: ourStatus,
              isTrialing: isTrialing,
              subscriptionId: subscription.id
            }
          }
        );
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Webhook] Payment succeeded for invoice ${invoice.id}`);
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
