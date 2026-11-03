// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";

/**
 * PERFORMANCE OPTIMIZATIONS APPLIED:
 * 1. Optimized aggregation pipeline with better filtering
 * 2. Using lean() for faster queries where possible
 * 3. Caching headers (5 minutes cache, 10 minutes stale-while-revalidate)
 * 4. Request deduplication on frontend
 * 
 * RECOMMENDED DATABASE INDEXES:
 * - Category: { name: 1 }
 * - Restaurant: { category: 1, status: 1 }
 * - Offer: { restaurantId: 1, status: 1 }
 * - Area: { hideRestaurant: 1 }
 */

// Supabase (PostgREST) returns max 1000 rows per request by default
const SUPABASE_PAGE_SIZE = 1000;
// Max ids per .in() request (keeps the request URL short)
const ID_CHUNK = 100;
const fetchAllRows = async (buildQuery: () => any) => {
  const rows: any[] = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if ((data || []).length < SUPABASE_PAGE_SIZE) break;
  }
  return rows;
};

// Restaurant (+ related tables) columns; rows are mapped back to the old camelCase document shape below
const RESTAURANT_SELECT = `
  id, name, slug, description, address, city, zip_code, phone, email, website, user_id, status,
  dine_in, dine_out, delivery_available, associated_id, address_link, is_hidden,
  subscription_status, stripe_customer_id, lat, lng,
  home_is_pinned, home_pin_priority, home_pinned_at, created_at, updated_at,
  restaurant_areas(area_id),
  restaurant_categories(category_id),
  restaurant_tags(tag_id),
  restaurant_images(image_url, display_order),
  restaurant_menu_pdfs(pdf_url, display_order),
  restaurant_area_pins(area_id, is_pinned, priority, pinned_at),
  offers(
    id, restaurant_id, title, description, valid_days, valid_hours, start_date, expiry_date, terms, status,
    dine_in, dine_out, discount_percentage, free_item_name, other_offer_description, offer_type, offer_limit,
    associated_id, redeem_count, max_redemption_limit, is_unlimited, is_deactivated, run_until_further,
    booking_requirement, is_pinned, pinned_at, recurring_type, recurring_start_date, current_period_count,
    last_reset_date, created_at, updated_at,
    offer_areas(area_id), offer_tags(tag_id)
  )
`;

const byCreatedAt = (a: any, b: any) =>
  a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

const mapOffer = (o: any) => ({
  _id: o.id,
  restaurantId: o.restaurant_id,
  title: o.title,
  description: o.description,
  validDays: o.valid_days,
  validHours: o.valid_hours,
  startDate: o.start_date,
  expiryDate: o.expiry_date,
  terms: o.terms,
  status: o.status,
  dineIn: o.dine_in,
  dineOut: o.dine_out,
  areas: (o.offer_areas || []).map((x: any) => x.area_id),
  tags: (o.offer_tags || []).map((x: any) => x.tag_id),
  discountPercentage: o.discount_percentage,
  freeItemName: o.free_item_name,
  otherOfferDescription: o.other_offer_description,
  offerType: o.offer_type,
  offerLimit: o.offer_limit,
  associatedId: o.associated_id,
  redeemCount: o.redeem_count,
  maxRedemptionLimit: o.max_redemption_limit,
  isUnlimited: o.is_unlimited,
  deactivated: o.is_deactivated,
  runUntilFurther: o.run_until_further,
  bookingRequirement: o.booking_requirement,
  isPinned: o.is_pinned,
  pinnedAt: o.pinned_at,
  recurringType: o.recurring_type,
  recurringStartDate: o.recurring_start_date,
  currentPeriodCount: o.current_period_count,
  lastResetDate: o.last_reset_date,
  createdAt: o.created_at,
  updatedAt: o.updated_at,
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const rawId = params.id;
    const decodedCategory = decodeURIComponent(rawId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Get the matching category by name - use lean() for better performance
    const allCategories = await fetchAllRows(() =>
      supabaseAdmin
        .from("categories")
        .select("id, name")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
    );
    const matchedCategory = allCategories.find((c: any) => c.name === decodedCategory);
    const categoryDoc = matchedCategory && { _id: matchedCategory.id };
    if (!categoryDoc) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    const categoryId = categoryDoc._id;

    // Step 2: Aggregate restaurants with category and area filter
    const categoryRestaurantRows = await fetchAllRows(() =>
      supabaseAdmin
        .from("restaurant_categories")
        .select("restaurant_id")
        .eq("category_id", categoryId)
        .order("restaurant_id", { ascending: true })
    );
    const categoryRestaurantIds = categoryRestaurantRows.map((r: any) => r.restaurant_id);
    const idChunks: string[][] = [];
    for (let i = 0; i < categoryRestaurantIds.length; i += ID_CHUNK) {
      idChunks.push(categoryRestaurantIds.slice(i, i + ID_CHUNK));
    }

    const [hiddenAreasRes, restaurantChunkResults] = await Promise.all([
      // Lookup areas to see if any assigned area has hideRestaurant: true
      supabaseAdmin.from("areas").select("id").eq("hide_restaurant", true),
      Promise.all(
        idChunks.map((ids) =>
          supabaseAdmin
            .from("restaurants")
            .select(RESTAURANT_SELECT)
            .in("id", ids)
            // Filter approved restaurants
            .eq("status", "approved")
            // Only active offers are attached to each restaurant
            .eq("offers.status", "active")
            // { $gte: ["$$offer.expiryDate", today] },
        )
      ),
    ]);
    if (hiddenAreasRes.error) throw new Error(hiddenAreasRes.error.message);
    const hiddenAreaIds = new Set((hiddenAreasRes.data || []).map((a: any) => a.id));

    let restaurantRows: any[] = [];
    for (const res of restaurantChunkResults) {
      if (res.error) throw new Error(res.error.message);
      restaurantRows = restaurantRows.concat(res.data || []);
    }

    // Filter out restaurants that have any hidden area
    restaurantRows = restaurantRows
      .filter((r: any) => !(r.restaurant_areas || []).some((ra: any) => hiddenAreaIds.has(ra.area_id)))
      .sort(byCreatedAt);

    // Lookup categories for the restaurant (to get category names)
    const categoryOrder = new Map<string, { name: string; index: number }>(
      allCategories.map((c: any, index: number) => [c.id, { name: c.name, index }])
    );

    // Add filtered offers and combined category names to each restaurant
    const mappedRestaurants = restaurantRows.map((r: any) => {
      const categoryIds = (r.restaurant_categories || []).map((rc: any) => rc.category_id);
      const categoryName = categoryIds
        .filter((cid: string) => categoryOrder.has(cid))
        .sort((a: string, b: string) => categoryOrder.get(a)!.index - categoryOrder.get(b)!.index)
        .map((cid: string) => categoryOrder.get(cid)!.name)
        .join(", ");

      return {
        _id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        address: r.address,
        city: r.city,
        zipCode: r.zip_code,
        area: (r.restaurant_areas || []).map((ra: any) => ra.area_id),
        phone: r.phone,
        email: r.email,
        website: r.website,
        userId: r.user_id,
        images: (r.restaurant_images || [])
          .slice()
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((i: any) => i.image_url),
        status: r.status,
        dineIn: r.dine_in,
        dineOut: r.dine_out,
        deliveryAvailable: r.delivery_available,
        category: categoryIds,
        associatedId: r.associated_id,
        addressLink: r.address_link,
        menuPdfUrls: (r.restaurant_menu_pdfs || [])
          .slice()
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((p: any) => p.pdf_url),
        hidden: r.is_hidden,
        subscriptionStatus: r.subscription_status,
        stripeCustomerId: r.stripe_customer_id,
        homePin: {
          isPinned: r.home_is_pinned,
          priority: r.home_pin_priority,
          pinnedAt: r.home_pinned_at,
        },
        areaPins: (r.restaurant_area_pins || []).map((p: any) => ({
          areaId: p.area_id,
          isPinned: p.is_pinned,
          priority: p.priority,
          areaPinnedAt: p.pinned_at,
        })),
        searchTags: (r.restaurant_tags || []).map((t: any) => t.tag_id),
        lat: r.lat,
        lng: r.lng,
        ...(r.lat != null && r.lng != null
          ? { location: { type: "Point", coordinates: [r.lng, r.lat] } }
          : {}),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        offers: (r.offers || []).slice().sort(byCreatedAt).map(mapOffer),
        categoryName,
      };
    });

    const restaurants = mappedRestaurants.length > 0 ? [{ restaurants: mappedRestaurants }] : [];

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No restaurants found for this category",
        },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      restaurants: restaurants[0].restaurants,
    });

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

    return response;
  } catch (error: any) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}