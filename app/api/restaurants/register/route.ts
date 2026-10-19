import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { render } from "@react-email/render";
import RestaurantRegistrationEmail from "@/utils/email-templates/RestaurantRegistrationEmail";
import sendEmail from "@/lib/sendEmail";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateUniqueRestaurantSlug } from "@/lib/restaurant-slug";
import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/** Accept JSON numbers or numeric strings from the client. */
function parseCoord(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function POST(req: any) {
  try {
    const data = await req.json();
    const { firstName, lastName, email, password, restaurantName } = data;

    if (!firstName || !lastName || !email || !password || !restaurantName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const { data: existingUser, error: findUserErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (findUserErr) throw new Error(findUserErr.message);

    const { data: existingRestEmail, error: findRestErr } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (findRestErr) throw new Error(findRestErr.message);

    if (existingUser || existingRestEmail) {
      return NextResponse.json(
        { success: false, message: "User already exists" },
        { status: 400 }
      );
    }

    // Check if restaurant name already exists
    if (data.restaurantName?.trim()) {
      const { data: existingRestName } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .ilike("name", data.restaurantName.trim())
        .maybeSingle();

      if (existingRestName) {
        return NextResponse.json(
          { success: false, message: "Restaurant name already exist" },
          { status: 400 }
        );
      }
    }

    // Create user account for restaurant owner
    const userId = randomBytes(12).toString("hex");
    const passwordHash = await bcrypt.hash(password, 10);

    const { error: createUserError } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        role: "restaurant",
        zip_code: data.zipCode || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (createUserError) throw new Error(createUserError.message);

    // Get area name for slug generation
    let firstAreaName = "";
    if (Array.isArray(data.area) && data.area.length > 0) {
      try {
        const { data: firstArea } = await supabaseAdmin
          .from("areas")
          .select("name")
          .eq("id", data.area[0])
          .maybeSingle();
        if (firstArea) {
          firstAreaName = firstArea.name;
        }
      } catch (e) {
        console.error("Failed to fetch area for slug generation", e);
      }
    }

    const slug = await generateUniqueRestaurantSlug(
      data.restaurantName ?? "",
      firstAreaName,
      data.city ?? ""
    );

    let regLat = parseCoord(data.lat);
    let regLng = parseCoord(data.lng);

    // If frontend didn't send coords, try to geocode the address
    if (regLat === null || regLng === null) {
      try {
        const { getCoordinatesFromAddress } = await import("@/utils/geocoding");
        const coords = await getCoordinatesFromAddress(
          data.address || "",
          data.city || "",
          data.zipCode || ""
        );
        if (coords) {
          regLat = coords.lat;
          regLng = coords.lng;
        }
      } catch (geocodeError) {
        console.error("Geocoding failed during registration:", geocodeError);
      }

      // Fallback
      if (regLat === null || regLng === null) {
        regLat = DEFAULT_MAP_CENTER_LAT_LNG.lat;
        regLng = DEFAULT_MAP_CENTER_LAT_LNG.lng;
      }
    }

    const restaurantId = randomBytes(12).toString("hex");

    const { error: createRestError } = await supabaseAdmin
      .from("restaurants")
      .insert({
        id: restaurantId,
        name: data.restaurantName.trim(),
        slug,
        description: data.description || null,
        address: data.address || "",
        city: data.city || "",
        zip_code: data.zipCode || "",
        lat: regLat,
        lng: regLng,
        phone: data.phone || null,
        email: normalizedEmail,
        website: data.website || null,
        user_id: userId,
        status: "pending",
        address_link: data.addressLink || null,
        dine_in: data.dineIn ?? true,
        dine_out: data.dineOut ?? false,
        delivery_available: data.deliveryAvailable ?? false,
        is_hidden: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (createRestError) throw new Error(createRestError.message);

    // Child relations
    // 1. Categories
    if (Array.isArray(data.category) && data.category.length > 0) {
      const catRows = data.category.map((catId: string) => ({
        restaurant_id: restaurantId,
        category_id: catId,
      }));
      await supabaseAdmin.from("restaurant_categories").insert(catRows);
    }

    // 2. Areas
    if (Array.isArray(data.area) && data.area.length > 0) {
      const areaRows = data.area.map((areaId: string) => ({
        restaurant_id: restaurantId,
        area_id: areaId,
      }));
      await supabaseAdmin.from("restaurant_areas").insert(areaRows);
    }

    // 3. Images
    if (Array.isArray(data.images) && data.images.length > 0) {
      const imgRows = data.images.map((url: string, index: number) => ({
        restaurant_id: restaurantId,
        image_url: url,
        display_order: index + 1,
      }));
      await supabaseAdmin.from("restaurant_images").insert(imgRows);
    }

    // 4. Menu PDFs
    if (Array.isArray(data.menuPdfUrls) && data.menuPdfUrls.length > 0) {
      const pdfRows = data.menuPdfUrls.map((url: string, index: number) => ({
        restaurant_id: restaurantId,
        pdf_url: url,
        display_order: index + 1,
      }));
      await supabaseAdmin.from("restaurant_menu_pdfs").insert(pdfRows);
    }

    // 5. Search tags
    if (Array.isArray(data.searchTags) && data.searchTags.length > 0) {
      const tagRows = data.searchTags.map((tagId: string) => ({
        restaurant_id: restaurantId,
        tag_id: tagId,
      }));
      await supabaseAdmin.from("restaurant_tags").insert(tagRows);
    }

    // Send registration email (non-blocking)
    let emailError = null;
    try {
      const emailHtml = await render(
        RestaurantRegistrationEmail({
          ownerName: `${firstName} ${lastName}`,
          restaurantName: data.restaurantName,
          restaurantImage:
            data.images?.[0] ||
            "https://via.placeholder.com/600x300?text=Your+Restaurant",
        })
      );
      await sendEmail(
        normalizedEmail,
        `Eatinout - We've received your registration for ${data.restaurantName}`,
        emailHtml
      );
    } catch (error: any) {
      console.error("Error sending registration email:", error);
      emailError = `Registration email failed: ${error.message}`;
    }

    // Create JWT token for authentication
    const token = jwt.sign(
      {
        userId,
        email: normalizedEmail,
        role: "restaurant",
        firstName,
        lastName,
        restaurantId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const responseMessage = emailError
      ? "Restaurant registered successfully, but confirmation email failed to send"
      : "Restaurant registered successfully";

    const response = NextResponse.json(
      {
        success: true,
        message: responseMessage,
        restaurant: {
          _id: restaurantId,
          id: restaurantId,
          name: data.restaurantName,
          cuisine: data.cuisine,
          area: data.area,
          status: "pending",
        },
        emailError: emailError || undefined,
      },
      { status: 201 }
    );

    // Set auth cookie (7 days)
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Restaurant registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Registration failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
