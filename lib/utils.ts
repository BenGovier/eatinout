import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @param uniqueId - Optional unique identifier (e.g., MongoDB ObjectId) to append for uniqueness
 * @returns A URL-friendly slug
 */
export function generateSlug(text: string, uniqueId?: string): string {
  if (!text) return "";
  
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  
  // Append short unique identifier if provided to prevent collisions
  if (uniqueId) {
    // Use last 6 characters of the ID for uniqueness (MongoDB ObjectIds are 24 chars)
    const shortId = uniqueId.slice(-6).toLowerCase();
    slug = `${slug}-${shortId}`;
  }
  
  return slug;
}

/**
 * Format a string for the new slug format (spaces to _, lowercase, no special chars)
 */
export function formatSlugPart(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s-]+/g, "_") // Replace spaces and hyphens with underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * Generate a restaurant slug: formatted_name-formatted_area (fallback to city)
 */
export function generateRestaurantSlug(name: string, areaName?: string, cityName?: string, includeCityForCollision = false): string {
  const namePart = formatSlugPart(name);
  
  let locStr = areaName || cityName || "";
  if (includeCityForCollision && areaName && cityName && areaName.toLowerCase() !== cityName.toLowerCase()) {
    locStr = `${areaName}_${cityName}`;
  }
  
  const locPart = formatSlugPart(locStr);
  
  if (!locPart) return namePart;
  return `${namePart}-${locPart}`;
}