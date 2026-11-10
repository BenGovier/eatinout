// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import supabaseAdmin from "@/lib/supabase/admin";
import dotenv from "dotenv";
import { cookies } from "next/headers";
import {
  SOCIAL_SIGNUP_COOKIE,
  createSocialSignupToken,
  socialSignupCookieOptions,
} from "@/lib/social-signup";

dotenv.config();

// Supabase: columns read + mapping of the snake_case row to the camelCase shape used below
const USER_COLUMNS = "id, role, subscription_status, is_trialing";
const mapUser = (row: any) =>
  row
    ? {
        _id: row.id,
        role: row.role,
        subscriptionStatus: row.subscription_status,
        isTrialing: row.is_trialing,
      }
    : null;

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }: any) {
      try {
        // Check if the user already exists in the database
        // (emails are stored lowercase, as the old User model did)
        const normalizedEmail = user.email?.toLowerCase();
        const { data: existingUserRow, error: existingUserError } = await supabaseAdmin
          .from("users")
          .select(USER_COLUMNS)
          .eq("email", normalizedEmail)
          .maybeSingle();
        if (existingUserError) throw new Error(existingUserError.message);
        let existingUser: any = mapUser(existingUserRow);

        if (!existingUser) {
          // New accounts are never created from a provider-supplied email.
          // Hand off to the free registration page, which requires email OTP
          // verification before any account exists.
          const provider = account?.provider;
          if (!normalizedEmail || (provider !== "google" && provider !== "facebook")) {
            return false;
          }
          const token = createSocialSignupToken({
            provider,
            email: normalizedEmail,
            firstName: String(profile?.given_name || user.name?.split(" ")[0] || "").slice(0, 255),
          });
          if (!token) return false;
          const cookieStore = await cookies();
          cookieStore.set(SOCIAL_SIGNUP_COOKIE, token, socialSignupCookieOptions);
          return "/join?social=1";
        }

        // Attach the user's role and subscription status to the session
        user.role = existingUser.role;
        if (user.role === "user") {
          user.subscriptionStatus = existingUser.subscriptionStatus;
          user.isTrialing = existingUser.isTrialing || false;
        }

        return true; // Allow sign-in
      } catch (error) {
        console.error("Error during sign-in:", error);
        return false; // Deny sign-in
      }
    },
    async session({ session, token }: any) {
      // Attach the user's role and subscription status to the session
      session.user.role = token.role;
      if (token.role === "user") {
        session.user.subscriptionStatus = token.subscriptionStatus;
        session.user.isTrialing = token.isTrialing || false;
      }
      return session;
    },
    async jwt({ token, user }: any) {
      // Attach the user's role and subscription status to the JWT token
      if (user) {
        token.role = user.role;
        if (user.role === "user") {
          token.subscriptionStatus = user.subscriptionStatus;
          token.isTrialing = user.isTrialing || false;
        }
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
