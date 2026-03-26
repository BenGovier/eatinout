"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet.markercluster"
import { cn } from "@/lib/utils"
import { USER_LAT_LNG_SESSION_KEY } from "@/lib/user-location-session"

import "leaflet/dist/leaflet.css"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"

type LatLng = { lat: number; lng: number }
type RestaurantMarker = { id: string; name: string; lat: number; lng: number }

/** Default map center when the user has not shared location (Blackpool area). */
const BLACKPOOL_DEFAULT_VIEW_LAT_LNG: LatLng = { lat: 53.8189, lng: -3.05446 }

/** Tip of pin is at bottom center (anchor point on the map). */
const USER_LOCATION_ICON = L.icon({
  iconUrl: "/images/map-marker-user.svg",
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  popupAnchor: [0, -46],
})

const RESTAURANT_LOCATION_ICON = L.divIcon({
  className: "restaurant-pin-icon",
  html: `<div style="width:16px;height:16px;background:#DC3545;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 16],
  popupAnchor: [0, -16],
})

function getStoredLatLng(): LatLng | null {
  try {
    const raw = sessionStorage.getItem(USER_LAT_LNG_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LatLng>
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return null
    return { lat: parsed.lat, lng: parsed.lng }
  } catch {
    return null
  }
}

export default function UserLocationMap({
  className,
  zoom = 13,
  restaurants = [],
}: {
  className?: string
  zoom?: number
  restaurants?: RestaurantMarker[]
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const restaurantLayerRef = useRef<L.MarkerClusterGroup | null>(null)
  const [coords, setCoords] = useState<LatLng>(BLACKPOOL_DEFAULT_VIEW_LAT_LNG);

  useEffect(() => {
    // Read once immediately; if the consent modal updates sessionStorage later,
    // keep retrying briefly so the map recenters without requiring a refresh.
    let intervalId: number | undefined
    const tick = () => {
      const stored = getStoredLatLng()
      if (stored) {
        setCoords(stored)
        if (intervalId) window.clearInterval(intervalId)
      }
    }

    tick()
    intervalId = window.setInterval(tick, 1000)

    // Stop polling after a short window to avoid unnecessary work.
    const timeoutId = window.setTimeout(() => {
      if (intervalId) window.clearInterval(intervalId)
    }, 20_000)

    return () => {
      if (intervalId) window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [])

  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
  const usingMapTiler = !!mapTilerKey
  const tileUrl = usingMapTiler
    ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${mapTilerKey}`
    : `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

  useEffect(() => {
    if (!mapContainerRef.current) return

    const container = mapContainerRef.current
    const center = L.latLng(coords.lat, coords.lng)

    if (!mapInstanceRef.current) {
      // Defensive cleanup for React dev re-mounts/Fast Refresh.
      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null
      }

      const map = L.map(container, {
        center,
        zoom,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
      })

      L.tileLayer(tileUrl, {
        attribution: usingMapTiler
          ? "© MapTiler © OpenStreetMap contributors"
          : "© OpenStreetMap contributors",
      }).addTo(map)

      const marker = L.marker(center, { icon: USER_LOCATION_ICON }).addTo(map)
      marker.bindPopup(getStoredLatLng() ? "You are here" : "Explore this area")
      restaurantLayerRef.current = L.markerClusterGroup({
        maxClusterRadius: 50,
        disableClusteringAtZoom: 17,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount()
          const size = count < 10 ? 36 : count < 100 ? 42 : 48
          return L.divIcon({
            html: `<div style="
                width:${size}px;
                height:${size}px;
                border-radius:9999px;
                background:rgba(220,53,69,0.85);
                border:2px solid #ffffff;
                box-shadow:0 2px 8px rgba(0,0,0,0.25);
                color:#ffffff;
                font-weight:700;
                font-size:${count < 100 ? 13 : 12}px;
                display:flex;
                align-items:center;
                justify-content:center;
              ">${count}</div>`,
            className: "restaurant-cluster-icon",
            iconSize: [size, size],
          })
        },
      })
      map.addLayer(restaurantLayerRef.current)

      mapInstanceRef.current = map
      markerRef.current = marker
      return
    }

    mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom())
    markerRef.current?.setLatLng(center)
    markerRef.current?.setPopupContent(
      getStoredLatLng() ? "You are here" : "Explore this area",
    )
  }, [coords, tileUrl, usingMapTiler, zoom])

  useEffect(() => {
    const map = mapInstanceRef.current
    const layer = restaurantLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    restaurants
      .filter(
        (restaurant) =>
          typeof restaurant.lat === "number" &&
          Number.isFinite(restaurant.lat) &&
          typeof restaurant.lng === "number" &&
          Number.isFinite(restaurant.lng),
      )
      .forEach((restaurant) => {
        const marker = L.marker([restaurant.lat, restaurant.lng], {
          icon: RESTAURANT_LOCATION_ICON,
        })
        marker.bindPopup(restaurant.name || "Restaurant")
        marker.addTo(layer)
      })
  }, [restaurants])

  useEffect(() => {
    return () => {
      restaurantLayerRef.current?.clearLayers()
      restaurantLayerRef.current = null
      markerRef.current?.remove()
      markerRef.current = null
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [])

  return (
    <div
      className={cn("relative h-full min-h-0 w-full", className)}
    >
      {!usingMapTiler && (
        <div className="absolute top-2 left-2 z-[1000] rounded-lg bg-white/90 border border-gray-200 px-2 py-1 text-[11px] text-gray-700 shadow">
          Set `NEXT_PUBLIC_MAPTILER_API_KEY` to use MapTiler tiles
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  )
}

