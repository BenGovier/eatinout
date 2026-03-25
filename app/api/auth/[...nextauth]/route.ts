import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import connectToDatabase from "@/lib/mongodb"; // Import your database connection
import User from "@/models/User"; // Import your User model
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const handler = NextAuth({
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
        // Connect to the database
        await connectToDatabase();

        // Check if the user already exists in the database
        let existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          // Create a new user if not found
          const randomPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          existingUser = new User({
            firstName:
              profile?.given_name || user.name?.split(" ")[0] || "",
            lastName:
              profile?.family_name || user.name?.split(" ")[1] || "",
            email: user.email,
            role: "user", // Default role
            provider: account?.provider,
            password: hashedPassword,
            subscriptionStatus: "inactive", // Default subscription status
          });

          await existingUser.save();
        }

        // Attach the user's role and subscription status to the session
        user.role = existingUser.role;
        if (user.role === "user") {
          user.subscriptionStatus = existingUser.subscriptionStatus;
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
      }
      return session;
    },
    async jwt({ token, user }: any) {
      // Attach the user's role and subscription status to the JWT token
      if (user) {
        token.role = user.role;
        if (user.role === "user") {
          token.subscriptionStatus = user.subscriptionStatus;
        }
      }
      return token;
    },
  },
});

export { handler as GET, handler as POST };
