// lib/safe-return-url.ts
export const DEFAULT_FREE_RETURN_URL = "/restaurants#big-brands";

const PLACEHOLDER_ORIGIN = "https://eatinout.invalid";

/** Returns an internal path, or the fallback for anything external or malformed. */
export function getSafeReturnUrl(value: unknown, fallback: string = DEFAULT_FREE_RETURN_URL): string {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  // Backslashes and control characters can be normalised by browsers into
  // protocol-relative or scheme URLs.
  if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return fallback;

  try {
    const url = new URL(candidate, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
