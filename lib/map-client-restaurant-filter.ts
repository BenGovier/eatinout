import {
  RESTAURANT_DISTANCE_FILTER_ALL,
  type RestaurantDistanceFilterSelection,
} from "@/lib/constants";
import {
  parseMealTimeRange,
  parseValidHours,
  timeRangesOverlap,
} from "@/lib/restaurant-offer-time-filters";

const EARTH_RADIUS_MILES = 3958.8;

function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/** Normalize offer validDays the same way as the API day filter. */
function normalizeValidDaysFromRestaurant(validDays: unknown): string[] {
  if (!Array.isArray(validDays) || validDays.length === 0) return [];

  return validDays
    .filter(Boolean)
    .flatMap((dayStr: string | string[]) => {
      if (Array.isArray(dayStr)) {
        return dayStr.flatMap((d) => d.split(","));
      }
      return String(dayStr).split(",");
    })
    .map((d: string) => d.trim().toLowerCase());
}

type MapClientFilterRestaurant = {
  id: string;
  name: string;
  city?: string;
  zipCode?: string;
  lat?: number | null;
  lng?: number | null;
  dineIn?: boolean;
  dineOut?: boolean;
  categoryIds?: string[];
  validDays?: unknown;
  offers?: Array<{
    validHours?: string;
  }>;
};

export type MapClientFilterParams = {
  search: string;
  categoryId: string;
  dineIn: boolean;
  dineOut: boolean;
  days: string;
  mealTimes: string;
  maxDistanceMiles: RestaurantDistanceFilterSelection;
  userLat: number;
  userLng: number;
};

/**
 * Apply the same filter dimensions as `/api/restaurants/all` (approximate search).
 * Intended for stale/previous fetch data while a new request is in flight.
 */
export function applyMapClientRestaurantFilters(
  restaurants: MapClientFilterRestaurant[],
  f: MapClientFilterParams,
): MapClientFilterRestaurant[] {
  let out = restaurants.filter((r) => (r.offers?.length ?? 0) > 0);

  const q = f.search.trim().toLowerCase();
  if (q) {
    out = out.filter((r) => {
      const name = r.name?.toLowerCase() ?? "";
      const city = r.city?.toLowerCase() ?? "";
      const zip = r.zipCode?.toLowerCase() ?? "";
      return name.includes(q) || city.includes(q) || zip.includes(q);
    });
  }

  const cuisineIds = f.categoryId
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (cuisineIds.length > 0) {
    out = out.filter((r) => {
      const cats = (r.categoryIds ?? []).map(String);
      return cuisineIds.some((id) => cats.includes(id));
    });
  }

  if (f.dineIn) {
    out = out.filter((r) => r.dineIn === true);
  }
  if (f.dineOut) {
    out = out.filter((r) => r.dineOut === true);
  }

  if (f.days.trim()) {
    const selectedDays = f.days
      .toLowerCase()
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    out = out.filter((r) => {
      const normalized = normalizeValidDaysFromRestaurant(r.validDays);
      if (normalized.length === 0) return false;
      return (
        normalized.includes("all week") ||
        selectedDays.some((day) => normalized.includes(day))
      );
    });
  }

  if (f.mealTimes.trim()) {
    const mealRanges = f.mealTimes
      .split(",")
      .map((mt) => mt.trim())
      .map(parseMealTimeRange)
      .filter((range): range is { start: number; end: number } => range !== null);

    if (mealRanges.length > 0) {
      out = out.filter((r) => {
        const offers = r.offers ?? [];
        return offers.some((offer) => {
          if (!offer.validHours) return false;
          const offerRange = parseValidHours(offer.validHours);
          if (!offerRange) return false;
          return mealRanges.some((mr) => timeRangesOverlap(offerRange, mr));
        });
      });
    }
  }

  if (
    f.maxDistanceMiles !== RESTAURANT_DISTANCE_FILTER_ALL &&
    typeof f.maxDistanceMiles === "number"
  ) {
    const maxMi = f.maxDistanceMiles;
    out = out.filter((r) => {
      const lat = r.lat;
      const lng = r.lng;
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return false;
      }
      const miles = haversineDistanceMiles(f.userLat, f.userLng, lat, lng);
      return miles <= maxMi + 1e-6;
    });
  }

  return out;
}
