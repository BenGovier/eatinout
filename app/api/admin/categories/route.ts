import { NextRequest, NextResponse } from "next/server";
import { Category } from "@/models/Categories";
import Restaurant from "@/models/Restaurant";
import connectToDatabase from "@/lib/mongodb";
import { verifyAdminToken } from "@/lib/auth-admin";

// GET categories with pagination and filtering
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    // const adminCheck = await verifyAdminToken(req)
    // if (!adminCheck.success) {
    //   return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    // }

    await connectToDatabase();
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

    // Build dynamic query
    const query: any = {}

    // Prefix regex (index optimized search)
    if (searchTerm) {
      query.name = { $regex: `^${searchTerm}`, $options: 'i' }
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      query.isActive = statusFilter === 'active'
    }

    // Count total categories
    const totalCategories = await Category.countDocuments(query)
    const totalPages = Math.ceil(totalCategories / limit)

    // Fetch categories
    const categories = await Category.find(query)
      .select("name isActive image priority createdAt") // payload optimization
      .sort({ priority: 1, name: 1 })
      .skip(isExport || isDropdown ? 0 : skip)
      .limit(isExport || isDropdown ? 10000 : limit)
      .lean()

    // Extract category IDs
    const categoryIds = categories.map((category: any) => category._id)

    /**
     * Aggregation Optimization:
     * - removed heavy $or
     * - skip aggregation if no categories
     */
    let restaurantCounts: any[] = []

    if (categoryIds.length > 0) {
      restaurantCounts = await Restaurant.aggregate([
        {
          $match: {
            category: { $in: categoryIds }
          }
        },
        {
          $project: {
            categoryArray: {
              $cond: {
                if: { $isArray: "$category" },
                then: "$category",
                else: ["$category"]
              }
            }
          }
        },
        {
          $unwind: "$categoryArray"
        },
        {
          $match: {
            categoryArray: { $in: categoryIds }
          }
        },
        {
          $group: {
            _id: "$categoryArray",
            count: { $sum: 1 }
          }
        }
      ])
    }

    // Map for quick lookup
    const countMap = new Map<string, number>()
    restaurantCounts.forEach((item: any) => {
      countMap.set(item._id.toString(), item.count)
    })

    // Format response (UNCHANGED STRUCTURE)
    const categoryStats = categories.map((category: any) => ({
      _id: category._id,
      name: category.name,
      isActive: category.isActive,
      image: category.image,
      priority: category.priority ?? 999,
      restaurantCount: countMap.get(category._id.toString()) || 0,
      createdAt: category.createdAt,
    }))

    // Parallel execution (already optimized)
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
  // Optimize: Run all count queries in parallel instead of sequentially
  const [totalCategories, activeCategories, inactiveCategories, totalRestaurants] = await Promise.all([
    Category.countDocuments(),
    Category.countDocuments({ isActive: true }),
    Category.countDocuments({ isActive: false }),
    Restaurant.countDocuments({ status: 'approved' })
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

    await connectToDatabase();

    // Check if category already exists (case insensitive)
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, message: "Category already exists" },
        { status: 400 }
      );
    }

    const category = await Category.create({
      name,
      isActive: true,
      image: image || undefined,
      priority: priority !== undefined ? Number(priority) : 999,
    });

    return NextResponse.json({ 
      success: true, 
      category: {
        _id: category._id,
        name: category.name,
        isActive: category.isActive,
        image: category.image,
        priority: category.priority ?? 999,
        restaurantCount: 0,
        createdAt: category.createdAt
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

    await connectToDatabase();

    // Check if category exists
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // Check if name is already taken by another category
    const duplicateCategory = await Category.findOne({
      name,
      _id: { $ne: id },
    });
    if (duplicateCategory) {
      return NextResponse.json(
        { success: false, message: "Category name already exists" },
        { status: 400 }
      );
    }

    const updateData: any = { name, isActive };
    if (image !== undefined) {
      updateData.image = image || null;
    }
    if (priority !== undefined) {
      updateData.priority = Number(priority);
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Calculate restaurant count for this category - handle both array and single string formats
    const categoryId = updatedCategory._id;
    const restaurantCountResult = await Restaurant.aggregate([
      {
        $match: {
          $or: [
            { category: { $in: [categoryId] } },
            { category: categoryId }
          ]
        }
      },
      {
        $project: {
          category: 1,
          categoryArray: {
            $cond: {
              if: { $isArray: "$category" },
              then: "$category",
              else: ["$category"]
            }
          }
        }
      },
      {
        $unwind: "$categoryArray"
      },
      {
        $match: {
          categoryArray: categoryId
        }
      },
      {
        $count: "total"
      }
    ]);

    const restaurantCount = restaurantCountResult.length > 0 ? restaurantCountResult[0].total : 0;

    return NextResponse.json({ 
      success: true, 
      category: {
        _id: updatedCategory._id,
        name: updatedCategory.name,
        isActive: updatedCategory.isActive,
        image: updatedCategory.image,
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

    await connectToDatabase();

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category is being used by any restaurants
    const restaurantsUsingCategory = await Restaurant.countDocuments({ 
      $or: [
        { category: id }
      ]
    });
    
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

    await Category.findByIdAndDelete(id);

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
