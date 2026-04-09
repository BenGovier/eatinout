"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import { useLocationConsent } from "@/components/location-consent-provider";
import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants";
import { getMapTilerLeafletTileConfig } from "@/lib/maptiler-leaflet";
import { cn } from "@/lib/utils";
import {
  getStoredUserLatLng,
  isApproxDefaultMapCenter,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session";

import "leaflet/dist/leaflet.css";

const RESTAURANT_PIN = L.icon({
  iconUrl: "/Marker.svg",
  iconSize: [36, 51],
  iconAnchor: [18, 51],
  popupAnchor: [0, -49],
});

/** Pill + pin for shared GPS; only used when not the default map centre. */
function userGpsDivIcon(): L.DivIcon {
  return L.divIcon({
    className: "join-map-user-gps-marker",
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
      <div style="background:#DC3545;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:9999px;box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;margin-bottom:2px;">Your location</div>
      <img src="/images/map-marker-user.svg" width="36" height="48" alt="" style="display:block;" />
    </div>`,
    iconSize: [120, 72],
    iconAnchor: [60, 72],
    popupAnchor: [0, 72],
  });
}

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
  const markerRef = useRef<L.Marker | null>(null);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);
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
    window.addEventListener(USER_LOCATION_STORAGE_EVENT, syncUserGpsFromStorage);
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
      center,
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer(tileUrl, {
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
      userGpsMarkerRef.current = null;
      markerRef.current = null;
      map.remove();
      setMapInstance(null);
    };
  }, [tileUrl, usingMapTiler]);

  useEffect(() => {
    if (!mapInstance) return;

    if (!pin) {
      markerRef.current?.remove();
      markerRef.current = null;
      mapInstance.setView(
        L.latLng(
          DEFAULT_MAP_CENTER_LAT_LNG.lat,
          DEFAULT_MAP_CENTER_LAT_LNG.lng,
        ),
        12,
      );
      return;
    }

    const ll = L.latLng(pin.lat, pin.lng);

    if (!markerRef.current) {
      const m = L.marker(ll, { icon: RESTAURANT_PIN }).addTo(mapInstance);
      m.bindPopup("Restaurant location — click map to move the pin");
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng(ll);
    }

    mapInstance.flyTo(ll, Math.max(mapInstance.getZoom(), 15), {
      duration: 1.0,
    });
  }, [mapInstance, pin]);

  useEffect(() => {
    if (!mapInstance) return;

    if (!userGpsForMarker) {
      userGpsMarkerRef.current?.remove();
      userGpsMarkerRef.current = null;
      return;
    }

    const ll = L.latLng(userGpsForMarker.lat, userGpsForMarker.lng);

    if (!userGpsMarkerRef.current) {
      userGpsMarkerRef.current = L.marker(ll, {
        icon: userGpsDivIcon(),
        zIndexOffset: 1000,
      }).addTo(mapInstance);
    } else {
      userGpsMarkerRef.current.setLatLng(ll);
    }
  }, [mapInstance, userGpsForMarker]);

  const handleRecenterOnUser = () => {
    const stored = getStoredUserLatLng();
    if (
      !stored ||
      isApproxDefaultMapCenter(stored.lat, stored.lng)
    ) {
      locationConsent?.requestLocationModal();
      return;
    }

    const map = mapInstance;
    if (!map) return;

    const center = L.latLng(stored.lat, stored.lng);
    map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 1.15 });
    userGpsMarkerRef.current?.setLatLng(center);
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
