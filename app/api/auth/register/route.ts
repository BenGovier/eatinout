// api/auth/register/route.ts
import { type NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Stripe from "stripe";
import {
  VerificationUnavailableError,
  consumeRegistrationPass,
  normalizeEmail,
  releaseRegistrationPass,
  type ConsumedPass,
} from "@/lib/email-verification";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const MAX_FIELD_LENGTH = 255;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password
const MAX_PASSWORD_BYTES = 72;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: NextRequest) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not configured; refusing registration");
    return NextResponse.json(
      { success: false, message: "Registration is temporarily unavailable" },
      { status: 500 }
    );
  }

  try {
    console.log("Starting user registration process");

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Parsed request body:", {
        ...requestBody,
        password: "[REDACTED]",
      });
    } catch (parseError: any) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          error: parseError.message,
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password, mobile, selectedPriceId, referral, zipCode, source, verificationPass } = requestBody;

    // Log referral for debugging
    if (referral) {
      console.log('✅ Rewardful referral received in registration:', referral);
    } else {
      console.log('ℹ️ No Rewardful referral in registration request');
    }

    // Validate required fields (same rules as /api/auth/register-free)
    if (
      !isNonEmptyString(firstName) ||
      !isNonEmptyString(lastName) ||
      !isNonEmptyString(email) ||
      typeof password !== "string" ||
      password.length === 0 ||
      !isNonEmptyString(zipCode)
    ) {
      console.error("Missing required fields");
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (mobile !== undefined && mobile !== null && typeof mobile !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid registration details" },
        { status: 400 }
      );
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedZipCode = zipCode.trim();
    const trimmedMobile = typeof mobile === "string" && mobile.trim() ? mobile.trim() : null;

    if (
      trimmedFirstName.length > MAX_FIELD_LENGTH ||
      trimmedLastName.length > MAX_FIELD_LENGTH ||
      trimmedZipCode.length > MAX_FIELD_LENGTH ||
      (trimmedMobile !== null && trimmedMobile.length > MAX_FIELD_LENGTH)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid registration details" },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
      return NextResponse.json(
        { success: false, message: "Password is too long" },
        { status: 400 }
      );
    }

    // Emails were stored lowercase by the old User model (lowercase: true)
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check if user already exists
    try {
      const { data: existingUser, error: existingUserError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();
      if (existingUserError) throw new Error(existingUserError.message);
      if (existingUser) {
        console.log("User already exists:", email);
        return NextResponse.json(
          { success: false, message: "User already exists with this email" },
          { status: 400 }
        );
      }

      if (trimmedMobile) {
        const { data: existingMobile, error: existingMobileError } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("mobile", trimmedMobile)
          .limit(1)
          .maybeSingle();
        if (existingMobileError) throw new Error(existingMobileError.message);
        if (existingMobile) {
          console.log("Mobile number already in use");
          return NextResponse.json(
            { success: false, message: "Mobile number already in use" },
            { status: 400 }
          );
        }
      }
    } catch (findError: any) {
      console.error("Error checking for existing user:", findError);
      return NextResponse.json(
        {
          success: false,
          message: "Error checking for existing user",
          error: findError.message,
        },
        { status: 500 }
      );
    }

    // Email OTP verification is mandatory: consume the single-use pass before
    // creating anything so it cannot be replayed for a second account.
    let consumedPass: ConsumedPass | null;
    try {
      consumedPass = await consumeRegistrationPass(normalizedEmail, verificationPass);
    } catch (passError: any) {
      if (passError instanceof VerificationUnavailableError) {
        return NextResponse.json(
          { success: false, message: "Registration is temporarily unavailable" },
          { status: 503 }
        );
      }
      console.error("Error checking verification pass:", passError?.message);
      return NextResponse.json(
        { success: false, message: "Registration failed" },
        { status: 500 }
      );
    }
    if (!consumedPass) {
      return NextResponse.json(
        {
          success: false,
          error: "email_not_verified",
          message: "Please verify your email address before creating your account",
        },
        { status: 403 }
      );
    }

    // Create new user
    let user;
    try {
      const { data: createdUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert({
          // 24-char hex id, same format as the migrated MongoDB ObjectId ids
          id: randomBytes(12).toString("hex"),
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          email: normalizedEmail,
          // password was bcrypt-hashed on save by the old User model
          password_hash: await bcrypt.hash(password, 10),
          mobile: trimmedMobile,
          zip_code: trimmedZipCode,
          role: "user",
          // Store selected price ID for reference
          selected_price_id: selectedPriceId || null,
          // Store Rewardful referral ID for affiliate tracking
          rewardful_referral: referral || null,
          source: source || null,
          registration_type: "subscription",
          email_verified_at: consumedPass.verifiedAt,
        })
        .select("id, first_name, last_name, email, mobile, zip_code, role, stripe_customer_id")
        .single();
      if (createError) {
        // 23505 = unique_violation (concurrent signup with the same email)
        if (createError.code === "23505") {
          return NextResponse.json(
            { success: false, message: "User already exists with this email" },
            { status: 400 }
          );
        }
        await releaseRegistrationPass(consumedPass);
        throw new Error(createError.message);
      }

      user = {
        _id: createdUser.id,
        firstName: createdUser.first_name,
        lastName: createdUser.last_name,
        email: createdUser.email,
        mobile: createdUser.mobile,
        zipCode: createdUser.zip_code,
        role: createdUser.role,
        stripeCustomerId: createdUser.stripe_customer_id,
      };
      console.log("User created successfully:", user._id);

      // Mark lead as converted if it exists
      try {
        const { error: leadUpdateError } = await supabaseAdmin
          .from("leads")
          .update({ is_converted: true })
          .eq("email", normalizedEmail);
        if (leadUpdateError) throw new Error(leadUpdateError.message);
      } catch (leadError) {
        console.error("Error updating lead conversion status:", leadError);
      }
    } catch (saveError: any) {
      console.error("Error saving user:", saveError);
      return NextResponse.json(
        {
          success: false,
          message: "Error creating user",
          error: saveError.message,
        },
        { status: 500 }
      );
    }

    // Create a Stripe customer up-front so the checkout page can use
    // a SetupIntent/PaymentIntent immediately without an extra round trip.
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user._id.toString() },
      });
      user.stripeCustomerId = customer.id;
      const { error: stripeSaveError } = await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user._id);
      if (stripeSaveError) throw new Error(stripeSaveError.message);
      console.log("Stripe customer created:", customer.id);
    } catch (stripeError: any) {
      // Do not fail registration if Stripe customer creation fails —
      // the checkout step will retry creating it if missing.
      console.error("Error creating Stripe customer:", stripeError);
    }

    // Create JWT token
    let token;
    try {
      token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "365d" }
      );
      console.log("JWT token created");
    } catch (tokenError: any) {
      console.error("Error creating JWT token:", tokenError);
      return NextResponse.json(
        {
          success: false,
          message: "Error creating authentication token",
          error: tokenError.message,
        },
        { status: 500 }
      );
    }

    // Note: Welcome email will be sent after successful subscription verification
    // This ensures emails are only sent after payment is confirmed

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          zipCode: user.zipCode,
        },
      },
      { status: 201 }
    );

    // Set the cookie
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 365 days
    });

    console.log("Registration completed successfully");
    return response;
  } catch (error: any) {
    console.error("Unhandled registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Registration failed",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
