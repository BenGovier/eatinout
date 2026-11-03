import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

// Supabase row -> same shape the Mongoose lead had (so the code below stays unchanged)
function toLegacyLead(r: any) {
  const iso = (v: any) => (v ? new Date(v).toISOString() : v);
  return {
    _id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    mobile: r.mobile,
    converted: r.is_converted,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message || "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Only get unconverted leads
    const query = { is_converted: false };

    const [leadsResult, countResult] = await Promise.all([
      supabaseAdmin
        .from("leads")
        .select("*")
        .match(query)
        .order("created_at", { ascending: false })
        .range(skip, skip + limit - 1),
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .match(query),
    ]);
    if (leadsResult.error) throw new Error(leadsResult.error.message);
    if (countResult.error) throw new Error(countResult.error.message);
    const leads = (leadsResult.data || []).map(toLegacyLead);
    const total = countResult.count || 0;

    return NextResponse.json({
      success: true,
      leads: leads.map((lead: any) => ({
        ...lead,
        _id: lead._id.toString(),
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalUnconvertedLeads: total,
      }
    });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch leads", error: error.message },
      { status: 500 }
    );
  }
}