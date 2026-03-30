import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants";

/** sessionStorage key for browser geolocation shared on the restaurants flow */
export const USER_LAT_LNG_SESSION_KEY = "userLatLng"

/** Fired on same-tab writes to / removals of `userLatLng` (sessionStorage has no same-tab storage event). */
export const USER_LOCATION_STORAGE_EVENT = "eatin:user-location-storage"

export function notifyUserLocationStorageChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(USER_LOCATION_STORAGE_EVENT))
}

/** Writes coordinates to session and notifies listeners (restaurants list, map, modals). */
export function persistUserLatLng(lat: number, lng: number): void {
  if (typeof window === "undefined") return
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  try {
    window.sessionStorage.setItem(
      USER_LAT_LNG_SESSION_KEY,
      JSON.stringify({ lat, lng }),
    )
  } catch {
    // ignore (private mode, quota, etc.)
  }
  notifyUserLocationStorageChanged()
}

export function clearUserLocationFromSessionStorage(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(USER_LAT_LNG_SESSION_KEY)
  } catch {
    // ignore (private mode, quota, etc.)
  }
  notifyUserLocationStorageChanged()
}

/** Parsed `{ lat, lng }` from session, or null if missing / invalid. */
export function getStoredUserLatLng(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(USER_LAT_LNG_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown }
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number")
      return null
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null
    return { lat: parsed.lat, lng: parsed.lng }
  } catch {
    return null
  }
}

/** True when coordinates match the app default map centre (no “real” user GPS for UI). */
export function isApproxDefaultMapCenter(lat: number, lng: number): boolean {
  const d = DEFAULT_MAP_CENTER_LAT_LNG
  const eps = 1e-4
  return (
    Math.abs(lat - d.lat) < eps && Math.abs(lng - d.lng) < eps
  )
}
