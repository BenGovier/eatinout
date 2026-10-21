import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    const offerList = await fetchAll((from, to) => {
      let q = supabaseAdmin
        .from("offers")
        .select("id, title, status, restaurant_id, is_deactivated, expiry_date, run_until_further, start_date, offer_tags(tag_id)")
        .order("status", { ascending: true })
        .order("title", { ascending: true })
        .range(from, to);

      if (restaurantId) {
        q = q.eq("restaurant_id", restaurantId);
      }
      return q;
    });
    const now = new Date();

    const mapped = offerList.map((o: any) => {
      let calculatedStatus = o.status;
      if (o.status === "inactive" || o.is_deactivated) {
        calculatedStatus = "inactive";
      } else if (o.status === "active") {
        if (!o.run_until_further && o.expiry_date && new Date(o.expiry_date) < now) {
          calculatedStatus = "expired";
        } else if (o.start_date && new Date(o.start_date) > now) {
          calculatedStatus = "inactive";
        } else {
          calculatedStatus = "active";
        }
      }

      const tags = (o.offer_tags || []).map((t: any) => t.tag_id).filter(Boolean);

      return {
        _id: o.id,
        id: o.id,
        title: o.title,
        restaurantId: o.restaurant_id,
        status: calculatedStatus,
        tags,
      };
    });

    return NextResponse.json({ success: true, data: mapped });
  } catch (err: any) {
    console.error("[GET /api/admin/new-tags/offers]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}