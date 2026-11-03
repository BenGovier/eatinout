import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, isActive } = body;

    const { data: tag, error: fetchErr } = await supabaseAdmin
      .from("tags")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!tag) {
      return NextResponse.json(
        { success: false, message: "Tag not found" },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name?.trim()) {
      // Check duplicate name (excluding self)
      const { data: duplicate } = await supabaseAdmin
        .from("tags")
        .select("id")
        .ilike("name", name.trim())
        .neq("id", id)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "Tag name already exists" },
          { status: 409 }
        );
      }

      updatePayload.name = name.trim();

      // Regenerate slug
      const baseSlug =
        name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "tag";

      let finalSlug = baseSlug;
      let suffix = 2;
      while (true) {
        const { data: slugCheck } = await supabaseAdmin
          .from("tags")
          .select("id")
          .eq("slug", finalSlug)
          .neq("id", id)
          .maybeSingle();

        if (!slugCheck) break;
        finalSlug = `${baseSlug}-${suffix}`;
        suffix++;
      }
      updatePayload.slug = finalSlug;
    }

    if (typeof isActive === "boolean") {
      updatePayload.is_active = isActive;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("tags")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({
      success: true,
      data: {
        _id: updated.id,
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        isActive: updated.is_active,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (err: any) {
    console.error("[PUT /api/admin/new-tags/[id]]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: tag, error: fetchErr } = await supabaseAdmin
      .from("tags")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!tag) {
      return NextResponse.json(
        { success: false, message: "Tag not found" },
        { status: 404 }
      );
    }

    // Clean up associations first
    await supabaseAdmin.from("offer_tags").delete().eq("tag_id", id);
    await supabaseAdmin.from("restaurant_tags").delete().eq("tag_id", id);

    // Delete tag
    const { error: delErr } = await supabaseAdmin.from("tags").delete().eq("id", id);
    if (delErr) throw new Error(delErr.message);

    return NextResponse.json({
      success: true,
      message: "Tag deleted and removed from all offers",
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/new-tags/[id]]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}