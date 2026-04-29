"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import { useLocationConsent } from "@/components/location-consent-provider";
import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants";
import { UK_LEAFLET_MAP_OPTIONS, UK_MAP_BOUNDS } from "@/lib/leaflet-uk-bounds";
import {
  USER_MARKER_LEAFLET_ICON_ANCHOR,
  USER_MARKER_LEAFLET_ICON_SIZE,
} from "@/lib/leaflet-user-marker";
import { getMapTilerLeafletTileConfig } from "@/lib/maptiler-leaflet";
import { cn } from "@/lib/utils";
import {
  getStoredUserLatLng,
  isApproxDefaultMapCenter,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session";

import "leaflet/dist/leaflet.css";

/** Same icon as `/restaurants` user marker (`user-location-map`). */
const JOIN_MAP_PICK_ICON = L.icon({
  iconUrl: "/User-marker.svg",
  iconSize: [...USER_MARKER_LEAFLET_ICON_SIZE],
  iconAnchor: [...USER_MARKER_LEAFLET_ICON_ANCHOR],
  popupAnchor: [0, -14],
});

type Pin = { lat: number; lng: number };

export default function JoinRestaurantLocationMap({
  pin,
  onPick,
  className,
}: {
  pin: Pin | null;
  /** Called when the user clicks the map to choose a location (reverse geocode in parent). */
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** Single pick marker (same graphic as `/restaurants` user marker): follows `pin` when set, otherwise session GPS when available. */
  const pickMarkerRef = useRef<L.Marker | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const locationConsent = useLocationConsent();
  const [userGpsForMarker, setUserGpsForMarker] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const syncUserGpsFromStorage = useCallback(() => {
    const u = getStoredUserLatLng();
    if (u && !isApproxDefaultMapCenter(u.lat, u.lng)) {
      setUserGpsForMarker(u);
    } else {
      setUserGpsForMarker(null);
    }
  }, []);

  useEffect(() => {
    syncUserGpsFromStorage();
    window.addEventListener(
      USER_LOCATION_STORAGE_EVENT,
      syncUserGpsFromStorage,
    );
    const intervalId = window.setInterval(syncUserGpsFromStorage, 1000);
    const stop = window.setTimeout(() => {
      window.clearInterval(intervalId);
    }, 20_000);
    return () => {
      window.removeEventListener(
        USER_LOCATION_STORAGE_EVENT,
        syncUserGpsFromStorage,
      );
      window.clearInterval(intervalId);
      window.clearTimeout(stop);
    };
  }, [syncUserGpsFromStorage]);

  const { tileUrl, usingMapTiler } = getMapTilerLeafletTileConfig();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if ((el as unknown as { _leaflet_id?: number })._leaflet_id) {
      (el as unknown as { _leaflet_id?: number })._leaflet_id = undefined;
    }

    const center = L.latLng(
      DEFAULT_MAP_CENTER_LAT_LNG.lat,
      DEFAULT_MAP_CENTER_LAT_LNG.lng,
    );

    const map = L.map(el, {
      ...UK_LEAFLET_MAP_OPTIONS,
      center,
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer(tileUrl, {
      bounds: UK_MAP_BOUNDS,
      attribution: usingMapTiler
        ? "© MapTiler © OpenStreetMap contributors"
        : "© OpenStreetMap contributors",
    }).addTo(map);

    const clickHandler = (e: L.LeafletMouseEvent) => {
      onPickRef.current?.(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", clickHandler);

    setMapInstance(map);

    return () => {
      map.off("click", clickHandler);
      pickMarkerRef.current = null;
      map.remove();
      setMapInstance(null);
    };
  }, [tileUrl, usingMapTiler]);

  useEffect(() => {
    if (!mapInstance) return;

    const markerPosition = pin ?? userGpsForMarker;

    if (!markerPosition) {
      pickMarkerRef.current?.remove();
      pickMarkerRef.current = null;
      mapInstance.setView(
        L.latLng(
          DEFAULT_MAP_CENTER_LAT_LNG.lat,
          DEFAULT_MAP_CENTER_LAT_LNG.lng,
        ),
        12,
      );
      return;
    }

    const ll = L.latLng(markerPosition.lat, markerPosition.lng);

    if (!pickMarkerRef.current) {
      pickMarkerRef.current = L.marker(ll, {
        icon: JOIN_MAP_PICK_ICON,
        zIndexOffset: 1000,
      }).addTo(mapInstance);
      mapInstance.flyTo(ll, Math.max(mapInstance.getZoom(), 15), {
        duration: 1.0,
      });
    } else {
      pickMarkerRef.current.setLatLng(ll);
      if (pin) {
        mapInstance.flyTo(ll, Math.max(mapInstance.getZoom(), 15), {
          duration: 1.0,
        });
      }
    }

    pickMarkerRef.current.setPopupContent(
      pin
        ? "Restaurant location — click the map to move the pin"
        : "Your location — click the map to set your restaurant address",
    );
  }, [mapInstance, pin, userGpsForMarker]);

  const handleRecenterOnUser = () => {
    const stored = getStoredUserLatLng();
    if (!stored || isApproxDefaultMapCenter(stored.lat, stored.lng)) {
      locationConsent?.requestLocationModal();
      return;
    }

    const map = mapInstance;
    if (!map) return;

    const center = L.latLng(stored.lat, stored.lng);
    map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 1.15 });
    pickMarkerRef.current?.setLatLng(center);
    onPickRef.current?.(stored.lat, stored.lng);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100",
        className,
      )}
    >
      <div
        ref={containerRef}
        className="h-[240px] w-full min-h-[200px] md:h-[280px]"
        aria-label="Map: click to set restaurant location"
      />
      <button
        type="button"
        onClick={handleRecenterOnUser}
        className="pointer-events-auto absolute bottom-2 right-2 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 shadow-md transition-colors hover:border-[#DC3545]/40 hover:bg-gray-50 md:bottom-3 md:right-3"
        aria-label="Center map on your location"
        title="Your location"
      >
        <LocateFixed className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
