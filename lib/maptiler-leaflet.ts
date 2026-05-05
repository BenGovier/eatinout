const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const DEFAULT_MAP_ID = "streets-v2";

export type MapTilerVectorBasemap = {
  apiKey: string;
  /** MapTiler Cloud style.json URL (no query string; the SDK sends the API key). */
  styleUrl: string;
};

/**
 * Basemap configuration for Leaflet: MapTiler **vector** (MapTiler SDK layer) when a Cloud key
 * is set, otherwise OSM **raster** tiles.
 *
 * `mapId` is the Cloud map id (path segment after `/maps/`), e.g. `streets-v2` or a custom UUID.
 *
 * @see https://docs.maptiler.com/cloud/api/maps/
 */
export function getMapTilerLeafletBasemapConfig(): {
  /** True when rendering via MapTiler vector basemap */
  usingMapTiler: boolean;
  /** Only used when `mapTilerVector` is null (OSM fallback) */
  osmRasterTileUrl: string;
  mapTilerVector: MapTilerVectorBasemap | null;
} {
  const rawKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim();
  const mapId = (
    process.env.NEXT_PUBLIC_MAPTILER_MAP_ID ?? DEFAULT_MAP_ID
  ).trim();

  if (rawKey) {
    const styleUrl = `https://api.maptiler.com/maps/${mapId}/style.json`;
    return {
      usingMapTiler: true,
      osmRasterTileUrl: OSM_TILE_URL,
      mapTilerVector: { apiKey: rawKey, styleUrl },
    };
  }

  return {
    usingMapTiler: false,
    osmRasterTileUrl: OSM_TILE_URL,
    mapTilerVector: null,
  };
}
