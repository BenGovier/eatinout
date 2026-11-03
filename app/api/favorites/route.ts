import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
    };
    const userId = decodedToken.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not found in token" },
        { status: 401 }
      );
    }

    // 1. Fetch user's favorite restaurant IDs from user_favorites junction table
    const { data: favoriteRows, error: favError } = await supabaseAdmin
      .from("user_favorites")
      .select("restaurant_id")
      .eq("user_id", userId);

    if (favError) {
      console.error("Error fetching user_favorites:", favError);
      return NextResponse.json(
        { success: false, message: "Database error fetching favorites" },
        { status: 500 }
      );
    }

    const favoriteIds = (favoriteRows || [])
      .map((r: any) => r.restaurant_id)
      .filter(Boolean);

    if (favoriteIds.length === 0) {
      return NextResponse.json({ success: true, restaurants: [] });
    }

    // 2. Fetch approved restaurants
    const { data: restaurantsData, error: restError } = await supabaseAdmin
      .from("restaurants")
      .select(
        "id, name, slug, description, address, city, zip_code, phone, email, website, status, dine_in, dine_out, delivery_available, address_link, is_hidden, lat, lng, created_at, updated_at"
      )
      .in("id", favoriteIds)
      .eq("status", "approved");

    if (restError) {
      console.error("Error fetching favorite restaurants:", restError);
      return NextResponse.json(
        { success: false, message: "Failed to fetch restaurant details" },
        { status: 500 }
      );
    }

    const restaurants = restaurantsData || [];
    const validRestIds = restaurants.map((r: any) => r.id);

    if (validRestIds.length === 0) {
      return NextResponse.json({ success: true, restaurants: [] });
    }

    // 3. Parallel fetch images, categories, and active offers for these restaurants
    const [imagesRes, restCatsRes, offersRes] = await Promise.all([
      // Restaurant images
      supabaseAdmin
        .from("restaurant_images")
        .select("restaurant_id, image_url, display_order")
        .in("restaurant_id", validRestIds)
        .order("display_order", { ascending: true }),

      // Restaurant categories (with category name)
      supabaseAdmin
        .from("restaurant_categories")
        .select("restaurant_id, category_id, categories(id, name)")
        .in("restaurant_id", validRestIds),

      // Active offers
      supabaseAdmin
        .from("offers")
        .select(
          "id, restaurant_id, title, description, start_date, expiry_date, redeem_count, max_redemption_limit, is_unlimited, valid_days, discount_percentage, offer_type"
        )
        .in("restaurant_id", validRestIds)
        .eq("status", "active")
        .eq("is_deactivated", false),
    ]);

    // Group images by restaurant
    const imagesByRest = new Map<string, string[]>();
    (imagesRes.data || []).forEach((img: any) => {
      if (!imagesByRest.has(img.restaurant_id)) {
        imagesByRest.set(img.restaurant_id, []);
      }
      imagesByRest.get(img.restaurant_id)!.push(img.image_url);
    });

    // Group categories by restaurant
    const categoriesByRest = new Map<string, any[]>();
    (restCatsRes.data || []).forEach((rc: any) => {
      if (!categoriesByRest.has(rc.restaurant_id)) {
        categoriesByRest.set(rc.restaurant_id, []);
      }
      if (rc.categories) {
        categoriesByRest.get(rc.restaurant_id)!.push(rc.categories);
      }
    });

    // Group offers by restaurant (mapped to frontend expected camelCase)
    const offersByRest = new Map<string, any[]>();
    (offersRes.data || []).forEach((o: any) => {
      const restId = o.restaurant_id;
      if (!offersByRest.has(restId)) {
        offersByRest.set(restId, []);
      }
      offersByRest.get(restId)!.push({
        _id: o.id,
        id: o.id,
        restaurantId: o.restaurant_id,
        title: o.title,
        description: o.description,
        startDate: o.start_date,
        expiryDate: o.expiry_date,
        redeemCount: o.redeem_count || 0,
        codesRedeemed: o.redeem_count || 0,
        maxRedemptionLimit: o.max_redemption_limit,
        totalCodes: o.max_redemption_limit,
        isUnlimited: o.is_unlimited || false,
        validDays: o.valid_days,
        discountPercentage: o.discount_percentage,
        discount: o.discount_percentage ? `${o.discount_percentage}% off` : o.title,
        offerType: o.offer_type,
      });
    });

    // 4. Assemble final restaurant payload matching MongoDB format
    const restaurantsWithOffers = restaurants.map((restaurant: any) => {
      const images = imagesByRest.get(restaurant.id) || [];
      const categories = categoriesByRest.get(restaurant.id) || [];
      const offers = offersByRest.get(restaurant.id) || [];

      return {
        _id: restaurant.id,
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        address: restaurant.address,
        city: restaurant.city,
        zipCode: restaurant.zip_code,
        phone: restaurant.phone,
        email: restaurant.email,
        website: restaurant.website,
        status: restaurant.status,
        dineIn: restaurant.dine_in,
        dineOut: restaurant.dine_out,
        deliveryAvailable: restaurant.delivery_available,
        addressLink: restaurant.address_link,
        lat: restaurant.lat,
        lng: restaurant.lng,
        images: images,
        imageUrl: images[0] || null,
        category: categories,
        offers: offers,
      };
    });

    return NextResponse.json({
      success: true,
      restaurants: restaurantsWithOffers,
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
