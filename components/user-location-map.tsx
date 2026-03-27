"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { LocateFixed } from "lucide-react"
import L, { type LeafletMouseEvent } from "leaflet"
import "leaflet.markercluster"
import { useLocationConsent } from "@/components/location-consent-provider"
import { Button } from "@/components/ui/button"
import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  USER_LAT_LNG_SESSION_KEY,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session"

import "leaflet/dist/leaflet.css"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"

type LatLng = { lat: number; lng: number }
type RestaurantMarker = {
  id: string
  name: string
  lat: number
  lng: number
  distanceMiles?: number
  imageUrl: string
  offerSummary: string
  firstOfferId?: string
}

type MapPopoverState = {
  id: string
  name: string
  imageUrl: string
  offerSummary: string
  distanceMiles?: number
  lat: number
  lng: number
  firstOfferId?: string
}

/** Tip of pin is at bottom center (anchor point on the map). */
const USER_LOCATION_ICON = L.icon({
  iconUrl: "/images/map-marker-user.svg",
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  popupAnchor: [0, -46],
})

function restaurantMarkerIcon(distanceMiles: number | undefined): L.DivIcon {
  const hasMiles =
    typeof distanceMiles === "number" &&
    Number.isFinite(distanceMiles) &&
    distanceMiles >= 0
  const label = hasMiles
    ? `${distanceMiles % 1 === 0 ? String(distanceMiles) : distanceMiles.toFixed(1)} mi`
    : ""
  const html = hasMiles
    ? `<div style="display:flex;flex-direction:column;align-items:center;margin:0;padding:0;pointer-events:auto;">
        <div style="background:#fff;border:1px solid #DC3545;color:#DC3545;font-size:10px;font-weight:700;line-height:1.2;padding:2px 6px;border-radius:9999px;box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;">${label}</div>
        <div style="width:0;height:0;margin-top:1px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #DC3545;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2));"></div>
      </div>`
    : `<div style="width:16px;height:16px;background:#DC3545;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`

  const w = hasMiles ? 56 : 16
  const h = hasMiles ? 34 : 16
  const ax = hasMiles ? Math.round(w / 2) : 8
  const ay = h

  return L.divIcon({
    className: "restaurant-pin-icon",
    html,
    iconSize: [w, h],
    iconAnchor: [ax, ay],
    popupAnchor: [0, ay + 4],
  })
}

function formatDistanceMiles(miles?: number): string {
  if (typeof miles !== "number" || !Number.isFinite(miles) || miles < 0)
    return ""
  return miles % 1 === 0 ? `${miles} mi` : `${miles.toFixed(1)} mi`
}

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
  onViewDeal,
}: {
  className?: string
  zoom?: number
  restaurants?: RestaurantMarker[]
  onViewDeal?: (restaurantId: string, offerId?: string) => void
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const restaurantLayerRef = useRef<L.MarkerClusterGroup | null>(null)
  /** When true, next coords sync uses flyTo instead of setView (user-initiated). */
  const userRequestedRecenterRef = useRef(false)
  const locationConsent = useLocationConsent()
  const [coords, setCoords] = useState<LatLng>({
    lat: DEFAULT_MAP_CENTER_LAT_LNG.lat,
    lng: DEFAULT_MAP_CENTER_LAT_LNG.lng,
  })
  const [mapPopover, setMapPopover] = useState<MapPopoverState | null>(null)
  /** Viewport coordinates (px) for marker anchor; popover is portaled with `position: fixed`. */
  const [popoverAnchor, setPopoverAnchor] = useState<{
    left: number
    top: number
  } | null>(null)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

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

  useEffect(() => {
    const onStorage = () => {
      const stored = getStoredLatLng()
      if (!stored) return
      userRequestedRecenterRef.current = true
      setCoords(stored)
    }
    window.addEventListener(USER_LOCATION_STORAGE_EVENT, onStorage)
    return () =>
      window.removeEventListener(USER_LOCATION_STORAGE_EVENT, onStorage)
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

      map.on("click", () => {
        setMapPopover(null)
      })

      mapInstanceRef.current = map
      markerRef.current = marker
      if (userRequestedRecenterRef.current) {
        userRequestedRecenterRef.current = false
        const z = Math.max(map.getZoom(), zoom)
        map.flyTo(center, z, { duration: 1.15 })
      }
      return
    }

    const map = mapInstanceRef.current
    if (userRequestedRecenterRef.current) {
      userRequestedRecenterRef.current = false
      const z = Math.max(map.getZoom(), zoom)
      map.flyTo(center, z, { duration: 1.15 })
    } else {
      map.setView(center, map.getZoom())
    }
    markerRef.current?.setLatLng(center)
    markerRef.current?.setPopupContent(
      getStoredLatLng() ? "You are here" : "Explore this area",
    )
  }, [coords, tileUrl, usingMapTiler, zoom])

  useEffect(() => {
    if (!mapPopover) {
      setPopoverAnchor(null)
      return
    }
    const map = mapInstanceRef.current
    if (!map) return

    const sync = () => {
      const mapEl = map.getContainer()
      const rect = mapEl.getBoundingClientRect()
      const p = map.latLngToContainerPoint(
        L.latLng(mapPopover.lat, mapPopover.lng),
      )
      const anchorLeft = rect.left + p.x
      const anchorTop = rect.top + p.y
      const cardW = Math.min(window.innerWidth * 0.92, 260)
      const margin = 8
      const clampedLeft = Math.min(
        Math.max(anchorLeft, cardW / 2 + margin),
        window.innerWidth - cardW / 2 - margin,
      )
      const minAnchorTop = 96
      const clampedTop = Math.min(
        Math.max(anchorTop, minAnchorTop),
        window.innerHeight - 32,
      )
      setPopoverAnchor({ left: clampedLeft, top: clampedTop })
    }

    sync()
    map.on("moveend", sync)
    map.on("zoomend", sync)
    window.addEventListener("scroll", sync, true)
    window.addEventListener("resize", sync)
    return () => {
      map.off("moveend", sync)
      map.off("zoomend", sync)
      window.removeEventListener("scroll", sync, true)
      window.removeEventListener("resize", sync)
    }
  }, [mapPopover])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapPopover(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    const layer = restaurantLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    setMapPopover((prev) => {
      if (!prev) return null
      const stillHere = restaurants.some((r) => r.id === prev.id)
      return stillHere ? prev : null
    })

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
          icon: restaurantMarkerIcon(restaurant.distanceMiles),
        })
        marker.on("click", (e: LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e.originalEvent)
          setMapPopover({
            id: restaurant.id,
            name: restaurant.name,
            imageUrl: restaurant.imageUrl,
            offerSummary: restaurant.offerSummary,
            distanceMiles: restaurant.distanceMiles,
            lat: restaurant.lat,
            lng: restaurant.lng,
            firstOfferId: restaurant.firstOfferId,
          })
        })
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

  const handleRecenterOnUser = () => {
    const stored = getStoredLatLng()
    if (!stored) {
      locationConsent?.requestLocationModal()
      return
    }

    const map = mapInstanceRef.current
    const matchesState =
      coords.lat === stored.lat && coords.lng === stored.lng

    if (map && matchesState) {
      const center = L.latLng(stored.lat, stored.lng)
      const z = Math.max(map.getZoom(), zoom)
      map.flyTo(center, z, { duration: 1.15 })
      markerRef.current?.setLatLng(center)
      markerRef.current?.setPopupContent("You are here")
      return
    }

    userRequestedRecenterRef.current = true
    setCoords(stored)
  }

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
                    onViewDeal?.(mapPopover.id, mapPopover.firstOfferId)
                    setMapPopover(null)
                  }}
                >
                  View deal
                </Button>
              </div>
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <>
      {popoverLayer}
      <div
        className={cn(
          "relative z-0 isolate h-full min-h-0 w-full",
          className,
        )}
      >
      {!usingMapTiler && (
        <div className="absolute top-2 left-2 z-10 rounded-lg bg-white/90 border border-gray-200 px-2 py-1 text-[11px] text-gray-700 shadow">
          Set `NEXT_PUBLIC_MAPTILER_API_KEY` to use MapTiler tiles
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" />
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
    </>
  )
}

