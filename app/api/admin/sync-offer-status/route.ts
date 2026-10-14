// api/admin/sync-offer-status/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

// Supabase returns max 1000 rows per request, so fetch all matching ids page by page
async function fetchAllOfferIds(buildQuery: () => any): Promise<string[]> {
  const ids: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery()
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;

    ids.push(...(data || []).map((o: any) => o.id));

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return ids;
}

// Update in chunks so the request URL (.in filter) never gets too long
async function updateOfferStatus(ids: string[], status: string) {
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin
      .from("offers")
      .update({ status })
      .in("id", chunk);
    if (error) throw error;
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminToken(req);
  if (!adminCheck.success) {
    return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Expire active offers whose expiryDate has passed
  const toExpire = await fetchAllOfferIds(() =>
    supabaseAdmin
      .from("offers")
      .select("id")
      .eq("status", "active")
      .lt("expiry_date", nowIso)
      .eq("run_until_further", false)
  );

  // Activate inactive offers whose startDate has passed
  const toActivate = await fetchAllOfferIds(() =>
    supabaseAdmin
      .from("offers")
      .select("id")
      .eq("status", "inactive")
      .lte("start_date", nowIso)
      .eq("is_deactivated", false)
      .or(`expiry_date.gt.${nowIso},expiry_date.is.null,run_until_further.eq.true`)
  );

  if (toExpire.length > 0) {
    await updateOfferStatus(toExpire, "expired");
  }

  if (toActivate.length > 0) {
    await updateOfferStatus(toActivate, "active");
  }

  return NextResponse.json({
    success: true,
    updated: toExpire.length + toActivate.length,
    expired: toExpire.length,
    activated: toActivate.length,
  });
}