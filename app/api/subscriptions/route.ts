import { render } from '@react-email/render';
import sendEmail from "@/lib/sendEmail";
import SubscriptionCancellationEmail from "@/utils/email-templates/SubscriptionCancellationEmail";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "@/models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Create subscription
export async function POST(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    // Decode token to get userId
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    user.subscriptionId = subscription.id;
    user.subscriptionStatus = "active";
    await user.save();

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent
        .client_secret,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating subscription" },
      { status: 500 }
    );
  }
}

// Cancel subscription
export async function DELETE(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user || !user.subscriptionId) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const subscription: any = await stripe.subscriptions.cancel(user.subscriptionId);

    // Determine if access should be retained until the end of the period
    const now = new Date();
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const accessEndDate = trialEnd || currentPeriodEnd;

    if (accessEndDate > now) {
      user.subscriptionStatus = "cancelled_with_access";
    } else {
      user.subscriptionStatus = "cancelled";
    }

    await user.save();

    try {
      const endDate = new Date(subscription.current_period_end * 1000);
      const formattedDate = endDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailHtml = await render(
        SubscriptionCancellationEmail({
          firstName: user.firstName,
          currentPeriodEnd: formattedDate,
        })
      );

      await sendEmail(
        user.email,
        "Your Eatinout Subscription is Cancelled",
        emailHtml
      );
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
      // We don't want to fail the cancellation if email sending fails
    }

    return NextResponse.json({
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error cancelling subscription" },
      { status: 500 }
    );
  }
}

// Get subscription status
export async function GET(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.subscriptionId) {
      const subscription: any = await stripe.subscriptions.retrieve(
        user.subscriptionId
      );

      // Get payment method details
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });

      const defaultPaymentMethod = paymentMethods.data[0];


      // Determine access based on subscription status and dates
      const now = new Date();
      let hasAccess = false;
      let accessReason = "";
      let effectiveStatus = user.subscriptionStatus;

      if (subscription.status === 'active') {
        hasAccess = true;
        accessReason = "Subscription is active";
        effectiveStatus = 'active';
      } else if (subscription.status === 'trialing') {
        hasAccess = true;
        accessReason = "Subscription is in trial period";
        effectiveStatus = 'trialing';
      } else if (subscription.status === 'canceled') {
        // For cancelled subscriptions, check trial_end or current_period_end
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Use trial_end if it exists, otherwise use current_period_end
        const accessEndDate = trialEnd || currentPeriodEnd;

        if (accessEndDate > now) {
          hasAccess = true;
          accessReason = `Subscription cancelled but access valid until ${accessEndDate.toISOString()}`;
          effectiveStatus = 'cancelled_with_access';
        } else {
          hasAccess = false;
          accessReason = `Subscription cancelled and access expired on ${accessEndDate.toISOString()}`;
          effectiveStatus = 'cancelled';
        }
      } else if (subscription.status === 'past_due') {
        // For past due, check if still within period
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        hasAccess = currentPeriodEnd > now;
        accessReason = hasAccess ? "Past due but still within period" : "Past due and period expired";
        effectiveStatus = 'past_due';
      } else {
        hasAccess = false;
        accessReason = `Subscription status: ${subscription.status}`;
        effectiveStatus = 'inactive';
      }

      // Update user status if needed
      if (effectiveStatus !== user.subscriptionStatus) {
        try {
          user.subscriptionStatus = effectiveStatus;
          await user.save();
        } catch (updateError) {
          console.error("Error updating user status:", updateError);
        }
      }

      return NextResponse.json({
        status: effectiveStatus,
        hasAccess,
        accessReason,
        subscriptionDetails: subscription,
        email: user.email,
        stripeStatus: subscription.status,
        trialEnd: subscription.trial_end,
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        currentPeriodEnd: subscription.current_period_end,
        currentPeriodEndDate: new Date(subscription.current_period_end * 1000).toISOString(),
        canceledAt: subscription.canceled_at,
        card: defaultPaymentMethod
          ? {
            brand: defaultPaymentMethod.card?.brand,
            last4: defaultPaymentMethod.card?.last4,
            expMonth: defaultPaymentMethod.card?.exp_month,
            expYear: defaultPaymentMethod.card?.exp_year,
          }
          : null,
      });
    } else {
      return NextResponse.json({
        status: user.subscriptionStatus,
        email: user.email,
        card: null,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching subscription status" },
      { status: 500 }
    );
  }
}

// Reactivate or pause subscription
export async function PATCH(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };

    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user || !user.subscriptionId) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const action = body.action;

    if (action === "pause") {
      // Pause subscription
      const subscription = await stripe.subscriptions.update(
        user.subscriptionId,
        {
          pause_collection: { behavior: "mark_uncollectible" },
        }
      );

      user.subscriptionStatus = "inactive";
      await user.save();

      return NextResponse.json({
        message: "Subscription paused successfully",
        subscription: subscription,
      });
    } else if (action === "resume") {
      // Resume subscription
      const subscription = await stripe.subscriptions.update(
        user.subscriptionId,
        {
          pause_collection: null, // Remove the pause
        }
      );

      user.subscriptionStatus = "active";
      await user.save();

      return NextResponse.json({
        message: "Subscription resumed successfully",
        subscription: subscription,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error managing subscription:", error);
    return NextResponse.json(
      { error: "Error managing subscription" },
      { status: 500 }
    );
  }
}
