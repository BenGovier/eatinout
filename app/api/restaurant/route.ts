import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { generateUniqueRestaurantSlug } from "@/lib/restaurant-slug";
import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken: { restaurantId?: string; userId?: string; role: string };
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.userId;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Helper to get category details
    const getCategories = async (categoryIds: any[]) => {
      if (!categoryIds || categoryIds.length === 0) return [];
      const { data: categories } = await supabaseAdmin
        .from("categories")
        .select("id, name")
        .in("id", categoryIds);
      const catMap = new Map((categories || []).map((c) => [c.id, c.name]));
      return categoryIds.map((cid) => ({
        id: cid,
        name: catMap.get(cid) || null,
      }));
    };

    // Helper to get area details
    const getAreas = async (areaIds: any[]) => {
      if (!areaIds || areaIds.length === 0) return [];
      const { data: areas } = await supabaseAdmin
        .from("areas")
        .select("id, name, hide_restaurant")
        .in("id", areaIds);
      const areaMap = new Map((areas || []).map((a) => [a.id, a]));
      return areaIds.map((aid) => {
        const area = areaMap.get(aid);
        return {
          id: aid,
          name: area ? area.name : null,
          hideRestaurant: area ? !!area.hide_restaurant : false,
        };
      });
    };

    if (id) {
      const { data: restaurant, error } = await supabaseAdmin
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .or(`associated_id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      if (error || !restaurant) {
        return NextResponse.json(
          { message: "Restaurant not found or you don't have access" },
          { status: 404 }
        );
      }

      // Fetch junction tables
      const [catsRes, areasRes, imagesRes, menuPdfsRes, tagsRes] = await Promise.all([
        supabaseAdmin.from("restaurant_categories").select("category_id").eq("restaurant_id", id),
        supabaseAdmin.from("restaurant_areas").select("area_id").eq("restaurant_id", id),
        supabaseAdmin.from("restaurant_images").select("image_url, display_order").eq("restaurant_id", id).order("display_order"),
        supabaseAdmin.from("restaurant_menu_pdfs").select("pdf_url, display_order").eq("restaurant_id", id).order("display_order"),
        supabaseAdmin.from("restaurant_tags").select("tag_id").eq("restaurant_id", id),
      ]);

      const catIds = (catsRes.data || []).map((c) => c.category_id);
      const areaIds = (areasRes.data || []).map((a) => a.area_id);
      const categories = await getCategories(catIds);
      const areas = await getAreas(areaIds);

      return NextResponse.json({
        ...restaurant,
        _id: restaurant.id,
        userId: restaurant.user_id,
        zipCode: restaurant.zip_code,
        dineIn: restaurant.dine_in,
        dineOut: restaurant.dine_out,
        deliveryAvailable: restaurant.delivery_available,
        associatedId: restaurant.associated_id,
        addressLink: restaurant.address_link,
        subscriptionStatus: restaurant.subscription_status,
        stripeCustomerId: restaurant.stripe_customer_id,
        homeIsPinned: restaurant.home_is_pinned,
        homePinPriority: restaurant.home_pin_priority,
        images: (imagesRes.data || []).map((img) => img.image_url),
        menuPdfUrls: (menuPdfsRes.data || []).map((m) => m.pdf_url),
        searchTags: (tagsRes.data || []).map((t) => t.tag_id),
        category: categories,
        area: areas,
      });
    } else {
      // Fetch total count
      const { count: totalCount } = await supabaseAdmin
        .from("restaurants")
        .select("*", { count: "exact", head: true })
        .or(`associated_id.eq.${userId},user_id.eq.${userId}`);

      const total = totalCount || 0;

      // Fetch paginated restaurants
      const { data: restaurants, error: fetchErr } = await supabaseAdmin
        .from("restaurants")
        .select("*")
        .or(`associated_id.eq.${userId},user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .range(skip, skip + limit - 1);

      if (fetchErr || !restaurants || restaurants.length === 0) {
        return NextResponse.json(
          { message: "No restaurants found for this account" },
          { status: 404 }
        );
      }

      const restIds = restaurants.map((r) => r.id);

      // Batch fetch junction tables
      const [catsRes, areasRes, imagesRes, menuPdfsRes, tagsRes] = await Promise.all([
        supabaseAdmin.from("restaurant_categories").select("restaurant_id, category_id").in("restaurant_id", restIds),
        supabaseAdmin.from("restaurant_areas").select("restaurant_id, area_id").in("restaurant_id", restIds),
        supabaseAdmin.from("restaurant_images").select("restaurant_id, image_url, display_order").in("restaurant_id", restIds).order("display_order"),
        supabaseAdmin.from("restaurant_menu_pdfs").select("restaurant_id, pdf_url, display_order").in("restaurant_id", restIds).order("display_order"),
        supabaseAdmin.from("restaurant_tags").select("restaurant_id, tag_id").in("restaurant_id", restIds),
      ]);

      const allCatIds = Array.from(new Set((catsRes.data || []).map((c) => c.category_id)));
      const allAreaIds = Array.from(new Set((areasRes.data || []).map((a) => a.area_id)));

      const [allCatsList, allAreasList] = await Promise.all([
        getCategories(allCatIds),
        getAreas(allAreaIds),
      ]);

      const catMap = new Map(allCatsList.map((c) => [c.id, c]));
      const areaMap = new Map(allAreasList.map((a) => [a.id, a]));

      // Group by restaurant
      const restCatsMap = new Map<string, any[]>();
      (catsRes.data || []).forEach((c) => {
        const list = restCatsMap.get(c.restaurant_id) || [];
        const cat = catMap.get(c.category_id);
        if (cat) list.push(cat);
        restCatsMap.set(c.restaurant_id, list);
      });

      const restAreasMap = new Map<string, any[]>();
      (areasRes.data || []).forEach((a) => {
        const list = restAreasMap.get(a.restaurant_id) || [];
        const area = areaMap.get(a.area_id);
        if (area) list.push(area);
        restAreasMap.set(a.restaurant_id, list);
      });

      const restImagesMap = new Map<string, string[]>();
      (imagesRes.data || []).forEach((img) => {
        const list = restImagesMap.get(img.restaurant_id) || [];
        list.push(img.image_url);
        restImagesMap.set(img.restaurant_id, list);
      });

      const restMenuPdfsMap = new Map<string, string[]>();
      (menuPdfsRes.data || []).forEach((m) => {
        const list = restMenuPdfsMap.get(m.restaurant_id) || [];
        list.push(m.pdf_url);
        restMenuPdfsMap.set(m.restaurant_id, list);
      });

      const restTagsMap = new Map<string, string[]>();
      (tagsRes.data || []).forEach((t) => {
        const list = restTagsMap.get(t.restaurant_id) || [];
        list.push(t.tag_id);
        restTagsMap.set(t.restaurant_id, list);
      });

      const restaurantData = restaurants.map((restaurant) => {
        return {
          ...restaurant,
          _id: restaurant.id,
          userId: restaurant.user_id,
          zipCode: restaurant.zip_code,
          dineIn: restaurant.dine_in,
          dineOut: restaurant.dine_out,
          deliveryAvailable: restaurant.delivery_available,
          associatedId: restaurant.associated_id,
          addressLink: restaurant.address_link,
          subscriptionStatus: restaurant.subscription_status,
          stripeCustomerId: restaurant.stripe_customer_id,
          homeIsPinned: restaurant.home_is_pinned,
          homePinPriority: restaurant.home_pin_priority,
          images: restImagesMap.get(restaurant.id) || [],
          menuPdfUrls: restMenuPdfsMap.get(restaurant.id) || [],
          searchTags: restTagsMap.get(restaurant.id) || [],
          category: restCatsMap.get(restaurant.id) || [],
          area: restAreasMap.get(restaurant.id) || [],
        };
      });

      return NextResponse.json({
        data: restaurantData,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  } catch (error: any) {
    console.error("Error fetching restaurant data:", error);
    return NextResponse.json(
      { message: "Failed to fetch restaurant data", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken: { restaurantId?: string; userId?: string; role: string };
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const data = await request.json();

    if (!data.name || !data.email) {
      return NextResponse.json(
        { message: "Missing required fields: name or email" },
        { status: 400 }
      );
    }

    // Check if the email already exists for another user
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", data.email)
      .neq("id", decodedToken.userId || "")
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Check user's primary restaurant status
    const { data: userRestaurant } = await supabaseAdmin
      .from("restaurants")
      .select("status")
      .eq("user_id", decodedToken.userId || "")
      .maybeSingle();

    if (userRestaurant?.status === "pending") {
      return NextResponse.json(
        {
          message:
            "Your restaurant is still being reviewed. Once it's approved, you'll be able to add more restaurants.",
        },
        { status: 400 }
      );
    }

    // Check if restaurant name already exists (case-insensitive)
    const { data: existingRestaurant } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .ilike("name", data.name.trim())
      .maybeSingle();

    if (existingRestaurant) {
      return NextResponse.json(
        { message: "Restaurant name already exist" },
        { status: 400 }
      );
    }

    // Get area name for slug generation
    let firstAreaName = "";
    if (data.area && data.area.length > 0) {
      const { data: firstArea } = await supabaseAdmin
        .from("areas")
        .select("name")
        .eq("id", data.area[0])
        .maybeSingle();
      if (firstArea) {
        firstAreaName = firstArea.name;
      }
    }

    const slug = await generateUniqueRestaurantSlug(
      data.name ?? "",
      firstAreaName,
      data.city ?? ""
    );

    const lat = typeof data.lat === "number" && Number.isFinite(data.lat) ? data.lat : DEFAULT_MAP_CENTER_LAT_LNG.lat;
    const lng = typeof data.lng === "number" && Number.isFinite(data.lng) ? data.lng : DEFAULT_MAP_CENTER_LAT_LNG.lng;

    const newRestaurantId = crypto.randomBytes(12).toString("hex");

    const { data: newRestaurant, error: insertErr } = await supabaseAdmin
      .from("restaurants")
      .insert({
        id: newRestaurantId,
        name: data.name,
        slug,
        description: data.description || null,
        address: data.address || "",
        city: data.city || "",
        zip_code: data.zipCode || data.zip_code || "",
        phone: data.phone || null,
        email: data.email,
        website: data.website || null,
        user_id: decodedToken.userId,
        associated_id: decodedToken.userId,
        status: "approved",
        dine_in: data.dineIn !== undefined ? !!data.dineIn : true,
        dine_out: data.dineOut !== undefined ? !!data.dineOut : false,
        delivery_available: data.deliveryAvailable !== undefined ? !!data.deliveryAvailable : false,
        address_link: data.addressLink || null,
        lat,
        lng,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr || !newRestaurant) {
      console.error("Error creating restaurant:", insertErr);
      return NextResponse.json(
        { message: "Failed to create restaurant", error: insertErr?.message },
        { status: 500 }
      );
    }

    // Insert categories
    if (Array.isArray(data.category) && data.category.length > 0) {
      const catRows = data.category.map((catId: string) => ({
        restaurant_id: newRestaurantId,
        category_id: catId,
      }));
      await supabaseAdmin.from("restaurant_categories").insert(catRows);
    }

    // Insert areas
    if (Array.isArray(data.area) && data.area.length > 0) {
      const areaRows = data.area.map((areaId: string) => ({
        restaurant_id: newRestaurantId,
        area_id: areaId,
      }));
      await supabaseAdmin.from("restaurant_areas").insert(areaRows);
    }

    // Insert images
    if (Array.isArray(data.images) && data.images.length > 0) {
      const imgRows = data.images.map((url: string, index: number) => ({
        restaurant_id: newRestaurantId,
        image_url: url,
        display_order: index + 1,
      }));
      await supabaseAdmin.from("restaurant_images").insert(imgRows);
    }

    // Insert menu PDFs
    if (Array.isArray(data.menuPdfUrls) && data.menuPdfUrls.length > 0) {
      const pdfRows = data.menuPdfUrls.map((url: string, index: number) => ({
        restaurant_id: newRestaurantId,
        pdf_url: url,
        display_order: index + 1,
      }));
      await supabaseAdmin.from("restaurant_menu_pdfs").insert(pdfRows);
    }

    // Insert tags
    if (Array.isArray(data.searchTags) && data.searchTags.length > 0) {
      const tagRows = data.searchTags.map((tagId: string) => ({
        restaurant_id: newRestaurantId,
        tag_id: tagId,
      }));
      await supabaseAdmin.from("restaurant_tags").insert(tagRows);
    }

    return NextResponse.json(
      {
        message: "Restaurant created successfully",
        restaurant: {
          ...newRestaurant,
          _id: newRestaurant.id,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating restaurant:", error);
    return NextResponse.json(
      { message: "Failed to create restaurant", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken: { restaurantId?: string; role: string; userId: string };
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        role: string;
        userId: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant" },
          { status: 403 }
        );
      }

      if (!decodedToken.restaurantId) {
        return NextResponse.json(
          { message: "Restaurant ID not found in token" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const data = await request.json();

    if (data.email) {
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", data.email)
        .neq("id", decodedToken.userId)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { message: "An account with this email already exists." },
          { status: 409 }
        );
      }
    }

    const {
      restaurantId,
      menuPdfUrls,
      searchTags,
      images,
      category,
      area,
      slug: _clientSlug,
      ...rest
    } = data;

    const targetRestId = restaurantId || decodedToken.restaurantId;

    if (rest.name) {
      const { data: existingRestaurant } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .ilike("name", rest.name.trim())
        .neq("id", targetRestId)
        .maybeSingle();

      if (existingRestaurant) {
        return NextResponse.json(
          { message: "Restaurant name already exist" },
          { status: 400 }
        );
      }
    }

    // Fetch existing restaurant
    const { data: currentRestaurant } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", targetRestId)
      .maybeSingle();

    if (!currentRestaurant) {
      return NextResponse.json(
        { message: "Restaurant not found" },
        { status: 404 }
      );
    }

    const updatedName = typeof rest.name === "string" ? rest.name : currentRestaurant.name;
    const updatedCity = typeof rest.city === "string" ? rest.city : currentRestaurant.city;

    let firstAreaName = "";
    const areaIds = area || [];
    if (areaIds.length > 0) {
      const { data: firstArea } = await supabaseAdmin
        .from("areas")
        .select("name")
        .eq("id", areaIds[0])
        .maybeSingle();
      if (firstArea) {
        firstAreaName = firstArea.name;
      }
    }

    const newSlug = await generateUniqueRestaurantSlug(
      updatedName,
      firstAreaName,
      updatedCity,
      targetRestId
    );

    // Geocoding logic
    let lat = rest.lat !== undefined ? rest.lat : currentRestaurant.lat;
    let lng = rest.lng !== undefined ? rest.lng : currentRestaurant.lng;

    const addressChanged = rest.address !== undefined && rest.address !== currentRestaurant.address;
    const cityChanged = rest.city !== undefined && rest.city !== currentRestaurant.city;
    const zipCodeChanged = (rest.zipCode || rest.zip_code) !== undefined && (rest.zipCode || rest.zip_code) !== currentRestaurant.zip_code;
    const missingCoords = !lat || !lng;

    if (addressChanged || cityChanged || zipCodeChanged || missingCoords) {
      try {
        const { getCoordinatesFromAddress } = await import("@/utils/geocoding");
        const targetAddress = typeof rest.address === "string" ? rest.address : currentRestaurant.address || "";
        const targetCity = typeof rest.city === "string" ? rest.city : currentRestaurant.city || "";
        const targetZipCode = typeof (rest.zipCode || rest.zip_code) === "string" ? (rest.zipCode || rest.zip_code) : currentRestaurant.zip_code || "";

        const coords = await getCoordinatesFromAddress(targetAddress, targetCity, targetZipCode);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      } catch (geocodeError) {
        console.error("Geocoding failed during update:", geocodeError);
      }
    }

    const updatePayload: any = {
      slug: newSlug,
      updated_at: new Date().toISOString(),
    };

    if (rest.name !== undefined) updatePayload.name = rest.name;
    if (rest.description !== undefined) updatePayload.description = rest.description;
    if (rest.address !== undefined) updatePayload.address = rest.address;
    if (rest.city !== undefined) updatePayload.city = rest.city;
    if (rest.zipCode !== undefined || rest.zip_code !== undefined) updatePayload.zip_code = rest.zipCode || rest.zip_code;
    if (rest.phone !== undefined) updatePayload.phone = rest.phone;
    if (rest.email !== undefined) updatePayload.email = rest.email;
    if (rest.website !== undefined) updatePayload.website = rest.website;
    if (rest.dineIn !== undefined) updatePayload.dine_in = !!rest.dineIn;
    if (rest.dineOut !== undefined) updatePayload.dine_out = !!rest.dineOut;
    if (rest.deliveryAvailable !== undefined) updatePayload.delivery_available = !!rest.deliveryAvailable;
    if (rest.addressLink !== undefined) updatePayload.address_link = rest.addressLink;
    if (lat !== undefined) updatePayload.lat = lat;
    if (lng !== undefined) updatePayload.lng = lng;

    const { data: updatedRestaurant, error: updateErr } = await supabaseAdmin
      .from("restaurants")
      .update(updatePayload)
      .eq("id", targetRestId)
      .select()
      .single();

    if (updateErr || !updatedRestaurant) {
      console.error("Error updating restaurant:", updateErr);
      return NextResponse.json(
        { message: "Failed to update restaurant", error: updateErr?.message },
        { status: 500 }
      );
    }

    // Sync categories
    if (Array.isArray(category)) {
      await supabaseAdmin.from("restaurant_categories").delete().eq("restaurant_id", targetRestId);
      if (category.length > 0) {
        const catRows = category.map((catId: string) => ({
          restaurant_id: targetRestId,
          category_id: catId,
        }));
        await supabaseAdmin.from("restaurant_categories").insert(catRows);
      }
    }

    // Sync areas
    if (Array.isArray(area)) {
      await supabaseAdmin.from("restaurant_areas").delete().eq("restaurant_id", targetRestId);
      if (area.length > 0) {
        const areaRows = area.map((areaId: string) => ({
          restaurant_id: targetRestId,
          area_id: areaId,
        }));
        await supabaseAdmin.from("restaurant_areas").insert(areaRows);
      }
    }

    // Sync images
    if (Array.isArray(images)) {
      await supabaseAdmin.from("restaurant_images").delete().eq("restaurant_id", targetRestId);
      if (images.length > 0) {
        const imgRows = images.map((url: string, index: number) => ({
          restaurant_id: targetRestId,
          image_url: url,
          display_order: index + 1,
        }));
        await supabaseAdmin.from("restaurant_images").insert(imgRows);
      }
    }

    // Sync menu PDFs
    if (Array.isArray(menuPdfUrls)) {
      await supabaseAdmin.from("restaurant_menu_pdfs").delete().eq("restaurant_id", targetRestId);
      if (menuPdfUrls.length > 0) {
        const pdfRows = menuPdfUrls.map((url: string, index: number) => ({
          restaurant_id: targetRestId,
          pdf_url: url,
          display_order: index + 1,
        }));
        await supabaseAdmin.from("restaurant_menu_pdfs").insert(pdfRows);
      }
    }

    // Sync searchTags
    if (Array.isArray(searchTags)) {
      await supabaseAdmin.from("restaurant_tags").delete().eq("restaurant_id", targetRestId);
      if (searchTags.length > 0) {
        const tagRows = searchTags.map((tagId: string) => ({
          restaurant_id: targetRestId,
          tag_id: tagId,
        }));
        await supabaseAdmin.from("restaurant_tags").insert(tagRows);
      }
    }

    return NextResponse.json({
      message: "Restaurant updated successfully",
      restaurant: {
        ...updatedRestaurant,
        _id: updatedRestaurant.id,
      },
    });
  } catch (error: any) {
    console.error("Error updating restaurant:", error);
    return NextResponse.json(
      { message: "Failed to update restaurant", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Create subscription checkout session or verify subscription for restaurant
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken: { restaurantId?: string; userId?: string; role: string };
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const data = await request.json();
    const { action, restaurantId } = data;

    if (action === "create-subscription-checkout") {
      const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("id, name, email, stripe_customer_id")
        .eq("id", restaurantId)
        .maybeSingle();

      if (!restaurant) {
        return NextResponse.json(
          { message: "Restaurant not found" },
          { status: 404 }
        );
      }

      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_RESTURENT_1MONTH;
      if (!priceId) {
        return NextResponse.json(
          { message: "Price ID not configured" },
          { status: 500 }
        );
      }

      let customerId = restaurant.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: restaurant.email,
          name: restaurant.name,
          metadata: {
            restaurantId: restaurantId,
          },
        });
        customerId = customer.id;

        await supabaseAdmin
          .from("restaurants")
          .update({ stripe_customer_id: customerId })
          .eq("id", restaurantId);

        if (decodedToken.userId) {
          await supabaseAdmin
            .from("users")
            .update({ stripe_customer_id: customerId })
            .eq("id", decodedToken.userId);
        }
      } else if (decodedToken.userId) {
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("stripe_customer_id")
          .eq("id", decodedToken.userId)
          .maybeSingle();

        if (user && !user.stripe_customer_id) {
          await supabaseAdmin
            .from("users")
            .update({ stripe_customer_id: customerId })
            .eq("id", decodedToken.userId);
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        billing_address_collection: "required",
        success_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/dashboard/offers?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/dashboard/offers?subscription=cancelled`,
        metadata: {
          restaurantId,
          type: "restaurant_subscription",
        },
      });

      return NextResponse.json({ url: session.url });
    }

    if (action === "verify-subscription") {
      const { sessionId, restaurantId: reqRestaurantId } = data;

      if (!sessionId) {
        return NextResponse.json(
          { message: "Session ID required" },
          { status: 400 }
        );
      }

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        const restaurantIdToUpdate = session.metadata?.restaurantId || reqRestaurantId;

        if (!restaurantIdToUpdate) {
          return NextResponse.json(
            { message: "Restaurant ID not found" },
            { status: 400 }
          );
        }

        if (session.payment_status === "paid") {
          const updateData: any = {
            subscription_status: "active",
            stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_RESTURENT_1MONTH,
          };

          if (session.subscription) {
            updateData.subscription_id = session.subscription as string;
          }
          if (session.customer) {
            updateData.stripe_customer_id = session.customer as string;
          }

          const { data: restaurant, error: restUpdateErr } = await supabaseAdmin
            .from("restaurants")
            .update(updateData)
            .eq("id", restaurantIdToUpdate)
            .select()
            .single();

          if (restUpdateErr || !restaurant) {
            return NextResponse.json(
              { message: "Restaurant not found" },
              { status: 404 }
            );
          }

          if (decodedToken.userId) {
            const userUpdateData: any = {
              subscription_status: "active",
              stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_RESTURENT_1MONTH,
              has_subscribed_before: true,
            };

            if (session.subscription) {
              userUpdateData.subscription_id = session.subscription as string;
            }
            if (session.customer) {
              userUpdateData.stripe_customer_id = session.customer as string;
            }

            await supabaseAdmin
              .from("users")
              .update(userUpdateData)
              .eq("id", decodedToken.userId);
          }

          return NextResponse.json({
            success: true,
            message: "Subscription activated successfully",
            restaurant: {
              _id: restaurant.id,
              subscriptionStatus: restaurant.subscription_status,
              subscriptionId: restaurant.subscription_id,
              stripeCustomerId: restaurant.stripe_customer_id,
              stripePriceId: restaurant.stripe_price_id,
            },
          });
        }

        return NextResponse.json(
          {
            message: "Payment not completed",
            payment_status: session.payment_status,
          },
          { status: 400 }
        );
      } catch (error: any) {
        console.error("Error verifying subscription:", error);
        return NextResponse.json(
          { message: "Failed to verify subscription", error: error.message },
          { status: 500 }
        );
      }
    }

    if (action === "check-subscription") {
      const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("subscription_status")
        .eq("id", restaurantId)
        .maybeSingle();

      if (!restaurant) {
        return NextResponse.json(
          { message: "Restaurant not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        subscriptionStatus: restaurant.subscription_status || "inactive",
        hasActiveSubscription: restaurant.subscription_status === "active",
      });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in subscription checkout:", error);
    return NextResponse.json(
      { message: "Failed to process request", error: error.message },
      { status: 500 }
    );
  }
}
