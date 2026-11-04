/**
 * Common helper for resolving Supabase Storage media URLs.
 * Handles:
 * 1. Filenames stored in DB (e.g. "IMG_5053_1750084440737.webp") -> returns full public URL
 * 2. Full URLs (http:// or https://) -> returns as-is
 * 3. Null / undefined / empty -> returns empty string
 */

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eyxmajobsbqyhqyeukce.supabase.co"
).replace(/\/+$/, "");

const STORAGE_BUCKET = (
  process.env.SUPABASE_STORAGE_BUCKET || "eatinout-staging-storage"
).trim();

export const SUPABASE_STORAGE_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;

export function getStorageUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return "";
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return "";

  // Already a full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Relative path or file name
  const cleanPath = trimmed.replace(/^\/+/, "");
  return `${SUPABASE_STORAGE_BASE_URL}${cleanPath}`;
}

export function getStorageUrls(pathsOrUrls: (string | null | undefined)[] | null | undefined): string[] {
  if (!Array.isArray(pathsOrUrls)) return [];
  return pathsOrUrls.map(getStorageUrl).filter(Boolean);
}

/**
 * Extracts the storage file name / relative path from a full URL or relative path.
 * Used when saving to DB or deleting from bucket.
 */
export function getStorageFileName(urlOrPath: string | null | undefined): string {
  if (!urlOrPath) return "";
  const trimmed = urlOrPath.trim();
  if (!trimmed) return "";

  // If it's a Supabase public storage URL
  if (trimmed.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`)) {
    return trimmed.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`)[1].split("?")[0];
  }

  // If it's an Azure URL or general URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parts = trimmed.split("/");
    return parts[parts.length - 1].split("?")[0];
  }

  return trimmed.replace(/^\/+/, "");
}

