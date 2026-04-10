import Restaurant from "@/models/Restaurant";

/** Match backfill script: lowercase, spaces → `-`, strip other non [a-z0-9-]. */
export function slugifyRestaurantName(name: string): string {
  if (typeof name !== "string") return "";
  let s = name.toLowerCase().trim();
  s = s.replace(/\s+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s;
}

/**
 * Picks a unused `slug` matching {@link slugifyRestaurantName}, with `-2`, `-3`, … on collision.
 */
export async function generateUniqueRestaurantSlug(
  name: string,
  excludeDocumentId?: string,
): Promise<string> {
  let base = slugifyRestaurantName(name);
  if (!base) base = "restaurant";

  let attempt = 0;
  for (;;) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const exists = await Restaurant.findOne({
      slug: candidate,
      ...(excludeDocumentId
        ? { _id: { $ne: excludeDocumentId } }
        : {}),
    })
      .select("_id")
      .lean();

    if (!exists) return candidate;
    attempt += 1;
  }
}
