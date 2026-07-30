import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { resolveMembershipFromStripe } from "@/lib/subscription";

// Stripe requires the untouched raw request body to verify the signature, so
// this route must run on the Node.js runtime and never be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Subscription-lifecycle + invoice events that affect membership access.
const HANDLED_EVENTS = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

/** Structured, PII-free log line for observability. */
function logEvent(
  level: "info" | "error",
  message: string,
  fields: Record<string, string | boolean | null | undefined>
) {
  const payload = { scope: "stripe-webhook", message, ...fields };
  if (level === "error") {
    console.error("[stripe-webhook]", JSON.stringify(payload));
  } else {
    console.log("[stripe-webhook]", JSON.stringify(payload));
  }
}

/** Pull the subscription id out of a subscription or invoice event object. */
function extractSubscriptionId(obj: any): string | null {
  if (!obj) return null;
  // customer.subscription.* — the object IS the subscription.
  if (obj.object === "subscription" && typeof obj.id === "string") {
    return obj.id;
  }
  // invoice.* — the subscription id lives on the invoice.
  if (obj.object === "invoice") {
    if (typeof obj.subscription === "string") return obj.subscription;
    if (obj.subscription?.id) return obj.subscription.id as string;
  }
  // Defensive fallback for other shapes.
  if (typeof obj.subscription === "string") return obj.subscription;
  if (typeof obj.id === "string" && obj.id.startsWith("sub_")) return obj.id;
  return null;
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    // Misconfiguration — do NOT silently succeed. 500 makes Stripe retry once
    // the secret is present, and surfaces the problem in logs.
    logEvent("error", "Missing STRIPE_WEBHOOK_SECRET", {});
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Read the RAW body untouched — required for signature verification.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    // Invalid/forged signature — reject. This is not a processing failure.
    logEvent("error", "Signature verification failed", {
      reason: err?.message ?? "unknown",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Ignore events we don't act on. Acknowledge so Stripe stops re-sending.
  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const eventObject = event.data.object as any;
  const subscriptionId = extractSubscriptionId(eventObject);

  if (!subscriptionId) {
    // e.g. a one-off invoice with no subscription. Nothing to reconcile.
    logEvent("info", "No subscription id on event; skipping", {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ received: true });
  }

  try {
    // NEVER trust the status inferred from the event name/payload. Always fetch
    // the authoritative, latest subscription state directly from Stripe.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null;

    await connectToDatabase();

    // Map Stripe -> EatinOut user using the EXISTING fields: prefer the stored
    // Stripe subscription id, then fall back to the Stripe customer id.
    let user = await User.findOne({ subscriptionId });
    if (!user && customerId) {
      user = await User.findOne({ stripeCustomerId: customerId });
    }

    if (!user) {
      // No mapping possible — log a clear, PII-free structured error and
      // acknowledge (200) so Stripe does not retry an unresolvable event forever.
      logEvent("error", "No matching user for Stripe event", {
        eventId: event.id,
        eventType: event.type,
        customerId,
        subscriptionId,
      });
      return NextResponse.json({ received: true, matched: false });
    }

    // Derive enum-safe membership fields. Access is granted ONLY for
    // active/trialing; every other status removes it.
    const resolved = resolveMembershipFromStripe(subscription);

    // Idempotent write: the derivation is deterministic, so re-delivering the
    // same event produces the same result. Only persist on an actual change to
    // avoid redundant writes and keep the operation safe to repeat.
    const needsUpdate =
      user.subscriptionStatus !== resolved.subscriptionStatus ||
      user.isTrialing !== resolved.isTrialing ||
      user.subscriptionId !== subscription.id;

    if (needsUpdate) {
      user.subscriptionStatus = resolved.subscriptionStatus;
      user.isTrialing = resolved.isTrialing;
      // Keep the stored subscription id aligned with Stripe.
      user.subscriptionId = subscription.id;
      if (customerId) user.stripeCustomerId = customerId;
      await user.save();
    }

    logEvent("info", "Membership synced", {
      eventId: event.id,
      eventType: event.type,
      subscriptionId,
      stripeStatus: subscription.status,
      subscriptionStatus: resolved.subscriptionStatus,
      isTrialing: resolved.isTrialing,
      hasAccess: resolved.hasAccess,
      updated: needsUpdate,
    });

    // Success only AFTER the DB write completed.
    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Stripe retrieval or DB write failed. Return 500 so Stripe RETRIES the
    // event. We never swallow the error and return success.
    logEvent("error", "Processing failed; returning 500 for retry", {
      eventId: event.id,
      eventType: event.type,
      subscriptionId,
      reason: err?.message ?? "unknown",
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
