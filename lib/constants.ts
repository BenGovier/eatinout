/**
 * Default map center when the user has not shared location (Blackpool area).
 * Keep in sync across map UI, distance search origin, and API fallbacks.
 */
export const DEFAULT_MAP_CENTER_LAT_LNG: { lat: number; lng: number } = {
  lat: 53.8189,
  lng: -3.05446,
};

export const DEFAULT_MAP_LOCATION_LABEL = "Blackpool" as const;

/** Max-distance filter values (miles) for restaurant search — keep API + UI in sync */
export const RESTAURANT_DISTANCE_OPTIONS_MILES = [1, 3, 5, 10, 25] as const;

/** Map/API: no radius — return all restaurants (no `$geoWithin`). */
export const RESTAURANT_DISTANCE_FILTER_ALL = "all" as const;

export type RestaurantDistanceFilterMiles =
  (typeof RESTAURANT_DISTANCE_OPTIONS_MILES)[number];

export type RestaurantDistanceFilterSelection =
  | RestaurantDistanceFilterMiles
  | typeof RESTAURANT_DISTANCE_FILTER_ALL;

export const RESTAURANT_DISTANCE_OPTIONS_MILES_SET: ReadonlySet<number> =
  new Set<number>(RESTAURANT_DISTANCE_OPTIONS_MILES);

export function isRestaurantDistanceFilterMiles(
  value: number,
): value is RestaurantDistanceFilterMiles {
  return RESTAURANT_DISTANCE_OPTIONS_MILES_SET.has(value);
}

export function isRestaurantDistanceFilterSelection(
  value: unknown,
): value is RestaurantDistanceFilterSelection {
  return (
    value === RESTAURANT_DISTANCE_FILTER_ALL ||
    (typeof value === "number" && isRestaurantDistanceFilterMiles(value))
  );
}

/** Default radius when callers omit `maxDistanceMiles` (browse pages, etc.). */
export const DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES: RestaurantDistanceFilterMiles = 25;

/** Default map distance control: no geo filtering. */
export const DEFAULT_MAP_DISTANCE_FILTER_SELECTION: RestaurantDistanceFilterSelection =
  RESTAURANT_DISTANCE_FILTER_ALL;
