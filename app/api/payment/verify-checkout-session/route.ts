import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import sendEmail from "@/lib/sendEmail";
import { render } from "@react-email/render";
import { SubscriptionConfirmationEmail } from "@/utils/email-templates/subscription-confirmation";
import WelcomeEmail from "@/utils/email-templates/welcome";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Define plans to match the registration
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

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the Stripe Checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || !session.customer_email) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // Connect to the database
    await connectToDatabase();

    // Check if subscription was already activated (idempotency check)
    // This prevents duplicate email sends if the endpoint is called multiple times
    const existingUser = await User.findOne({ email: session.customer_email });
    
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if this subscription was already processed
    const wasAlreadyActive = existingUser.subscriptionStatus === "active" && 
                             existingUser.subscriptionId === session.subscription;
    
    if (wasAlreadyActive) {
      console.log(`Subscription already activated for ${session.customer_email}, skipping email sends`);
      const token = jwt.sign(
        {
          userId: existingUser._id.toString(),
          email: existingUser.email,
          role: existingUser.role,
          subscriptionStatus: existingUser.subscriptionStatus,
        },
        JWT_SECRET,
        { expiresIn: "365d" }
      );
      
      const response = NextResponse.json({
        message: "Subscription already activated",
        role: existingUser.role,
        success: true
      });

      response.cookies.set({
        name: "auth_token",
        value: token,
        path: "/",
        maxAge: 60 * 60 * 24 * 1,
      });

      return response;
    }

    // Get selectedPriceId before it's cleared (needed for welcome email)
    const selectedPriceId = existingUser.selectedPriceId;
    
    // Get plan details from selectedPriceId or from Stripe session line items
    let selectedPlan = PLANS.find(plan => plan.priceId === selectedPriceId);
    
    // If plan not found from selectedPriceId, try to get from Stripe session
    if (!selectedPlan && session.line_items) {
      const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
      if (lineItems.data.length > 0) {
        const priceId = lineItems.data[0].price?.id;
        selectedPlan = PLANS.find(plan => plan.priceId === priceId);
      }
    }
    
    // Fallback to default plan if still not found
    if (!selectedPlan) {
      selectedPlan = PLANS[0];
    }

    // Update user subscription status
    const user = await User.findOneAndUpdate(
      { email: session.customer_email },
      {
        subscriptionStatus: "active",
        stripeCustomerId: session.customer,
        subscriptionId: session.subscription,
        hasSubscribedBefore: true,
        // Clear the selectedPriceId after successful checkout
        selectedPriceId: null,
      },
      { new: true }
    );

    // Create a JWT token for the user
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
      },
      JWT_SECRET,
      { expiresIn: "365d" }
    );

    console.log(`Subscription activated for ${session.customer_email}`);

    // Send both Welcome Email and Subscription Confirmation Email after successful verification
    let emailErrors: string[] = [];
    
    // Calculate trial end date (7 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

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
          }
        })
      );

      await sendEmail(
        user.email,
        "Welcome to Eatinout - Your 7-Day Free Trial Starts Now!",
        welcomeEmailHtml
      );

      console.log("Welcome email sent successfully to:", user.email);
    } catch (emailError: any) {
      console.error("Error sending welcome email:", emailError);
      emailErrors.push(`Welcome email failed: ${emailError.message}`);
    }

    // Send Subscription Confirmation Email
    try {
      const subscriptionEmailHtml = await render(
        SubscriptionConfirmationEmail({
          firstName: user.firstName,
          planName: selectedPlan.name,
          amount: `${((session?.amount_total ?? 0) / 100).toFixed(2)} ${session?.currency?.toUpperCase() ?? ""}`,
          billingDate: "15th of each month",
          startDate: new Date().toISOString(),
        })
      );

      await sendEmail(
        user.email,
        "Your Subscription is Confirmed!",
        subscriptionEmailHtml
      );

      console.log(
        "Subscription confirmation email sent successfully to:",
        user.email
      );
    } catch (emailError: any) {
      console.error(
        "Error sending subscription confirmation email:",
        emailError
      );
      emailErrors.push(`Subscription confirmation email failed: ${emailError.message}`);
    }

    // Create response and set the token in cookies
    const responseMessage = emailErrors.length > 0 
      ? "Subscription activated successfully, but some emails failed to send"
      : "Subscription activated successfully";
    
    const response = NextResponse.json({
      message: responseMessage,
      role: user.role, // Include the user's role in the response
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      success: true
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      path: "/",
      maxAge: 60 * 60 * 24 * 1, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Error verifying Stripe Checkout session:", error);
    return NextResponse.json(
      { error: "Failed to verify Stripe Checkout session" },
      { status: 500 }
    );
  }
}
