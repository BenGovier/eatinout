import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Restaurant from "@/models/Restaurant";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs"; // Ensure bcrypt is installed
import axios from "axios";
import { render } from "@react-email/render";
import RestaurantRegistrationEmail from "@/utils/email-templates/RestaurantRegistrationEmail";
import sendEmail from "@/lib/sendEmail";
import { RateLimiterMemory } from "rate-limiter-flexible";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
// Rate limiter: 10 attempts per minute per IP
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
  blockDuration: 300,
});
function getClientIP(req: Request): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const xRealIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  const xClientIp = req.headers.get("x-client-ip");
  
  let ip = xRealIp || cfConnectingIp || xClientIp || xForwardedFor || "unknown";
  
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }
  
  if (ip.includes(":") && !ip.includes("::")) {
    ip = ip.split(":")[0];
  }
  
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }
  
  return ip.trim();
}
async function getCountryCode(ip: string): Promise<string | null> {
  // Primary: ip-api.com (45 req/min free)
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.countryCode) {
        return data.countryCode;
      }
    }
  } catch (e) {
    console.log("Primary geo API failed");
  }
  
  // Fallback: ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country_code/`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const country = await res.text();
      if (country && country.length === 2 && !country.includes("error")) {
        return country.trim();
      }
    }
  } catch (e) {
    console.log("Fallback geo API failed");
  }
  
  return null;
}
export async function POST(req: any) {
  try {
    const ip = getClientIP(req);
  
    //DEBUG: Temporary logging (remove after fixing)
    console.log("Request Info:", {
      ip,
      headers: {
        xForwardedFor: req.headers.get("x-forwarded-for"),
        xRealIp: req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent")
      }
    });
  
    const userAgent = req.headers.get("user-agent");
    
    // Block missing user agent
    if (!userAgent) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }
  
    // Rate limiter
    try {
      await rateLimiter.consume(ip);
    } catch (rejRes: any) {
      const secondsLeft = Math.ceil(rejRes.msBeforeNext / 1000);
      return NextResponse.json(
        {
          message: `Too many login attempts. Your account is temporarily blocked for ${secondsLeft} seconds. Please try again later.`,
        },
        { status: 429 }
      );
    }
  
    // Test IP whitelist for production
    const testIps = [
      "157.119.124.184",
      "::1",
      "127.0.0.1",
      "localhost"
    ];
  
    const isTestIP = testIps.some(testIp => ip.includes(testIp)) || 
                     ip === "::1" || 
                     ip === "127.0.0.1" ||
                     ip === "unknown";
  
    // Only check geo in production for non-test IPs
    // if (process.env.NEXT_PUBLIC_NODE_ENV === "development" && !isTestIP) {
    //   try {
    //     const geo = await fetch(`https://ipapi.co/${ip}/json/`, {
    //       headers: { 'User-Agent': 'EatInOut-App/1.0' }
    //     });
        
    //     if (!geo.ok) {
    //       console.error("Geo API error:", geo.status);
    //     } else {
    //       const geoData = await geo.json();
          
    //       console.log("Geo Check:", { ip, country: geoData.country_code });
  
    //       if (geoData.country_code !== "GB") {
    //         return NextResponse.json(
    //           { message: "Access allowed only from UK" },
    //           { status: 403 }
    //         );
    //       }
    //     }
    //   } catch (error) {
    //     console.error("Geo lookup failed:", error);
    //   }
    // }
    if (process.env.NEXT_PUBLIC_NODE_ENV === "production" && !isTestIP) {
      const countryCode = await getCountryCode(ip);
      
      console.log("Geo Check:", { ip, country: countryCode });
      
      // If geo lookup failed completely → Block
      if (countryCode === null) {
        return NextResponse.json(
          { message: "Unable to verify your location. Please try again later." },
          { status: 403 }
        );
      }
      
      // If not UK → Block
      if (countryCode !== "GB") {
        return NextResponse.json(
          { message: "Access allowed only from UK" },
          { status: 403 }
        );
      }
    }
    // Connect to database
    await connectToDatabase();

    // Parse request body
    const { email, password } = await req.json();

    console.log(`Login attempt for email: ${email}`);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found: ${email}`);
      return NextResponse.json(
        { message: "No account found with this email. Please sign up to continue." },
        { status: 401 }
      );
    }

    // Check password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password); // Compare hashed password
    if (!isMatch) {
      console.log(`Password mismatch for user: ${email}`);
      return NextResponse.json(
        { message: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    console.log(`Password verified for user: ${email}`);

    // For restaurant users, check if their restaurant is approved
    let restaurantId = null;
    if (user.role === "restaurant") {
      console.log(`Checking restaurant approval for user: ${user._id}`);

      // Find restaurant by userId - convert to string to ensure proper matching
      const restaurant = await Restaurant.findOne({
        $or: [
          { userId: user._id.toString() },
          { userId: user._id },
          { email: user.email },
        ],
      });

      if (!restaurant) {
        console.log(`No restaurant found for user: ${user._id}`);
        return NextResponse.json(
          { message: "Restaurant account not found" },
          { status: 401 }
        );
      }

      console.log(
        `Restaurant found: ${restaurant._id}, status: ${restaurant.status}`
      );
      restaurantId = restaurant._id.toString();

      // if (restaurant.status !== "approved") {
      //   console.log(`Restaurant not approved: ${restaurant._id}`);
      //   return NextResponse.json(
      //     {
      //       message:
      //         "Your restaurant account is pending approval. You'll be notified when approved.",
      //       status: "pending",
      //     },
      //     { status: 403 }
      //   );
      // }

      // Fix the userId in the restaurant document if needed
      if (restaurant.userId !== user._id.toString()) {
        console.log(`Fixing userId mismatch for restaurant: ${restaurant._id}`);
        restaurant.userId = user._id.toString();
        await restaurant.save();
      }

      console.log(`Restaurant is approved, proceeding with login`);
    }

    // Create token
    const token = jwt.sign(
      {
        userId: user._id.toString(), // Ensure userId is a string
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

    console.log(`Login successful for: ${email}, role: ${user.role}`);

    //   const emailHtml = await render(
    //     RestaurantRegistrationEmail({
    //       ownerName: `Kavta Jakhar`,
    //       restaurantName: "Musafir Cafe",
    //       restaurantImage: "https://t3.ftcdn.net/jpg/03/24/73/92/360_F_324739203_keeq8udvv0P2h1MLYJ0GLSlTBagoXS48.webp",
    //     })
    //   );
    //  console.log("Email HTML:", "sending email to:", "kavita@antheminfotech.com")
    //   await sendEmail(
    //     "kavita@antheminfotech.com",
    //     `Eatinout - We've received your registration for Musafir Cafe`,
    //     emailHtml
    //   );

    // Create response
    const response = NextResponse.json({
      message: "Login successful",
      role: user.role,
      subscriptionStatus: user.subscriptionStatus || "inactive",
      email: user.email,
      userId: user._id.toString(),              
      firstName: user.firstName || "",                  
      lastName: user.lastName || "",                    
      restaurantId: restaurantId || null,               
    });

    // // Check if user role is 'user' and subscription is cancelled
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

    // Set cookies
    response.cookies.set({
      name: "auth_token",
      value: token,
      // httpOnly: true,
      path: "/",
      // secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 365 days
    });
    console.log(`Cookies set for: ${user.role}`);
    response.cookies.set({
      name: "user_role",
      value: user.role,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 365 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "An error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
