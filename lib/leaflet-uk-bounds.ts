import L from "leaflet";

/**
 * Axis-aligned bounds for Great Britain + Northern Ireland (small margin).
 * Used with Leaflet maxBounds and optional tileLayer.bounds.
 */
export const UK_MAP_BOUNDS = L.latLngBounds(
  [49.5, -8.7],
  [60.95, 1.95],
);

/** SW / NE corners as `[lng, lat]` for MapTiler SDK / `MaptilerLayer` maxBounds. */
export const UK_MAP_MAX_BOUNDS_LNG_LAT: [[number, number], [number, number]] = [
  [UK_MAP_BOUNDS.getWest(), UK_MAP_BOUNDS.getSouth()],
  [UK_MAP_BOUNDS.getEast(), UK_MAP_BOUNDS.getNorth()],
];

/** Most zoomed-out level: keeps focus on the British Isles, not a world view. */
export const UK_MAP_MIN_ZOOM = 5;

/** Standard options for UK-only restaurant maps (combine with center/zoom). */
export const UK_LEAFLET_MAP_OPTIONS: Pick<
  L.MapOptions,
  "maxBounds" | "maxBoundsViscosity" | "minZoom"
> = {
  maxBounds: UK_MAP_BOUNDS,
  maxBoundsViscosity: 1,
  minZoom: UK_MAP_MIN_ZOOM,
};
