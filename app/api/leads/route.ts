import { type NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    
    const requestBody = await req.json();
    const { firstName, lastName, email, mobile } = requestBody;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Emails were stored lowercase by the old Lead model (lowercase: true)
    const normalizedEmail = String(email).toLowerCase();

    // Upsert lead: if it exists by email, update it. If not, create it.
    // If it's already converted, we don't need to revert it back to false, 
    // but typically a user who converted wouldn't hit this, or if they did, they are re-signing up.
    // We'll let it just update the fields.
    const { data: existingLead, error: existingLeadError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingLeadError) throw new Error(existingLeadError.message);

    const leadFields = {
      first_name: firstName,
      last_name: lastName,
      mobile: mobile || null,
    };
    const { data: leadRow, error: leadError } = existingLead
      ? await supabaseAdmin
          .from("leads")
          .update(leadFields)
          .eq("id", existingLead.id)
          .select("id, first_name, last_name, email, mobile, is_converted, created_at, updated_at")
          .single()
      : await supabaseAdmin
          .from("leads")
          .insert({
            // 24-char hex id, same format as the migrated MongoDB ObjectId ids
            id: randomBytes(12).toString("hex"),
            email: normalizedEmail,
            ...leadFields,
          })
          .select("id, first_name, last_name, email, mobile, is_converted, created_at, updated_at")
          .single();
    if (leadError) throw new Error(leadError.message);
    const lead = {
      _id: leadRow.id,
      firstName: leadRow.first_name,
      lastName: leadRow.last_name,
      email: leadRow.email,
      mobile: leadRow.mobile,
      converted: leadRow.is_converted,
      createdAt: leadRow.created_at,
      updatedAt: leadRow.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: "Lead captured successfully",
      lead
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error capturing lead:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to capture lead",
        error: error.message,
      },
      { status: 500 }
    );
  }
}