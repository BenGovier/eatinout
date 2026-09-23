import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { activateSubscription } from "@/lib/activate-subscription";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: Request) {
  try {
    const { subscriptionId } = await request.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    const cookieStore: any = await cookies();
    const existingToken = cookieStore.get("auth_token")?.value;
    if (!existingToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(existingToken, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    await connectToDatabase();
    const current = await User.findById(decoded.userId);
    if (!current || !current.stripeCustomerId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let result = await activateSubscription(subscriptionId, current.stripeCustomerId);
    if (!result.ok) {
      // Stripe can lag a moment after card confirmation; retry once.
      await new Promise((r) => setTimeout(r, 1500));
      result = await activateSubscription(subscriptionId, current.stripeCustomerId);
    }
    if (!result.ok || !result.user) {
      return NextResponse.json(
        { error: (result as any).reason || "Could not verify subscription" },
        { status: 400 }
      );
    }

    const user = result.user;
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        isTrialing: user.isTrialing,
      },
      JWT_SECRET,
      { expiresIn: "365d" }
    );

    const response = NextResponse.json({
      success: true,
      message: "Subscription activated successfully",
      role: user.role,
    });
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return NextResponse.json({ error: "Failed to verify subscription" }, { status: 500 });
  }
}