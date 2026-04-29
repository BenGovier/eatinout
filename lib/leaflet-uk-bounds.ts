import L from "leaflet";

/**
 * Axis-aligned bounds for Great Britain + Northern Ireland (small margin).
 * Used with Leaflet maxBounds and optional tileLayer.bounds.
 */
export const UK_MAP_BOUNDS = L.latLngBounds(
  [49.5, -8.7],
  [60.95, 1.95],
);

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
