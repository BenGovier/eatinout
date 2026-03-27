import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Restaurant from "@/models/Restaurant"
import User from "@/models/User"
import jwt from "jsonwebtoken"
import Tag from "@/models/Tag"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
import dotenv from "dotenv"
import { render } from "@react-email/render"
import RestaurantRegistrationEmail from "@/utils/email-templates/RestaurantRegistrationEmail"
import sendEmail from "@/lib/sendEmail"
import { generateUniqueRestaurantSlug } from "@/lib/restaurant-slug"
import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants"

dotenv.config()
export async function POST(req : any) {
  try {
    // Connect to database
    try {
      await connectToDatabase()
      console.log("Connected to database for registration")
    } catch (dbError: any) {
      console.error("Database connection error during registration:", dbError)
      return NextResponse.json(
        {
          success: false,
          message: "Database connection failed",
          error: dbError.message,
        },
        { status: 500 },
      )
    }

    // Parse the request body
    const data = await req.json()
    const { firstName, lastName, email, password } = data
    console.log("Parsed request body:", { ...data, password: "[REDACTED]" })

    if (!firstName || !lastName || !email || !password) {
      console.error("Missing required fields")
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    try {
      const existingUser = await User.findOne({ email }) 
      const existingRestaurant = await Restaurant.findOne({ email })
      if (existingUser || existingRestaurant) {
        return NextResponse.json({ success: false, message: "User already exists" }, { status: 400 })
      }
    } catch (findError: any) {
      console.error("Error checking for existing user:", findError)
      return NextResponse.json(
        { success: false, message: "Error checking for existing user", error: findError.message },
        { status: 500 },
      )
    }

    // Create user account for restaurant owner
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role: "restaurant",
      zipCode: data.zipCode,
    })

    await user.save()

    const slug = await generateUniqueRestaurantSlug(data.restaurantName ?? "")

    // Create restaurant record
    const regLat =
      typeof data.lat === "number" && Number.isFinite(data.lat)
        ? data.lat
        : DEFAULT_MAP_CENTER_LAT_LNG.lat
    const regLng =
      typeof data.lng === "number" && Number.isFinite(data.lng)
        ? data.lng
        : DEFAULT_MAP_CENTER_LAT_LNG.lng

    const restaurant = new Restaurant({
      name: data.restaurantName,
      slug,
      description: data.description,
      cuisine: data.cuisine,
      priceRange: data.priceRange,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      lat: regLat,
      lng: regLng,
      area: data.area,
      phone: data.phone,
      email: data.email,
      website: data.website,
      openingHours: data.openingHours,
      userId: user._id.toString(),
      images: data.images || [],
      status: "pending",
      category: data.category,
      addressLink: data.addressLink,
      dineIn: data.dineIn,
      dineOut: data.dineOut,
      deliveryAvailable: data.deliveryAvailable,
      menuPdfUrls: data.menuPdfUrls || [],
      searchTags: data.searchTags || [], 
    })
    await restaurant.save()

    // 🔗 Sync Tags → Restaurant
if (data.searchTags?.length > 0) {
  await Tag.updateMany(
    { _id: { $in: data.searchTags } },
    { $addToSet: { restaurants: restaurant._id } }
  )
}
    
    // Send registration email (non-blocking)
    let emailError = null;
    try {
      const emailHtml = await render(
        RestaurantRegistrationEmail({
          ownerName: `${firstName} ${lastName}`,
          restaurantName: data.restaurantName,
          restaurantImage: data.images?.[0] || "https://via.placeholder.com/600x300?text=Your+Restaurant",
        })
      );
      console.log("Email HTML:", "sending email to:", user.email)
      await sendEmail(
        user.email,
        `Eatinout - We've received your registration for ${data.restaurantName}`,
        emailHtml
      );
      console.log("Registration email sent successfully to:", user.email);
    } catch (error: any) {
      console.error("Error sending registration email:", error);
      emailError = `Registration email failed: ${error.message}`;
    }
  
    console.log(`Created restaurant: ${restaurant._id}, status: pending, linked to user: ${user._id}`)

    // Create JWT token for authentication
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        restaurantId: restaurant._id,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )
    
    // Create response
    const responseMessage = emailError 
      ? "Restaurant registered successfully, but confirmation email failed to send"
      : "Restaurant registered successfully";
    
    const response = NextResponse.json(
      {
        success: true,
        message: responseMessage,
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          area: restaurant.area,
          status: restaurant.status,
        },
        emailError: emailError || undefined,
      },
      { status: 201 },
    )

    // Set auth cookie
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 1, // 7 days
    })

    return response
  } catch (error :any) {
    console.error("Restaurant registration error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Registration failed",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

