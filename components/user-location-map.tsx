"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { LocateFixed, Minus, Plus } from "lucide-react";
import L, { type LeafletMouseEvent } from "leaflet";
import { useLocationConsent } from "@/components/location-consent-provider";
import { Button } from "@/components/ui/button";
import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants";
import { getMapTilerLeafletTileConfig } from "@/lib/maptiler-leaflet";
import { cn } from "@/lib/utils";
import {
  USER_MARKER_LEAFLET_ICON_ANCHOR,
  USER_MARKER_LEAFLET_ICON_SIZE,
} from "@/lib/leaflet-user-marker";
import {
  getStoredUserLatLng,
  persistUserLatLng,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session";

import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };
type RestaurantMarker = {
  id: string;
  /** Public URL segment: `/restaurant/[slug]` */
  slug: string;
  name: string;
  lat: number;
  lng: number;
  distanceMiles?: number;
  imageUrl: string;
  offerSummary: string;
  firstOfferId?: string;
};

type MapPopoverState = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  offerSummary: string;
  distanceMiles?: number;
  lat: number;
  lng: number;
  firstOfferId?: string;
};

const USER_LOCATION_ICON = L.icon({
  iconUrl: "/User-marker.svg",
  iconSize: [...USER_MARKER_LEAFLET_ICON_SIZE],
  iconAnchor: [...USER_MARKER_LEAFLET_ICON_ANCHOR],
  popupAnchor: [0, -14],
});

/** Restaurant pins on the map (`public/Marker.svg`); distance is shown in the popover, not on the pin. */
const RESTAURANT_MAP_ICON = L.icon({
  iconUrl: "/Marker.svg",
  iconSize: [36, 51],
  iconAnchor: [18, 51],
  popupAnchor: [0, -49],
});

function formatDistanceMiles(miles?: number): string {
  if (typeof miles !== "number" || !Number.isFinite(miles) || miles < 0)
    return "";
  return miles % 1 === 0 ? `${miles} mi` : `${miles.toFixed(1)} mi`;
}

export default function UserLocationMap({
  className,
  zoom = 13,
  restaurants = [],
  onViewDeal,
  isInteractionLocked = false,
}: {
  className?: string;
  zoom?: number;
  restaurants?: RestaurantMarker[];
  /** First argument is URL segment: `slug` (fallback to id if missing). */
  onViewDeal?: (restaurantPathSegment: string, offerId?: string) => void;
  /** When true, map tiles and controls are dimmed and non-interactive (e.g. list refetch). */
  isInteractionLocked?: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const restaurantLayerRef = useRef<L.LayerGroup | null>(null);
  /** When true, next coords sync uses flyTo instead of setView (user-initiated). */
  const userRequestedRecenterRef = useRef(false);
  /** Map pick updates storage+coords; skip flyTo so the view stays where the user clicked. */
  const skipFlyOnNextStorageSyncRef = useRef(false);
  const locationConsent = useLocationConsent();
  const [coords, setCoords] = useState<LatLng>({
    lat: DEFAULT_MAP_CENTER_LAT_LNG.lat,
    lng: DEFAULT_MAP_CENTER_LAT_LNG.lng,
  });
  const [mapPopover, setMapPopover] = useState<MapPopoverState | null>(null);
  /** Viewport coordinates (px) for marker anchor; popover is portaled with `position: fixed`. */
  const [popoverAnchor, setPopoverAnchor] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  /** Latest props for restaurant-driven fitBounds (effect is keyed only on `restaurants`). */
  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    // Read once immediately; if the consent modal updates sessionStorage later,
    // keep retrying briefly so the map recenters without requiring a refresh.
    let intervalId: number | undefined;
    const tick = () => {
      const stored = getStoredUserLatLng();
      if (stored) {
        setCoords(stored);
        if (intervalId) window.clearInterval(intervalId);
      }
    };

    tick();
    intervalId = window.setInterval(tick, 1000);

    // Stop polling after a short window to avoid unnecessary work.
    const timeoutId = window.setTimeout(() => {
      if (intervalId) window.clearInterval(intervalId);
    }, 20_000);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const onStorage = () => {
      const stored = getStoredUserLatLng();
      if (!stored) return;
      if (skipFlyOnNextStorageSyncRef.current) {
        skipFlyOnNextStorageSyncRef.current = false;
        setCoords(stored);
        return;
      }
      userRequestedRecenterRef.current = true;
      setCoords(stored);
    };
    window.addEventListener(USER_LOCATION_STORAGE_EVENT, onStorage);
    return () =>
      window.removeEventListener(USER_LOCATION_STORAGE_EVENT, onStorage);
  }, []);

  const { tileUrl, usingMapTiler } = getMapTilerLeafletTileConfig();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current;
    const center = L.latLng(coords.lat, coords.lng);

    if (!mapInstanceRef.current) {
      // Defensive cleanup for React dev re-mounts/Fast Refresh.
      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
      }

      const map = L.map(container, {
        center,
        zoom,
        zoomControl: false,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
      });

      L.tileLayer(tileUrl, {}).addTo(map);

      const marker = L.marker(center, {
        icon: USER_LOCATION_ICON,
        interactive: false,
      }).addTo(map);
      marker.bindPopup(
        getStoredUserLatLng() ? "You are here" : "Explore this area",
      );
      restaurantLayerRef.current = L.layerGroup();
      map.addLayer(restaurantLayerRef.current);

      map.on("click", (e: LeafletMouseEvent) => {
        setMapPopover(null);
        const { lat, lng } = e.latlng;
        skipFlyOnNextStorageSyncRef.current = true;
        persistUserLatLng(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      if (userRequestedRecenterRef.current) {
        userRequestedRecenterRef.current = false;
        const z = Math.max(map.getZoom(), zoom);
        map.flyTo(center, z, { duration: 1.15 });
      }
      return;
    }

    const map = mapInstanceRef.current;
    if (userRequestedRecenterRef.current) {
      userRequestedRecenterRef.current = false;
      const z = Math.max(map.getZoom(), zoom);
      map.flyTo(center, z, { duration: 1.15 });
    } else {
      map.setView(center, map.getZoom());
    }
    markerRef.current?.setLatLng(center);
    markerRef.current?.setPopupContent(
      getStoredUserLatLng() ? "You are here" : "Explore this area",
    );
  }, [coords, tileUrl, usingMapTiler, zoom]);

  useEffect(() => {
    if (!mapPopover) {
      setPopoverAnchor(null);
      return;
    }
    const map = mapInstanceRef.current;
    if (!map) return;

    const sync = () => {
      const mapEl = map.getContainer();
      const rect = mapEl.getBoundingClientRect();
      const p = map.latLngToContainerPoint(
        L.latLng(mapPopover.lat, mapPopover.lng),
      );
      const anchorLeft = rect.left + p.x;
      const anchorTop = rect.top + p.y;
      const cardW = Math.min(window.innerWidth * 0.92, 260);
      const margin = 8;
      const clampedLeft = Math.min(
        Math.max(anchorLeft, cardW / 2 + margin),
        window.innerWidth - cardW / 2 - margin,
      );
      const minAnchorTop = 96;
      const clampedTop = Math.min(
        Math.max(anchorTop, minAnchorTop),
        window.innerHeight - 32,
      );
      setPopoverAnchor({ left: clampedLeft, top: clampedTop });
    };

    sync();
    map.on("moveend", sync);
    map.on("zoomend", sync);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      map.off("moveend", sync);
      map.off("zoomend", sync);
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [mapPopover]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapPopover(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isInteractionLocked) setMapPopover(null);
  }, [isInteractionLocked]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = restaurantLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    setMapPopover((prev) => {
      if (!prev) return null;
      const stillHere = restaurants.some((r) => r.id === prev.id);
      return stillHere ? prev : null;
    });

    const validRestaurants = restaurants.filter(
      (restaurant) =>
        typeof restaurant.lat === "number" &&
        Number.isFinite(restaurant.lat) &&
        typeof restaurant.lng === "number" &&
        Number.isFinite(restaurant.lng),
    );

    validRestaurants.forEach((restaurant) => {
      const marker = L.marker([restaurant.lat, restaurant.lng], {
        icon: RESTAURANT_MAP_ICON,
      });
      marker.on("click", (e: LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e.originalEvent);
        setMapPopover({
          id: restaurant.id,
          slug: restaurant.slug,
          name: restaurant.name,
          imageUrl: restaurant.imageUrl,
          offerSummary: restaurant.offerSummary,
          distanceMiles: restaurant.distanceMiles,
          lat: restaurant.lat,
          lng: restaurant.lng,
          firstOfferId: restaurant.firstOfferId,
        });
      });
      marker.addTo(layer);
    });

    // After fetch/refetch (`restaurants` updates), fit everything visible once; user can pan/zoom freely until the next update.
    const userLatLng =
      markerRef.current?.getLatLng() ??
      L.latLng(coordsRef.current.lat, coordsRef.current.lng);
    const defaultZoom = zoomRef.current;
    const fitPoints: L.LatLng[] = [
      ...validRestaurants.map((r) => L.latLng(r.lat, r.lng)),
      userLatLng,
    ];

    let bounds = L.latLngBounds(fitPoints);
    if (!bounds.isValid()) {
      map.setView(userLatLng, defaultZoom);
      return;
    }

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    // Degenerate bounds: getBoundsZoom / fitBounds need a non-zero area.
    if (sw.lat === ne.lat && sw.lng === ne.lng) {
      const eps = 0.002;
      bounds = L.latLngBounds(
        L.latLng(sw.lat - eps, sw.lng - eps),
        L.latLng(ne.lat + eps, ne.lng + eps),
      );
    }

    // fitBounds uses getBoundsZoom internally — max zoom that still fits, with padding (no extra maxZoom cap).
    map.fitBounds(bounds, { padding: [40, 48] });
  }, [restaurants]);

  useEffect(() => {
    return () => {
      restaurantLayerRef.current?.clearLayers();
      restaurantLayerRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenterOnUser = () => {
    const stored = getStoredUserLatLng();
    if (!stored) {
      locationConsent?.requestLocationModal();
      return;
    }

    const map = mapInstanceRef.current;
    const matchesState = coords.lat === stored.lat && coords.lng === stored.lng;

    if (map && matchesState) {
      const center = L.latLng(stored.lat, stored.lng);
      const z = Math.max(map.getZoom(), zoom);
      map.flyTo(center, z, { duration: 1.15 });
      markerRef.current?.setLatLng(center);
      markerRef.current?.setPopupContent("You are here");
      return;
    }

    userRequestedRecenterRef.current = true;
    setCoords(stored);
  };

  const popoverLayer =
    portalReady && mapPopover && popoverAnchor
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close restaurant details"
              className="pointer-events-auto fixed inset-0 z-[5400] cursor-default bg-black/[0.06]"
              onClick={() => setMapPopover(null)}
            />
            <div
              role="dialog"
              aria-labelledby="map-popover-restaurant-name"
              className="pointer-events-auto fixed z-[5410] w-[min(92vw,260px)] -translate-x-1/2 -translate-y-full rounded-xl border border-gray-200 bg-white shadow-xl"
              style={{
                left: popoverAnchor.left,
                top: popoverAnchor.top - 12,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-[104px] w-full overflow-hidden rounded-t-xl bg-gray-100">
                <Image
                  src={mapPopover.imageUrl || "/placeholder.svg"}
                  alt={mapPopover.name}
                  fill
                  className="object-cover"
                  sizes="260px"
                />
              </div>
              <div className="space-y-2 p-3">
                <h3
                  id="map-popover-restaurant-name"
                  className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900"
                >
                  {mapPopover.name}
                </h3>
                <p className="line-clamp-2 text-xs leading-snug text-gray-600">
                  {mapPopover.offerSummary}
                </p>
                {formatDistanceMiles(mapPopover.distanceMiles) ? (
                  <p className="text-xs font-medium text-gray-500">
                    {formatDistanceMiles(mapPopover.distanceMiles)} away
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="w-full rounded-lg bg-[#eb221c] font-semibold text-white hover:bg-[#eb221c]/90"
                  onClick={() => {
                    onViewDeal?.(
                      mapPopover.slug?.trim() || mapPopover.id,
                      mapPopover.firstOfferId,
                    );
                    setMapPopover(null);
                  }}
                >
                  View deal
                </Button>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      {popoverLayer}
      <div
        role="region"
        aria-label="Restaurant map"
        aria-busy={isInteractionLocked}
        className={cn("relative z-0 isolate h-full min-h-0 w-full", className)}
      >
        <div
          className={cn(
            "relative h-full min-h-0 w-full transition-opacity duration-200",
            isInteractionLocked && "pointer-events-none cursor-wait opacity-60",
          )}
        >
          {!usingMapTiler && (
            <div className="absolute top-2 left-2 z-10 rounded-lg bg-white/90 border border-gray-200 px-2 py-1 text-[11px] text-gray-700 shadow">
              Set `NEXT_PUBLIC_MAPTILER_API_KEY` to use MapTiler tiles
              (optional: `NEXT_PUBLIC_MAPTILER_MAP_ID` for a custom Cloud map)
            </div>
          )}
          <div ref={mapContainerRef} className="h-full w-full" />
          <div
            className={cn(
              "pointer-events-none absolute z-[1200] flex flex-col gap-2",
              /* Mobile: sit in the visible band below search tools and above the bottom drawer peek (~26vh). */
              "right-3 top-[calc(8rem+env(safe-area-inset-top))] max-md:bottom-[calc(28dvh+env(safe-area-inset-bottom,0px))] max-md:justify-start",
              /* Desktop: classic bottom-right stack. */
              "md:bottom-3 md:right-3 md:top-auto md:justify-end",
            )}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 shadow-md transition-colors hover:border-[#DC3545]/40 hover:bg-gray-50"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <Plus className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 shadow-md transition-colors hover:border-[#DC3545]/40 hover:bg-gray-50"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <Minus className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleRecenterOnUser}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 shadow-md transition-colors hover:border-[#DC3545]/40 hover:bg-gray-50"
              aria-label="Center map on your location"
              title="Your location"
            >
              <LocateFixed className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
        {isInteractionLocked ? (
          <div className="pointer-events-none absolute inset-0 z-[1250] flex items-center justify-center">
            <span className="sr-only">Updating restaurants</span>
            <div
              className="h-9 w-9 rounded-full border-2 border-[#DC3545]/25 border-t-[#DC3545] shadow-sm animate-spin"
              aria-hidden
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
