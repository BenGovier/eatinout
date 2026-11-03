import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateSlug } from "@/lib/utils";

const weekOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type PublicRestaurantDetail = {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  location: string;
  address: string;
  phone: string;
  website?: string;
  openingHours?: unknown;
  area: { id: unknown; name: string }[];
  rating: number;
  addressLink?: string;
  priceRange?: string;
  email: string;
  imageUrl: string;
  galleryImages: string[];
  category: { id: unknown; name: string }[];
  offers: Array<{
    id: string;
    restaurantId: string;
    restaurantName: string;
    offerTitle: string;
    validDays: string;
    validHours?: string;
    expiryDate?: unknown;
    imageUrl: string;
    cuisine: string;
    location: string;
    description?: string;
    terms: string;
    associatedId: string;
    bookingRequirement: string;
  }>;
  dineIn: boolean;
  dineOut: boolean;
  deliveryAvailable: boolean;
  menuPdfUrls: string[];
};

export type GetPublicRestaurantDetailResult =
  | { success: true; restaurant: PublicRestaurantDetail }
  | { success: false; status: 404 | 500; message: string; error?: string };

// ids are the migrated 24-char hex strings
function isValidObjectId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

const RESTAURANT_SELECT =
  "*, restaurant_areas(area_id), restaurant_categories(category_id), restaurant_images(image_url, display_order), restaurant_menu_pdfs(pdf_url, display_order)";

const OFFER_SELECT =
  "id, title, description, valid_days, valid_hours, start_date, expiry_date, status, is_deactivated, restaurant_id, is_pinned, pinned_at, created_at, terms, associated_id, booking_requirement, is_unlimited, max_redemption_limit, redeem_count, current_period_count, recurring_type, recurring_start_date, last_reset_date";

// Supabase row -> same shape the old Mongoose doc had, so the code below stays unchanged
// (cuisine / opening_hours / price_range are read only if those columns exist)
function toLegacyRestaurant(r: any) {
  const byOrder = (a: any, b: any) =>
    (a.display_order ?? 0) - (b.display_order ?? 0);
  return {
    ...r,
    _id: r.id,
    zipCode: r.zip_code,
    dineIn: r.dine_in,
    dineOut: r.dine_out,
    deliveryAvailable: r.delivery_available,
    addressLink: r.address_link,
    openingHours: r.opening_hours,
    priceRange: r.price_range,
    area: (r.restaurant_areas ?? []).map((x: any) => x.area_id),
    category: (r.restaurant_categories ?? []).map((x: any) => x.category_id),
    images: (r.restaurant_images ?? [])
      .slice()
      .sort(byOrder)
      .map((i: any) => i.image_url),
    menuPdfUrls: (r.restaurant_menu_pdfs ?? [])
      .slice()
      .sort(byOrder)
      .map((p: any) => p.pdf_url),
  };
}

// Supabase offer row -> same shape the old Mongoose offer had
function toLegacyOffer(o: any) {
  return {
    _id: o.id,
    title: o.title,
    description: o.description,
    validDays: o.valid_days,
    validHours: o.valid_hours,
    startDate: o.start_date,
    expiryDate: o.expiry_date,
    status: o.status,
    deactivated: o.is_deactivated,
    restaurantId: o.restaurant_id,
    isPinned: o.is_pinned,
    pinnedAt: o.pinned_at,
    createdAt: o.created_at,
    terms: o.terms,
    associatedId: o.associated_id,
    bookingRequirement: o.booking_requirement,
    isUnlimited: o.is_unlimited,
    maxRedemptionLimit: o.max_redemption_limit,
    redeemCount: o.redeem_count,
    currentPeriodCount: o.current_period_count,
    recurringType: o.recurring_type,
    recurringStartDate: o.recurring_start_date,
    lastResetDate: o.last_reset_date,
  };
}

async function findRestaurantBy(column: "id" | "slug", value: string) {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq(column, value)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toLegacyRestaurant(data) : null;
}

/**
 * Shared loader for `/restaurant/[id]` (ObjectId, generated slug, or stored slug).
 */
export async function getPublicRestaurantDetailByRouteParam(
  routeParam: string,
): Promise<GetPublicRestaurantDetailResult> {
  try {
    let restaurant: any = null;
    if (isValidObjectId(routeParam)) {
      restaurant = await findRestaurantBy("id", routeParam);
    } else {
      restaurant = await findRestaurantBy("slug", routeParam);
      if (!restaurant) {
        const { data: allRestaurantsData, error: allError } =
          await supabaseAdmin.from("restaurants").select("id, name").limit(1000);
        if (allError) throw new Error(allError.message);
        const allRestaurants = (allRestaurantsData || []).map((r: any) => ({
          _id: r.id,
          name: r.name,
        }));
        const match = (allRestaurants as any[]).find((r) => {
          const restaurantSlug = generateSlug(r.name, r._id.toString());
          return restaurantSlug === routeParam;
        });
        if (match) {
          restaurant = await findRestaurantBy("id", match._id);
        }
      }
    }

    if (!restaurant) {
      return {
        success: false,
        status: 404,
        message: "Restaurant not found",
      };
    }

    const catIds = Array.isArray(restaurant.category)
      ? restaurant.category
      : restaurant.category
        ? [restaurant.category]
        : [];
    const areaIds = Array.isArray(restaurant.area)
      ? restaurant.area
      : restaurant.area
        ? [restaurant.area]
        : [];

    // offers + category names + area names in one parallel round trip
    const [offersRes, catRes, areaRes]: any[] = await Promise.all([
      supabaseAdmin
        .from("offers")
        .select(OFFER_SELECT)
        .eq("restaurant_id", restaurant._id),
      catIds.length > 0
        ? supabaseAdmin.from("categories").select("id, name").in("id", catIds)
        : { data: [], error: null },
      areaIds.length > 0
        ? supabaseAdmin.from("areas").select("id, name").in("id", areaIds)
        : { data: [], error: null },
    ]);
    if (offersRes.error) throw new Error(offersRes.error.message);
    if (catRes.error) throw new Error(catRes.error.message);
    if (areaRes.error) throw new Error(areaRes.error.message);

    const allOffersRaw = (offersRes.data || []).map(toLegacyOffer);

    const now = new Date();
    const bulkUpdates: { id: string; set: Record<string, any> }[] = [];
    const offers = allOffersRaw.map((offer: any) => {
      let adjustedStatus = offer.status;

      if (!offer.deactivated) {
        const startDate = offer.startDate ? new Date(offer.startDate) : null;
        const expiryDate = offer.expiryDate
          ? new Date(offer.expiryDate)
          : null;

        if (startDate && startDate > now) {
          if (offer.status !== "inactive") {
            adjustedStatus = "inactive";
            bulkUpdates.push({ id: offer._id, set: { status: "inactive" } });
          }
        } else if (expiryDate && expiryDate < now) {
          if (offer.status !== "expired") {
            adjustedStatus = "expired";
            bulkUpdates.push({ id: offer._id, set: { status: "expired" } });
          }
        } else if (
          startDate &&
          startDate <= now &&
          (!expiryDate || expiryDate > now)
        ) {
          if (offer.status !== "active") {
            adjustedStatus = "active";
            bulkUpdates.push({ id: offer._id, set: { status: "active" } });
          }
        } else if (!expiryDate) {
          if (offer.status !== "active") {
            adjustedStatus = "active";
            bulkUpdates.push({ id: offer._id, set: { status: "active" } });
          }
        }
      }

      let currentPeriodCount = offer.currentPeriodCount || 0;
      if (offer.maxRedemptionLimit && offer.maxRedemptionLimit > 0 && offer.recurringType && offer.recurringType !== "never") {
        const now = new Date();
        const lastReset = offer.lastResetDate || offer.recurringStartDate || offer.createdAt;
        let shouldReset = false;
        
        if (offer.recurringType === "weekly") {
          const daysSinceReset = Math.floor((now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24));
          shouldReset = daysSinceReset >= 7;
        } else if (offer.recurringType === "monthly") {
          const daysSinceReset = Math.floor((now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24));
          shouldReset = daysSinceReset >= 30;
        }

        if (shouldReset) {
          currentPeriodCount = 0;
          bulkUpdates.push({
            id: offer._id,
            set: {
              current_period_count: 0,
              last_reset_date: now.toISOString(),
            },
          });
        }
      }

      return { ...offer, status: adjustedStatus, currentPeriodCount };
    });

    if (bulkUpdates.length > 0) {
      const results = await Promise.all(
        bulkUpdates.map((u) =>
          supabaseAdmin.from("offers").update(u.set).eq("id", u.id),
        ),
      );
      for (const r of results) {
        if (r.error) throw new Error(r.error.message);
      }
    }

    const activeOffers = offers.filter((offer: any) => {
      if (offer.status !== "active") return false;

      // Hide offers that have reached their redemption limit
      if (!offer.isUnlimited && offer.maxRedemptionLimit) {
        const currentCount = (offer.recurringType && offer.recurringType !== "never") 
          ? (offer.currentPeriodCount || 0)
          : (offer.redeemCount || 0);
          
        const remaining = offer.maxRedemptionLimit - currentCount;
        if (remaining <= 0) return false;
      }

      return true;
    });

    const sortedActiveOffers = activeOffers.sort((a: any, b: any) => {
      if (a.isPinned && b.isPinned) {
        const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bTime - aTime;
      }
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    const catDocs = (catRes.data || []).map((c: any) => ({
      _id: c.id,
      name: c.name,
    }));
    const areaDocs = (areaRes.data || []).map((a: any) => ({
      _id: a.id,
      name: a.name,
    }));

    const catMap = new Map(catDocs.map((c: any) => [c._id.toString(), c.name]));
    const areaMap = new Map(
      areaDocs.map((a: any) => [a._id.toString(), a.name]),
    );

    const categories = catIds.map((catId: any) => ({
      id: catId,
      name: catMap.get(catId.toString()) ?? "Unknown Category",
    }));
    const areaDetails = areaIds.map((areaId: any) => ({
      id: areaId,
      name: areaMap.get(areaId.toString()) ?? "Unknown Area",
    }));

    const formattedRestaurant: PublicRestaurantDetail = {
      id: restaurant._id.toString(),
      name: restaurant.name,
      description: restaurant.description,
      cuisine: restaurant.cuisine,
      location: restaurant.city,
      address: `${restaurant.address}, ${restaurant.city},  ${restaurant.zipCode.toUpperCase()}`,
      phone: restaurant.phone,
      website: restaurant.website,
      openingHours: restaurant.openingHours,
      area: areaDetails,
      rating: 4.5,
      addressLink: restaurant.addressLink,
      priceRange: restaurant.priceRange,
      email: restaurant.email,
      imageUrl:
        restaurant.images && restaurant.images.length > 0
          ? restaurant.images[0]
          : "/placeholder.svg?height=400&width=800",
      galleryImages: restaurant.images || [],
      category: categories,
      offers: sortedActiveOffers.map((offer: any) => ({
        id: offer._id.toString(),
        restaurantId: restaurant._id.toString(),
        restaurantName: restaurant.name,
        offerTitle: offer.title,
        validDays: offer.validDays
          ? offer.validDays
            .split(",")
            .map((day: string) => day.trim())
            .sort(
              (a: string, b: string) =>
                weekOrder.indexOf(a) - weekOrder.indexOf(b),
            )
            .join(", ")
          : "",
        validHours: offer.validHours,
        // same ISO format Mongo dates serialized to
        expiryDate: offer.expiryDate
          ? new Date(offer.expiryDate).toISOString()
          : offer.expiryDate,
        imageUrl:
          restaurant.images && restaurant.images.length > 0
            ? restaurant.images[0]
            : "/placeholder.svg?height=400&width=800",
        cuisine: restaurant.cuisine,
        location: `${restaurant.city}, ${restaurant.area}`,
        description: offer.description,
        terms: offer.terms || "",
        associatedId: offer.associatedId || "",
        bookingRequirement: offer.bookingRequirement || "mandatory",
      })),
      dineIn: restaurant.dineIn || false,
      dineOut: restaurant.dineOut || false,
      deliveryAvailable: restaurant.deliveryAvailable || false,
      menuPdfUrls: Array.isArray(restaurant.menuPdfUrls)
        ? restaurant.menuPdfUrls
        : [],
    };

    return { success: true, restaurant: formattedRestaurant };
  } catch (dbError: unknown) {
    console.error("Database error:", dbError);
    const message =
      dbError instanceof Error ? dbError.message : "Database error";
    return {
      success: false,
      status: 500,
      message: "Failed to fetch restaurant from database",
      error: message,
    };
  }
}

/** Paths to pre-render: ObjectId, name-based slug, and stored slug when present. */
export async function getPublicRestaurantBuildTimePathParams(): Promise<
  { id: string }[]
> {
  // approved + not hidden (Supabase returns max 1000 rows per request, so page through)
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, slug")
      .eq("status", "approved")
      .eq("is_hidden", false)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const seen = new Set<string>();
  const out: { id: string }[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push({ id: t });
  };

  for (const r of rows as any[]) {
    const idStr = r.id;
    push(idStr);
    push(generateSlug(r.name, idStr));
    const slug = typeof r.slug === "string" ? r.slug.trim() : "";
    if (slug) push(slug);
  }

  return out;
}