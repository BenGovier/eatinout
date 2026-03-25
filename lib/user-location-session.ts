/** sessionStorage key for browser geolocation shared on the restaurants flow */
export const USER_LAT_LNG_SESSION_KEY = "userLatLng"

/** Fired on same-tab writes to / removals of `userLatLng` (sessionStorage has no same-tab storage event). */
export const USER_LOCATION_STORAGE_EVENT = "eatin:user-location-storage"

export function notifyUserLocationStorageChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(USER_LOCATION_STORAGE_EVENT))
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
