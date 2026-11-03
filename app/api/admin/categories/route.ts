import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

// 24-char hex id, same shape as the migrated Mongo ids
const newId = () => randomBytes(12).toString("hex");

// Mongo serialized Dates as ISO (...000Z); keep the same format
const toIso = (v: any) => (v ? new Date(v).toISOString() : v);

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

// keeps `.in()` URLs short
function chunk<T>(arr: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Supabase returns max 1000 rows per request, so page through
async function fetchAll(build: (from: number, to: number) => PromiseLike<any>, maxRows = Infinity): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; out.length < maxRows; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out.length > maxRows ? out.slice(0, maxRows) : out;
}

const CATEGORY_COLUMNS = "id, name, is_active, image_url, priority, created_at";

/** head-only count helper */
async function countRows(table: string, apply?: (q: any) => any): Promise<number> {
  let q: any = supabaseAdmin.from(table).select("id", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

/** number of restaurants linked to one category */
async function countRestaurantsForCategory(categoryId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("restaurant_categories")
    .select("restaurant_id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if (error) throw new Error(error.message);
  return count || 0;
}

// GET categories with pagination and filtering
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    // const adminCheck = await verifyAdminToken(req)
    // if (!adminCheck.success) {
    //   return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    // }

    console.log("Connected to database for fetching categories");
    // Parse query parameters
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get('page') || '1', 10)

    // limit safeguard (prevent huge queries)
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      100
    )

    const isExport = searchParams.get('export') === 'true'
    const isDropdown = searchParams.get('dropdown') === 'true'

    const skip = isExport || isDropdown ? 0 : (page - 1) * limit

    // Dynamic filtering parameters
    const searchTerm = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || ''

    // Shared filter (prefix search + status)
    const applyFilters = (q: any) => {
      if (searchTerm) {
        q = q.ilike("name", `${escapeLike(searchTerm)}%`)
      }
      if (statusFilter && statusFilter !== 'all') {
        q = q.eq("is_active", statusFilter === 'active')
      }
      return q
    }

    // Count total categories
    const totalCategories = await countRows("categories", applyFilters)
    const totalPages = Math.ceil(totalCategories / limit)

    // Fetch categories
    const listQuery = () =>
      applyFilters(supabaseAdmin.from("categories").select(CATEGORY_COLUMNS))
        .order("priority", { ascending: true })
        .order("name", { ascending: true })
        .order("id", { ascending: true })

    let categories: any[]
    if (isExport || isDropdown) {
      categories = await fetchAll((from, to) => listQuery().range(from, to), 10000)
    } else {
      const { data, error } = await listQuery().range(skip, skip + limit - 1)
      if (error) throw new Error(error.message)
      categories = data || []
    }

    // Extract category IDs
    const categoryIds: string[] = categories.map((category: any) => category.id)

    // restaurant count per category (a restaurant counts once per category)
    const countMap = new Map<string, number>()
    if (categoryIds.length > 0) {
      const parts = await Promise.all(
        chunk(categoryIds).map((ids) =>
          fetchAll((from, to) =>
            supabaseAdmin
              .from("restaurant_categories")
              .select("restaurant_id, category_id")
              .in("category_id", ids)
              .order("category_id", { ascending: true })
              .order("restaurant_id", { ascending: true })
              .range(from, to)
          )
        )
      )
      parts.flat().forEach((row: any) => {
        countMap.set(row.category_id, (countMap.get(row.category_id) || 0) + 1)
      })
    }

    // Format response (UNCHANGED STRUCTURE)
    const categoryStats = categories.map((category: any) => ({
      _id: category.id,
      name: category.name,
      isActive: category.is_active,
      image: category.image_url ?? undefined,
      priority: category.priority ?? 999,
      restaurantCount: countMap.get(category.id) || 0,
      createdAt: toIso(category.created_at),
    }))

    // Parallel execution
    const [dynamicFilters, globalStats] = await Promise.all([
      getDynamicFilterOptions(),
      getGlobalCategoryStats()
    ])

    return NextResponse.json({
      success: true,
      categories: categoryStats,
      pagination: isDropdown
        ? undefined
        : {
            total: totalCategories,
            page,
            limit,
            pages: totalPages
          },
      filters: dynamicFilters,
      stats: globalStats
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get dynamic filter options
async function getDynamicFilterOptions() {
  const activeStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  return {
    statuses: activeStatuses
  }
}

// Helper function to get global category statistics
async function getGlobalCategoryStats() {
  const [totalCategories, activeCategories, inactiveCategories, totalRestaurants] = await Promise.all([
    countRows("categories"),
    countRows("categories", (q) => q.eq("is_active", true)),
    countRows("categories", (q) => q.eq("is_active", false)),
    countRows("restaurants", (q) => q.eq("status", "approved")),
  ])

  return {
    totalCategories,
    activeCategories,
    inactiveCategories,
    totalRestaurants
  }
}

// POST new category
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    // if (!adminCheck.success) {
    //   return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    // }

    const body = await req.json();
    const { name, image, priority } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Category name is required" },
        { status: 400 }
      );
    }

    // Check if category already exists (case insensitive, exact match)
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .ilike("name", escapeLike(name))
      .limit(1);
    if (existingError) throw new Error(existingError.message);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "Category already exists" },
        { status: 400 }
      );
    }

    const { data: category, error: insertError } = await supabaseAdmin
      .from("categories")
      .insert({
        id: newId(),
        name,
        is_active: true,
        image_url: image || null,
        priority: priority !== undefined ? Number(priority) : 999,
      })
      .select(CATEGORY_COLUMNS)
      .single();
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({
      success: true,
      category: {
        _id: category.id,
        name: category.name,
        isActive: category.is_active,
        image: category.image_url ?? undefined,
        priority: category.priority ?? 999,
        restaurantCount: 0,
        createdAt: toIso(category.created_at)
      }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// PUT update category
export async function PUT(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const body = await req.json();
    const { name, isActive, image, priority } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Category name is required" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Category ID is required" },
        { status: 400 }
      );
    }

    // Check if category exists
    const { data: existingCategory, error: existingError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // Check if name is already taken by another category
    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("name", name)
      .neq("id", id)
      .limit(1);
    if (duplicateError) throw new Error(duplicateError.message);
    if (duplicate && duplicate.length > 0) {
      return NextResponse.json(
        { success: false, message: "Category name already exists" },
        { status: 400 }
      );
    }

    const updateData: any = { name };
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }
    if (image !== undefined) {
      updateData.image_url = image || null;
    }
    if (priority !== undefined) {
      updateData.priority = Number(priority);
    }

    const { data: updatedCategory, error: updateError } = await supabaseAdmin
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select(CATEGORY_COLUMNS)
      .single();
    if (updateError) throw new Error(updateError.message);

    // Calculate restaurant count for this category
    const restaurantCount = await countRestaurantsForCategory(updatedCategory.id);

    return NextResponse.json({
      success: true,
      category: {
        _id: updatedCategory.id,
        name: updatedCategory.name,
        isActive: updatedCategory.is_active,
        image: updatedCategory.image_url ?? undefined,
        priority: updatedCategory.priority ?? 999,
        restaurantCount: restaurantCount
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// DELETE category
export async function DELETE(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Category ID is required" },
        { status: 400 }
      );
    }

    // Check if category exists
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();
    if (categoryError) throw new Error(categoryError.message);
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category is being used by any restaurants
    const restaurantsUsingCategory = await countRestaurantsForCategory(id);

    if (restaurantsUsingCategory > 0) {
      const restaurantText = restaurantsUsingCategory === 1 ? "restaurant" : "restaurants";
      return NextResponse.json(
        {
          success: false,
          message: `Category "${category.name}", cannot be deleted because it is currently assigned to ${restaurantsUsingCategory} ${restaurantText}. To proceed with deletion, please remove or reassign this category from all associated ${restaurantText}.`
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("id", id);
    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}