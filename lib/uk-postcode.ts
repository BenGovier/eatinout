/** UK outward + inward postcode pattern (same idea as scripts/autofill-restaurant-postcodes.mjs). */

const UK_POSTCODE_REGEX = /\b([A-Z]{1,2}\d[A-Z\d]?)\s?(\d[A-Z]{2})\b/i;
const VALID_UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}$/i;

/**
 * Returns normalized postcode like `SW1A 1AA`, or null if not a valid UK postcode string.
 */
export function normalizeUkPostcode(value: string): string | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(UK_POSTCODE_REGEX);
  if (!match) return null;

  const outward = match[1].toUpperCase();
  const inward = match[2].toUpperCase();
  const normalized = `${outward} ${inward}`;
  return VALID_UK_POSTCODE_REGEX.test(normalized) ? normalized : null;
}
