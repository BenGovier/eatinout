// lib/social-signup.ts
// Short-lived, signed, httpOnly record of a Google/Facebook sign-in for an
// email that has no account yet. It only pre-fills the free registration
// form; account creation still requires the email OTP verification pass.
import jwt from "jsonwebtoken";

export const SOCIAL_SIGNUP_COOKIE = "eio_social_signup";
export const SOCIAL_SIGNUP_TTL_SECONDS = 15 * 60;
const AUDIENCE = "eatinout-social-signup";

export type SocialSignupPrefill = {
  provider: "google" | "facebook";
  email: string;
  firstName: string;
  lastName: string;
};

function getSecret(): string | null {
  return process.env.JWT_SECRET || null;
}

export function createSocialSignupToken(prefill: SocialSignupPrefill): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return jwt.sign(prefill, secret, { audience: AUDIENCE, expiresIn: SOCIAL_SIGNUP_TTL_SECONDS });
}

export function readSocialSignupToken(token: string | undefined): SocialSignupPrefill | null {
  const secret = getSecret();
  if (!secret || !token) return null;
  try {
    const payload = jwt.verify(token, secret, { audience: AUDIENCE }) as Partial<SocialSignupPrefill>;
    if (
      (payload.provider !== "google" && payload.provider !== "facebook") ||
      typeof payload.email !== "string" ||
      typeof payload.firstName !== "string"
    ) {
      return null;
    }
    return {
      provider: payload.provider,
      email: payload.email,
      firstName: payload.firstName,
      // Tokens issued before surname prefill existed have no lastName
      lastName: typeof payload.lastName === "string" ? payload.lastName : "",
    };
  } catch {
    return null;
  }
}

export const socialSignupCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SOCIAL_SIGNUP_TTL_SECONDS,
};
