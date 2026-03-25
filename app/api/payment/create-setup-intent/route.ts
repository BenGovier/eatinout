import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16",
});

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Connect to the database
    await connectToDatabase();

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { message: "User or Stripe customer not found" },
        { status: 404 }
      );
    }

    // Create a SetupIntent for the user
    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error: any) {
    console.error("Error creating SetupIntent:", error);
    return NextResponse.json(
      { message: "Failed to create SetupIntent" },
      { status: 500 }
    );
  }
}
