/** GeoJSON Point for MongoDB 2dsphere ([lng, lat]). */

export type RestaurantGeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

export function geoPointFromLatLng(
  lat: unknown,
  lng: unknown,
): RestaurantGeoPoint | null {
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return { type: "Point", coordinates: [lng, lat] };
  }
  return null;
}
