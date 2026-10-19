import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tag IDs array is required" },
        { status: 400 }
      );
    }

    // Clean up associations first
    await supabaseAdmin.from("offer_tags").delete().in("tag_id", ids);
    await supabaseAdmin.from("restaurant_tags").delete().in("tag_id", ids);

    // Delete tags from tags table
    const { error: delErr, count } = await supabaseAdmin
      .from("tags")
      .delete({ count: "exact" })
      .in("id", ids);

    if (delErr) throw new Error(delErr.message);

    const deletedCount = count ?? ids.length;

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      message: `${deletedCount} tags deleted and removed from all offers`,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/new-tags/bulk-delete]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}