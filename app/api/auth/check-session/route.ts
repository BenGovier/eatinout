import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Restaurant from "@/models/Restaurant";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(req: Request) {
  await connectToDatabase();

  // Try NextAuth session (SSO)
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // if (user.role === "user" && user.subscriptionStatus === "cancelled") {
    //   const res = await axios.post(
    //     `${process.env.NEXTAUTH_URL}/api/payment/create-checkout-session`,
    //     {
    //       email: user.email,
    //     }
    //   );

    //   return NextResponse.json({
    //     message: "Subscription cancelled. Redirect to Stripe checkout.",
    //     redirectUrl: res.data.url, // send Stripe URL to client
    //   });
    // }
    let restaurantId = user.restaurantId;

    if (user.role === "restaurant") {
      // If role is restaurant, fetch corresponding restaurant document
      const restaurant = await Restaurant.findOne({ userId: user._id });
  
      if (restaurant) {
        restaurantId = restaurant._id.toString();
      } else {
        return NextResponse.json(
          { message: "Associated restaurant not found" },
          { status: 404 }
        );
      }
    }
  

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        restaurantId: restaurantId,
        subscriptionStatus: user.subscriptionStatus || "inactive",
      },
      JWT_SECRET,
      { expiresIn: "365d" }
    );

    console.log(`Login successful for: ${user.email}, role: ${user.role}`);

    const response = NextResponse.json({
      message: "SSO user session active",
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    response.cookies.set({
      name: "user_role",
      value: user.role,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 7 days
    });

    return response;
  }
  // Try JWT from cookie (manual login)
  const cookieHeader = req.headers.get("cookie");
  const cookies = Object.fromEntries(
    (cookieHeader || "").split(";").map((c) => c.trim().split("="))
  );

  const token = cookies["auth_token"];
  if (token) {
    try {
      const decoded : any = jwt.verify(token, JWT_SECRET);

      return NextResponse.json({
        message: "JWT session active",
        email: decoded.email,
        role: decoded.role,
        subscriptionStatus: decoded.subscriptionStatus,
      });
    } catch (err) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      );
    }
  }

  return NextResponse.json(
    { message: "No active session found" },
    { status: 401 }
  );
}
