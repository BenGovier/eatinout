// app/api/admin/vouchers/stats/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

// replacement for Voucher.countDocuments(filter)
async function countVouchers(apply?: (q: any) => any): Promise<number> {
  let q: any = supabaseAdmin
    .from("vouchers")
    .select("id", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

// replacement for { $expr: { $gte: ["$currentUses", "$maxUses"] } } (column-to-column compare, so counted here)
async function countFullyUsed(): Promise<number> {
  let n = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .select("current_uses, max_uses")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    n += (data || []).filter((v: any) => v.current_uses >= v.max_uses).length;
    if (!data || data.length < 1000) break;
  }
  return n;
}

export async function GET(req: Request) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { message: adminCheck.message },
        { status: 401 }
      );
    }

    const today = new Date();
    
    // Get all counts in parallel
    const [
      total,
      active,
      inactive,
      expired,
      used,
      fullyUsed
    ] = await Promise.all([
      countVouchers(),
      countVouchers((q) => q.eq("is_active", true)),
      countVouchers((q) => q.eq("is_active", false)),
      countVouchers((q) => q.lt("expiry_date", today.toISOString())),
      countVouchers((q) => q.gt("current_uses", 0)),
      countFullyUsed()
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        expired,
        used,
        fullyUsed
      }
    });
  } catch (error: any) {
    console.error("Error fetching voucher stats:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}