// api/auth/register-free/route.ts
// Free (no-subscription) registration for National Big Brand offers.
// Never creates Stripe subscriptions, payments, trials or checkout sessions.
import { type NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import Stripe from "stripe";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 255;
// bcrypt only uses the first 72 bytes of a password
const MAX_PASSWORD_LENGTH = 72;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: NextRequest) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not configured; refusing free registration");
    return NextResponse.json(
      { success: false, message: "Registration is temporarily unavailable" },
      { status: 500 }
    );
  }

  try {
    let requestBody: Record<string, unknown>;
    try {
      requestBody = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!requestBody || typeof requestBody !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { firstName, email, password, zipCode } = requestBody;

    if (
      !isNonEmptyString(firstName) ||
      !isNonEmptyString(email) ||
      typeof password !== "string" ||
      password.length === 0 ||
      !isNonEmptyString(zipCode)
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const trimmedFirstName = firstName.trim();
    const trimmedZipCode = zipCode.trim();
    // Same normalisation as the existing registration endpoint, plus trim
    const normalizedEmail = email.trim().toLowerCase();

    if (
      trimmedFirstName.length > MAX_FIELD_LENGTH ||
      trimmedZipCode.length > MAX_FIELD_LENGTH ||
      normalizedEmail.length > MAX_FIELD_LENGTH ||
      !EMAIL_PATTERN.test(normalizedEmail)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid registration details" },
        { status: 400 }
      );
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, message: "Password is too long" },
        { status: 400 }
      );
    }

    // Never create duplicate accounts and never touch an existing record
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (existingUserError) {
      console.error("Error checking for existing user:", existingUserError.message);
      return NextResponse.json(
        { success: false, message: "Error checking for existing user" },
        { status: 500 }
      );
    }
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User already exists with this email" },
        { status: 400 }
      );
    }

    const { data: createdUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        // 24-char hex id, same format as the existing registration endpoint
        id: randomBytes(12).toString("hex"),
        first_name: trimmedFirstName,
        last_name: "",
        email: normalizedEmail,
        password_hash: await bcrypt.hash(password, 10),
        zip_code: trimmedZipCode,
        role: "user",
        registration_type: "free",
        subscription_status: "inactive",
        is_trialing: false,
        has_subscribed_before: false,
        selected_price_id: null,
      })
      .select("id, first_name, last_name, email, zip_code, role, registration_type")
      .single();

    if (createError || !createdUser) {
      // 23505 = unique_violation (concurrent signup with the same email)
      if (createError?.code === "23505") {
        return NextResponse.json(
          { success: false, message: "User already exists with this email" },
          { status: 400 }
        );
      }
      console.error("Error saving free user:", createError?.message);
      return NextResponse.json(
        { success: false, message: "Error creating user" },
        { status: 500 }
      );
    }

    const user = {
      _id: createdUser.id as string,
      firstName: createdUser.first_name as string,
      lastName: createdUser.last_name as string,
      email: createdUser.email as string,
      zipCode: createdUser.zip_code as string,
      role: createdUser.role as string,
      registrationType: createdUser.registration_type as string,
    };

    // Stripe customer only — no subscription, payment, trial or checkout.
    // Matches the existing registration: a failure here does not fail signup.
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
      const stripe = new Stripe(stripeSecretKey);
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.firstName,
        metadata: { userId: user._id, registrationType: "free" },
      });
      const { error: stripeSaveError } = await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user._id);
      if (stripeSaveError) throw new Error(stripeSaveError.message);
    } catch (stripeError: any) {
      console.error("Error creating Stripe customer for free user:", stripeError?.message);
    }

    let token: string;
    try {
      token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: "365d" }
      );
    } catch (tokenError: any) {
      console.error("Error creating JWT token:", tokenError?.message);
      return NextResponse.json(
        { success: false, message: "Error creating authentication token" },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          zipCode: user.zipCode,
          registrationType: user.registrationType,
        },
      },
      { status: 201 }
    );

    // Same cookie conventions as the existing registration endpoint
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error: any) {
    console.error("Unhandled free registration error:", error?.message);
    return NextResponse.json(
      { success: false, message: "Registration failed" },
      { status: 500 }
    );
  }
}
