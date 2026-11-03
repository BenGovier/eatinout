import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

const newId = () => randomBytes(12).toString("hex");

// Helpers
function unauthorized(msg = "Unauthorized") {
  return NextResponse.json({ success: false, message: msg }, { status: 401 });
}
function badRequest(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 400 });
}
function notFound(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 404 });
}
function conflict(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 409 });
}

async function fetchAll(build: (from: number, to: number) => PromiseLike<any>): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// ───────────────────────────────────────────────
// GET    /api/admin/tags     ← list all tags
// ───────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    // 1. Fetch all tags sorted by name
    const { data: tags, error: tagsErr } = await supabaseAdmin
      .from("tags")
      .select("id, name, slug, is_active, created_at, updated_at")
      .order("name", { ascending: true });

    if (tagsErr) throw new Error(tagsErr.message);

    if (!tags || tags.length === 0) {
      return NextResponse.json({ success: true, tags: [] });
    }

    // 2. Count non-hidden restaurants for each tag via active offers or restaurant_tags
    // In original code, it looked up active offers in non-hidden restaurants using this tag
    const offerTags = await fetchAll((from, to) =>
      supabaseAdmin
        .from("offer_tags")
        .select("tag_id, offers!inner(restaurant_id, status, restaurants!inner(id, is_hidden))")
        .eq("offers.status", "active")
        .eq("offers.restaurants.is_hidden", false)
        .range(from, to)
    );

    // Group unique restaurantIds per tag
    const tagRestaurantsMap = new Map<string, Set<string>>();
    for (const row of offerTags || []) {
      const tagId = row.tag_id;
      const rId = (row as any).offers?.restaurant_id;
      if (tagId && rId) {
        if (!tagRestaurantsMap.has(tagId)) {
          tagRestaurantsMap.set(tagId, new Set());
        }
        tagRestaurantsMap.get(tagId)!.add(rId);
      }
    }

    const formattedTags = tags.map((t) => {
      const count = tagRestaurantsMap.get(t.id)?.size || 0;
      return {
        _id: t.id,
        id: t.id,
        name: t.name,
        slug: t.slug,
        isActive: t.is_active,
        restaurantCount: count,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      tags: formattedTags,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/tags]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────
// POST   /api/admin/tags     ← create tag + optional restaurants
// ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      slug,
      isActive = true,
      restaurantIds = [],
      addRestaurants = [],
    } = body;

    const finalRestaurantIds: string[] = addRestaurants.length
      ? addRestaurants
      : restaurantIds;

    if (!name?.trim()) {
      return badRequest("Name is required");
    }

    // Check duplicate name
    const { data: existingName } = await supabaseAdmin
      .from("tags")
      .select("id")
      .ilike("name", name.trim())
      .maybeSingle();

    if (existingName) {
      return conflict("Tag with this name already exists");
    }

    const baseSlug =
      slug?.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      "tag";

    let finalSlug = baseSlug;
    let suffix = 2;
    while (true) {
      const { data: slugMatch } = await supabaseAdmin
        .from("tags")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (!slugMatch) break;
      finalSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const tagId = newId();
    const { data: createdTag, error: createErr } = await supabaseAdmin
      .from("tags")
      .insert({
        id: tagId,
        name: name.trim(),
        slug: finalSlug,
        is_active: isActive,
      })
      .select()
      .single();

    if (createErr) throw new Error(createErr.message);

    let affectedRestaurants = 0;
    if (finalRestaurantIds.length > 0) {
      // Filter approved restaurants
      const { data: approvedRests } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .in("id", finalRestaurantIds)
        .eq("status", "approved");

      if (approvedRests && approvedRests.length > 0) {
        const rows = approvedRests.map((r) => ({
          restaurant_id: r.id,
          tag_id: tagId,
        }));
        await supabaseAdmin.from("restaurant_tags").insert(rows);
        affectedRestaurants = rows.length;
      }
    }

    return NextResponse.json(
      {
        success: true,
        tag: {
          _id: createdTag.id,
          id: createdTag.id,
          name: createdTag.name,
          slug: createdTag.slug,
          isActive: createdTag.is_active,
          restaurantCount: affectedRestaurants,
          createdAt: createdTag.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/tags]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────
// PUT    /api/admin/tags?id=xxx   ← update tag
// ───────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("Tag ID is required");

    const body: {
      name?: string;
      slug?: string;
      isActive?: boolean;
      addRestaurants?: string[];
      removeRestaurants?: string[];
    } = await req.json();

    // Check tag exists
    const { data: tag, error: fetchErr } = await supabaseAdmin
      .from("tags")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!tag) return notFound("Tag not found");

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name?.trim()) {
      // Check duplicate name
      const { data: dupName } = await supabaseAdmin
        .from("tags")
        .select("id")
        .ilike("name", body.name.trim())
        .neq("id", id)
        .maybeSingle();

      if (dupName) return conflict("Tag name already taken");
      updatePayload.name = body.name.trim();
    }

    if (body.slug?.trim()) {
      const { data: dupSlug } = await supabaseAdmin
        .from("tags")
        .select("id")
        .eq("slug", body.slug.trim())
        .neq("id", id)
        .maybeSingle();

      if (dupSlug) return conflict("Slug already taken");
      updatePayload.slug = body.slug.trim();
    }

    if ("isActive" in body) {
      updatePayload.is_active = !!body.isActive;
    }

    if (Object.keys(updatePayload).length > 1) {
      const { error: updateErr } = await supabaseAdmin
        .from("tags")
        .update(updatePayload)
        .eq("id", id);
      if (updateErr) throw new Error(updateErr.message);
    }

    // Add restaurants
    if (body.addRestaurants?.length) {
      const { data: approvedRests } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .in("id", body.addRestaurants)
        .eq("status", "approved");

      if (approvedRests?.length) {
        const rows = approvedRests.map((r) => ({
          restaurant_id: r.id,
          tag_id: id,
        }));
        await supabaseAdmin
          .from("restaurant_tags")
          .upsert(rows, { onConflict: "restaurant_id, tag_id", ignoreDuplicates: true });
      }
    }

    // Remove restaurants
    if (body.removeRestaurants?.length) {
      await supabaseAdmin
        .from("restaurant_tags")
        .delete()
        .eq("tag_id", id)
        .in("restaurant_id", body.removeRestaurants);
    }

    // Get updated tag & restaurant count
    const { data: updatedTag } = await supabaseAdmin
      .from("tags")
      .select("*")
      .eq("id", id)
      .single();

    const { count: restaurantCount } = await supabaseAdmin
      .from("restaurant_tags")
      .select("restaurant_id", { count: "exact", head: true })
      .eq("tag_id", id);

    return NextResponse.json({
      success: true,
      tag: {
        _id: updatedTag.id,
        id: updatedTag.id,
        name: updatedTag.name,
        slug: updatedTag.slug,
        isActive: updatedTag.is_active,
        restaurantCount: restaurantCount || 0,
      },
      message: "Tag updated successfully",
    });
  } catch (err: any) {
    console.error("[PUT /api/admin/tags]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────
// DELETE /api/admin/tags?id=xxx
// ───────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) return unauthorized();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("Tag ID required");

    const { data: tag } = await supabaseAdmin
      .from("tags")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!tag) return notFound("Tag not found");

    const { count: linkedRestaurants } = await supabaseAdmin
      .from("restaurant_tags")
      .select("restaurant_id", { count: "exact", head: true })
      .eq("tag_id", id);

    if (linkedRestaurants && linkedRestaurants > 0) {
      return conflict("Tag is linked to restaurants and cannot be deleted");
    }

    // Clean up offer_tags and restaurant_tags, then delete tag
    await supabaseAdmin.from("offer_tags").delete().eq("tag_id", id);
    await supabaseAdmin.from("restaurant_tags").delete().eq("tag_id", id);
    const { error: delErr } = await supabaseAdmin.from("tags").delete().eq("id", id);
    if (delErr) throw new Error(delErr.message);

    return NextResponse.json({
      success: true,
      message: "Tag deleted and removed from all restaurants",
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/tags]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}