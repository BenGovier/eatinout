import Restaurant from "@/models/Restaurant";
import { formatSlugPart, generateRestaurantSlug } from "@/lib/utils";

/**
 * Generates an SEO-friendly slug (name-area or name-area_city).
 * Checks for collisions and appends city if needed.
 */
export async function generateUniqueRestaurantSlug(
  name: string,
  areaName?: string,
  cityName?: string,
  excludeDocumentId?: string,
): Promise<string> {
  const baseSlug = generateRestaurantSlug(name, areaName, cityName, false);
  
  // Check if base slug exists
  const exists = await Restaurant.findOne({
    slug: baseSlug,
    ...(excludeDocumentId ? { _id: { $ne: excludeDocumentId } } : {}),
  }).select("_id").lean();

  if (!exists) return baseSlug;

  // Collision detected! Use city if possible
  const fallbackSlug = generateRestaurantSlug(name, areaName, cityName, true);
  
  // If fallback is the same as base (e.g. area and city are identical), or if fallback also exists
  if (fallbackSlug !== baseSlug) {
    const fallbackExists = await Restaurant.findOne({
      slug: fallbackSlug,
      ...(excludeDocumentId ? { _id: { $ne: excludeDocumentId } } : {}),
    }).select("_id").lean();
    
    if (!fallbackExists) return fallbackSlug;
  }
  
  // Extreme edge case: everything conflicts. We don't use numbers as per client instructions.
  // Returning the base slug might cause a duplicate key error in MongoDB since slug is unique.
  // But we also block duplicate names on registration, so this shouldn't happen.
  return baseSlug;
}
