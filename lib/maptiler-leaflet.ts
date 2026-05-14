const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const DEFAULT_MAP_ID = "streets-v2";

/**
 * Raster tiles for Leaflet. `mapId` is the Cloud map id (path after `/maps/`), e.g. `streets-v2`
 * or a custom map UUID.
 *
 * Note: MapTiler may return 403 “Access to rendered maps not allowed” for **custom** maps on
 * the free plan while built-in styles still work. Use a built-in id (e.g. `basic-v2`, `positron`)
 * or upgrade the Cloud plan if you need your own style as raster tiles.
 *
 * @see https://docs.maptiler.com/cloud/api/maps/
 */
export function getMapTilerLeafletTileConfig(): {
  tileUrl: string;
  usingMapTiler: boolean;
} {
  const rawKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  const mapTilerKey = rawKey?.trim();
  const usingMapTiler = Boolean(mapTilerKey);
  const mapId = (
    process.env.NEXT_PUBLIC_MAPTILER_MAP_ID ?? DEFAULT_MAP_ID
  ).trim();
  const tileUrl = usingMapTiler
    ? `https://api.maptiler.com/maps/${mapId}/{z}/{x}/{y}.png?key=${encodeURIComponent(mapTilerKey!)}`
    : OSM_TILE_URL;
  return { tileUrl, usingMapTiler };
}
