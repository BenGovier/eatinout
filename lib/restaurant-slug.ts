import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateRestaurantSlug } from "@/lib/utils";

/**
 * Generates an SEO-friendly slug (name-area or name-area_city).
 * Checks for collisions in Supabase and appends city if needed.
 */
export async function generateUniqueRestaurantSlug(
  name: string,
  areaName?: string,
  cityName?: string,
  excludeDocumentId?: string,
): Promise<string> {
  const baseSlug = generateRestaurantSlug(name, areaName, cityName, false);

  // Check if base slug exists in Supabase
  let query = supabaseAdmin.from("restaurants").select("id").eq("slug", baseSlug);
  if (excludeDocumentId) {
    query = query.neq("id", excludeDocumentId);
  }
  const { data: exists } = await query.maybeSingle();

  if (!exists) return baseSlug;

  // Collision detected! Use city if possible
  const fallbackSlug = generateRestaurantSlug(name, areaName, cityName, true);

  if (fallbackSlug !== baseSlug) {
    let fallbackQuery = supabaseAdmin.from("restaurants").select("id").eq("slug", fallbackSlug);
    if (excludeDocumentId) {
      fallbackQuery = fallbackQuery.neq("id", excludeDocumentId);
    }
    const { data: fallbackExists } = await fallbackQuery.maybeSingle();

    if (!fallbackExists) return fallbackSlug;
  }

  return baseSlug;
}
