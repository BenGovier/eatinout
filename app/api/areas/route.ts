import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("areas")
      .select("id, name, hide_restaurant")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) throw new Error(error.message)

    const formattedAreas = (data || []).map((area: any) => ({
      _id: area.id,
      name: area.name,
      hideRestaurant: area.hide_restaurant || false,
    }))

    return NextResponse.json({
      success: true,
      areas: formattedAreas,
    })
  } catch (error: any) {
    console.error("Error fetching areas:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch areas",
        error: error.message,
      },
      { status: 500 }
    )
  }
}