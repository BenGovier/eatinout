"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import { cn } from "@/lib/utils"
import { USER_LAT_LNG_SESSION_KEY } from "@/lib/user-location-session"

import "leaflet/dist/leaflet.css"

type LatLng = { lat: number; lng: number }

/** Default map center when the user has not shared location (Blackpool area). */
const BLACKPOOL_DEFAULT_VIEW_LAT_LNG: LatLng = { lat: 53.8189, lng: -3.05446 }

/** Tip of pin is at bottom center (anchor point on the map). */
const USER_LOCATION_ICON = L.icon({
  iconUrl: "/images/map-marker-user.svg",
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  popupAnchor: [0, -46],
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
}: {
  className?: string
  zoom?: number
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
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
    return () => {
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

