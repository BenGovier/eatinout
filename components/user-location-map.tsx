// "use client";

// import { useEffect, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import Image from "next/image";
// import { LocateFixed, Minus, Plus } from "lucide-react";
// import L, { type LeafletMouseEvent } from "leaflet";
// import { useLocationConsent } from "@/components/location-consent-provider";
// import { Button } from "@/components/ui/button";
// import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants";
// import { UK_LEAFLET_MAP_OPTIONS, UK_MAP_BOUNDS } from "@/lib/leaflet-uk-bounds";
// import { getMapTilerLeafletTileConfig } from "@/lib/maptiler-leaflet";
// import { cn } from "@/lib/utils";
// import {
//   USER_MARKER_LEAFLET_ICON_ANCHOR,
//   USER_MARKER_LEAFLET_ICON_SIZE,
// } from "@/lib/leaflet-user-marker";
// import {
//   getStoredUserLatLng,
//   persistUserLatLng,
//   USER_LOCATION_STORAGE_EVENT,
// } from "@/lib/user-location-session";
// import { Drawer, DrawerContent } from "@/components/ui/drawer";
// import { useIsMobile } from "@/components/ui/use-mobile";
// import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

// import "leaflet/dist/leaflet.css";
// import "leaflet.markercluster/dist/MarkerCluster.css";
// import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// // Dynamic import for marker cluster to avoid SSR issues
// if (typeof window !== "undefined") {
//   require("leaflet.markercluster");
// }

// type LatLng = { lat: number; lng: number };
// type RestaurantMarker = {
//   id: string;
//   /** Public URL segment: `/restaurant/[slug]` */
//   slug: string;
//   name: string;
//   lat: number;
//   lng: number;
//   distanceMiles?: number;
//   imageUrl: string;
//   offerSummary: string;
//   firstOfferId?: string;
// };

// type MapPopoverState = {
//   id: string;
//   slug: string;
//   name: string;
//   imageUrl: string;
//   offerSummary: string;
//   distanceMiles?: number;
//   lat: number;
//   lng: number;
//   firstOfferId?: string;
// };

// const USER_LOCATION_ICON = L.icon({
//   iconUrl: "/User-marker.svg",
//   iconSize: [...USER_MARKER_LEAFLET_ICON_SIZE],
//   iconAnchor: [...USER_MARKER_LEAFLET_ICON_ANCHOR],
//   popupAnchor: [0, -14],
// });

// /** Restaurant pins on the map (`public/Marker.svg`); distance is shown in the popover, not on the pin. */
// const RESTAURANT_MAP_ICON = L.icon({
//   iconUrl: "/Marker.svg",
//   iconSize: [36, 51],
//   iconAnchor: [18, 51],
//   popupAnchor: [0, -49],
// });

// function formatDistanceMiles(miles?: number): string {
//   if (typeof miles !== "number" || !Number.isFinite(miles) || miles < 0)
//     return "";
//   return miles % 1 === 0 ? `${miles} mi` : `${miles.toFixed(1)} mi`;
// }

// export default function UserLocationMap({
//   className,
//   zoom = 13,
//   restaurants = [],
//   onViewDeal,
//   isInteractionLocked = false,
// }: {
//   className?: string;
//   zoom?: number;
//   restaurants?: RestaurantMarker[];
//   /** First argument is URL segment: `slug` (fallback to id if missing). */
//   onViewDeal?: (restaurantPathSegment: string, offerId?: string) => void;
//   /** When true, map tiles and controls are dimmed and non-interactive (e.g. list refetch). */
//   isInteractionLocked?: boolean;
// }) {
//   const mapContainerRef = useRef<HTMLDivElement | null>(null);
//   const mapInstanceRef = useRef<L.Map | null>(null);
//   const markerRef = useRef<L.Marker | null>(null);
//   const restaurantLayerRef = useRef<any>(null); // marker cluster group
//   /** When true, next coords sync uses flyTo instead of setView (user-initiated). */
//   const userRequestedRecenterRef = useRef(false);
//   /** Map pick updates storage+coords; skip flyTo so the view stays where the user clicked. */
//   const skipFlyOnNextStorageSyncRef = useRef(false);
//   const locationConsent = useLocationConsent();
//   const [coords, setCoords] = useState<LatLng>({
//     lat: DEFAULT_MAP_CENTER_LAT_LNG.lat,
//     lng: DEFAULT_MAP_CENTER_LAT_LNG.lng,
//   });
//   const isMobile = useIsMobile();
//   const [mapPopoverList, setMapPopoverList] = useState<MapPopoverState[]>([]);
//   /** Viewport coordinates (px) for marker anchor; popover is portaled with `position: fixed`. */
// removed popoverAnchor
//   const [portalReady, setPortalReady] = useState(false);
//   /** Latest props for restaurant-driven fitBounds (effect is keyed only on `restaurants`). */
//   const coordsRef = useRef(coords);
//   coordsRef.current = coords;
//   const zoomRef = useRef(zoom);
//   zoomRef.current = zoom;

//   useEffect(() => {
//     setPortalReady(true);
//   }, []);

//   useEffect(() => {
//     // Read once immediately; if the consent modal updates sessionStorage later,
//     // keep retrying briefly so the map recenters without requiring a refresh.
//     let intervalId: number | undefined;
//     const tick = () => {
//       const stored = getStoredUserLatLng();
//       if (stored) {
//         setCoords(stored);
//         if (intervalId) window.clearInterval(intervalId);
//       }
//     };

//     tick();
//     intervalId = window.setInterval(tick, 1000);

//     // Stop polling after a short window to avoid unnecessary work.
//     const timeoutId = window.setTimeout(() => {
//       if (intervalId) window.clearInterval(intervalId);
//     }, 20_000);

//     return () => {
//       if (intervalId) window.clearInterval(intervalId);
//       window.clearTimeout(timeoutId);
//     };
//   }, []);

//   useEffect(() => {
//     const onStorage = () => {
//       const stored = getStoredUserLatLng();
//       if (!stored) return;
//       if (skipFlyOnNextStorageSyncRef.current) {
//         skipFlyOnNextStorageSyncRef.current = false;
//         setCoords(stored);
//         return;
//       }
//       userRequestedRecenterRef.current = true;
//       setCoords(stored);
//     };
//     window.addEventListener(USER_LOCATION_STORAGE_EVENT, onStorage);
//     return () =>
//       window.removeEventListener(USER_LOCATION_STORAGE_EVENT, onStorage);
//   }, []);

//   const { tileUrl, usingMapTiler } = getMapTilerLeafletTileConfig();

//   useEffect(() => {
//     if (!mapContainerRef.current) return;

//     const container = mapContainerRef.current;
//     const center = L.latLng(coords.lat, coords.lng);

//     if (!mapInstanceRef.current) {
//       // Defensive cleanup for React dev re-mounts/Fast Refresh.
//       if ((container as any)._leaflet_id) {
//         (container as any)._leaflet_id = null;
//       }

//       const map = L.map(container, {
//         ...UK_LEAFLET_MAP_OPTIONS,
//         center,
//         zoom,
//         zoomControl: false,
//         scrollWheelZoom: true,
//         dragging: true,
//         doubleClickZoom: true,
//       });

//       L.tileLayer(tileUrl, { bounds: UK_MAP_BOUNDS }).addTo(map);

//       const marker = L.marker(center, {
//         icon: USER_LOCATION_ICON,
//         interactive: false,
//       }).addTo(map);
//       marker.bindPopup(
//         getStoredUserLatLng() ? "You are here" : "Explore this area",
//       );

//       // @ts-ignore - markercluster is loaded dynamically
//       restaurantLayerRef.current = L.markerClusterGroup({
//         chunkedLoading: true,
//         showCoverageOnHover: false,
//         maxClusterRadius: 40,
//         zoomToBoundsOnClick: false,
//         iconCreateFunction: function(cluster: any) {
//           const count = cluster.getChildCount();
//           return L.divIcon({
//             html: `<div style="background-color: #eb221c; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${count}</div>`,
//             className: 'custom-cluster-icon',
//             iconSize: L.point(36, 36)
//           });
//         }
//       });
//       restaurantLayerRef.current.on('clusterclick', (a: any) => {
//         const markers = a.layer.getAllChildMarkers();
//         const restaurants = markers.map((m: any) => m.restaurantData).filter(Boolean);

//         const currentZoom = map.getZoom();
//         const maxZoom = map.getMaxZoom() === Infinity ? 18 : (map.getMaxZoom() || 18);

//         // If there are many restaurants in the cluster and we can still zoom in, zoom instead of showing the drawer.
//         if (restaurants.length > 5 && currentZoom < maxZoom) {
//           a.layer.zoomToBounds({ padding: [40, 48] });
//           return;
//         }

//         if (restaurants.length > 0) {
//           setMapPopoverList(restaurants);
//         }
//       });
//       map.addLayer(restaurantLayerRef.current);

//       map.on("click", (e: LeafletMouseEvent) => {
//         setMapPopoverList([]);
//         const { lat, lng } = e.latlng;
//         skipFlyOnNextStorageSyncRef.current = true;
//         persistUserLatLng(lat, lng);
//       });

//       mapInstanceRef.current = map;
//       markerRef.current = marker;
//       if (userRequestedRecenterRef.current) {
//         userRequestedRecenterRef.current = false;
//         const z = Math.max(map.getZoom(), zoom);
//         map.flyTo(center, z, { duration: 1.15 });
//       }
//       return;
//     }

//     const map = mapInstanceRef.current;
//     if (userRequestedRecenterRef.current) {
//       userRequestedRecenterRef.current = false;
//       const z = Math.max(map.getZoom(), zoom);
//       map.flyTo(center, z, { duration: 1.15 });
//     } else {
//       map.setView(center, map.getZoom());
//     }
//     markerRef.current?.setLatLng(center);
//     markerRef.current?.setPopupContent(
//       getStoredUserLatLng() ? "You are here" : "Explore this area",
//     );
//   }, [coords, tileUrl, usingMapTiler, zoom]);

// // removed sync logic

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") setMapPopoverList([]);
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, []);

//   useEffect(() => {
//     if (isInteractionLocked) setMapPopoverList([]);
//   }, [isInteractionLocked]);

//   useEffect(() => {
//     const map = mapInstanceRef.current;
//     const layer = restaurantLayerRef.current;
//     if (!map || !layer) return;

//     layer.clearLayers();
//     setMapPopoverList((prev) => {
//       if (prev.length === 0) return [];
//       const stillHere = prev.filter(p => restaurants.some((r) => r.id === p.id));
//       return stillHere;
//     });

//     const validRestaurants = restaurants.filter(
//       (restaurant) =>
//         typeof restaurant.lat === "number" &&
//         Number.isFinite(restaurant.lat) &&
//         typeof restaurant.lng === "number" &&
//         Number.isFinite(restaurant.lng),
//     );

//     validRestaurants.forEach((restaurant) => {
//       const html = `
//         <div style="width: 40px; height: 40px; border-radius: 50%; background: white; border: 3px solid #eb221c; box-shadow: 0 4px 6px rgba(0,0,0,0.3); overflow: hidden; position: relative;">
//           <img src="${restaurant.imageUrl}" alt="${restaurant.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/placeholder.svg'" />
//         </div>
//       `;
//       const marker = L.marker([restaurant.lat, restaurant.lng], {
//         icon: L.divIcon({
//           html,
//           className: 'custom-div-icon',
//           iconSize: [40, 40],
//           iconAnchor: [20, 40]
//         }),
//       });
//       (marker as any).restaurantData = {
//         id: restaurant.id,
//         slug: restaurant.slug,
//         name: restaurant.name,
//         imageUrl: restaurant.imageUrl,
//         offerSummary: restaurant.offerSummary,
//         distanceMiles: restaurant.distanceMiles,
//         lat: restaurant.lat,
//         lng: restaurant.lng,
//         firstOfferId: restaurant.firstOfferId,
//       };
//       marker.on("click", (e: LeafletMouseEvent) => {
//         L.DomEvent.stopPropagation(e.originalEvent);
//         setMapPopoverList([(e.target as any).restaurantData]);
//       });
//       marker.addTo(layer);
//     });

//     // After fetch/refetch (`restaurants` updates), fit everything visible once; user can pan/zoom freely until the next update.
//     const userLatLng =
//       markerRef.current?.getLatLng() ??
//       L.latLng(coordsRef.current.lat, coordsRef.current.lng);
//     const defaultZoom = zoomRef.current;
//     const fitPoints: L.LatLng[] = [
//       ...validRestaurants.map((r) => L.latLng(r.lat, r.lng)),
//       userLatLng,
//     ];

//     let bounds = L.latLngBounds(fitPoints);
//     if (!bounds.isValid()) {
//       map.setView(userLatLng, defaultZoom);
//       return;
//     }

//     const sw = bounds.getSouthWest();
//     const ne = bounds.getNorthEast();
//     // Degenerate bounds: getBoundsZoom / fitBounds need a non-zero area.
//     if (sw.lat === ne.lat && sw.lng === ne.lng) {
//       const eps = 0.002;
//       bounds = L.latLngBounds(
//         L.latLng(sw.lat - eps, sw.lng - eps),
//         L.latLng(ne.lat + eps, ne.lng + eps),
//       );
//     }

//     // fitBounds uses getBoundsZoom internally — max zoom that still fits, with padding (no extra maxZoom cap).
//     map.fitBounds(bounds, { padding: [40, 48] });
//   }, [restaurants]);

//   useEffect(() => {
//     return () => {
//       restaurantLayerRef.current?.clearLayers();
//       restaurantLayerRef.current = null;
//       markerRef.current?.remove();
//       markerRef.current = null;
//       mapInstanceRef.current?.remove();
//       mapInstanceRef.current = null;
//     };
//   }, []);

//   const handleZoomIn = () => {
//     mapInstanceRef.current?.zoomIn();
//   };

//   const handleZoomOut = () => {
//     mapInstanceRef.current?.zoomOut();
//   };

//   const handleRecenterOnUser = () => {
//     const stored = getStoredUserLatLng();
//     if (!stored) {
//       locationConsent?.requestLocationModal();
//       return;
//     }

//     const map = mapInstanceRef.current;
//     const matchesState = coords.lat === stored.lat && coords.lng === stored.lng;

//     if (map && matchesState) {
//       const center = L.latLng(stored.lat, stored.lng);
//       const z = Math.max(map.getZoom(), zoom);
//       map.flyTo(center, z, { duration: 1.15 });
//       markerRef.current?.setLatLng(center);
//       markerRef.current?.setPopupContent("You are here");
//       return;
//     }

//     userRequestedRecenterRef.current = true;
//     setCoords(stored);
//   };

//   const popoverLayer =
//     portalReady && mapPopoverList.length > 0 && popoverAnchor && !isMobile
//       ? createPortal(
//           <>
//             <button
//               type="button"
//               aria-label="Close restaurant details"
//               className="pointer-events-auto fixed inset-0 z-[5400] cursor-default bg-black/[0.06]"
//               onClick={() => setMapPopoverList([])}
//             />
//             <div
//               role="dialog"
//               aria-labelledby="map-popover-restaurant-name"
//               className="pointer-events-auto fixed z-[5410] w-[min(92vw,260px)] -translate-x-1/2 -translate-y-full rounded-xl border border-gray-200 bg-white shadow-xl"
//               style={{
//                 left: popoverAnchor.left,
//                 top: popoverAnchor.top - 12,
//               }}
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="relative h-[104px] w-full overflow-hidden rounded-t-xl bg-gray-100">
//                 <Image
//                   src={mapPopoverList[0].imageUrl || "/placeholder.svg"}
//                   alt={mapPopoverList[0].name}
//                   fill
//                   className="object-cover"
//                   sizes="260px"
//                 />
//               </div>
//               <div className="space-y-2 p-3">
//                 <h3
//                   id="map-popover-restaurant-name"
//                   className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900"
//                 >
//                   {mapPopoverList[0].name}
//                   {mapPopoverList.length > 1 ? ` (+${mapPopoverList.length - 1} more)` : ""}
//                 </h3>
//                 <p className="line-clamp-2 text-xs leading-snug text-gray-600">
//                   {mapPopoverList[0].offerSummary}
//                 </p>
//                 {formatDistanceMiles(mapPopoverList[0].distanceMiles) ? (
//                   <p className="text-xs font-medium text-gray-500">
//                     {formatDistanceMiles(mapPopoverList[0].distanceMiles)} away
//                   </p>
//                 ) : null}
//                 <Button
//                   type="button"
//                   size="sm"
//                   className="w-full rounded-lg bg-[#eb221c] font-semibold text-white hover:bg-[#eb221c]/90"
//                   onClick={() => {
//                     onViewDeal?.(
//                       mapPopoverList[0].slug?.trim() || mapPopoverList[0].id,
//                       mapPopoverList[0].firstOfferId,
//                     );
//                     setMapPopoverList([]);
//                   }}
//                 >
//                   View deal
//                 </Button>
//               </div>
//             </div>
//           </>,
//           document.body,
//         )
//       : null;

//   const mobileDrawer = isMobile && mapPopoverList.length > 0 ? (
//     <Drawer open={mapPopoverList.length > 0} onOpenChange={(open) => { if (!open) setMapPopoverList([]); }}>
//       <DrawerContent className="px-0 pb-8 pt-4 z-[9999]">
//         <Carousel className="w-full" opts={{ loop: false, align: "start" }}>
//           <CarouselContent className="ml-0">
//             {mapPopoverList.map((mapPopover) => (
//               <CarouselItem key={mapPopover.id} className="pl-4 basis-[85%]">
//                 <div className="flex flex-col gap-4 pr-4">
//                   <div className="relative h-40 w-full overflow-hidden rounded-xl bg-gray-100">
//                     <Image
//                       src={mapPopover.imageUrl || "/placeholder.svg"}
//                       alt={mapPopover.name}
//                       fill
//                       className="object-cover"
//                       sizes="100vw"
//                     />
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-bold text-gray-900 leading-tight">
//                       {mapPopover.name}
//                     </h3>
//                     {formatDistanceMiles(mapPopover.distanceMiles) ? (
//                       <p className="text-sm font-medium text-gray-500 mt-1">
//                         {formatDistanceMiles(mapPopover.distanceMiles)} away
//                       </p>
//                     ) : null}
//                     <p className="text-sm text-gray-700 mt-2 font-medium">
//                       {mapPopover.offerSummary}
//                     </p>
//                   </div>
//                   <Button
//                     size="lg"
//                     className="w-full rounded-xl bg-[#eb221c] font-bold text-white hover:bg-[#eb221c]/90 h-12 text-base mt-2"
//                     onClick={() => {
//                       onViewDeal?.(
//                         mapPopover.slug?.trim() || mapPopover.id,
//                         mapPopover.firstOfferId,
//                       );
//                       setMapPopoverList([]);
//                     }}
//                   >
//                     View deal
//                   </Button>
//                 </div>
//               </CarouselItem>
//             ))}
//           </CarouselContent>
//         </Carousel>
//       </DrawerContent>
//     </Drawer>
//   ) : null;

//   return (
//     <>
//       {popoverLayer}
//       {mobileDrawer}
//       <div
//         role="region"
//         aria-label="Restaurant map"
//         aria-busy={isInteractionLocked}
//         className={cn("relative z-0 isolate h-full min-h-0 w-full", className)}
//       >
//         <div
//           className={cn(
//             "relative h-full min-h-0 w-full transition-opacity duration-200",
//             isInteractionLocked && "pointer-events-none cursor-wait opacity-60",
//           )}
//         >
//           {!usingMapTiler && (
//             <div className="absolute top-2 left-2 z-10 rounded-lg bg-white/90 border border-gray-200 px-2 py-1 text-[11px] text-gray-700 shadow">
//               Set `NEXT_PUBLIC_MAPTILER_API_KEY` to use MapTiler tiles
//               (optional: `NEXT_PUBLIC_MAPTILER_MAP_ID` for a custom Cloud map)
//             </div>
//           )}
//           <div ref={mapContainerRef} className="h-full w-full" />
//           <div
//             className={cn(
//               "pointer-events-none absolute z-[1200] flex flex-col gap-2",
//               /* Mobile: sit in the visible band below search tools and above the bottom drawer peek (~26vh). */
//               "right-3 top-[calc(8rem+env(safe-area-inset-top))] max-md:bottom-[calc(28dvh+env(safe-area-inset-bottom,0px))] max-md:justify-start",
//               /* Desktop: classic bottom-right stack. */
//               "md:bottom-3 md:right-3 md:top-auto md:justify-end",
//             )}
//           >
//             <button
//               type="button"
//               onClick={handleZoomIn}
//               className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 shadow-md transition-colors hover:border-[#DC3545]/40 hover:bg-gray-50"
//               aria-label="Zoom in"
//               title="Zoom in"
//             >
//               <Plus className="h-5 w-5" aria-hidden />
//             </button>
//             <button
//               type="button"
//               onClick={handleZoomOut}
//               className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 shadow-md transition-colors hover:border-[#DC3545]/40 hover:bg-gray-50"
//               aria-label="Zoom out"
//               title="Zoom out"
//             >
//               <Minus className="h-5 w-5" aria-hidden />
//             </button>
//             <button
//               type="button"
//               onClick={handleRecenterOnUser}
//               className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 shadow-md transition-colors hover:border-[#DC3545]/40 hover:bg-gray-50"
//               aria-label="Center map on your location"
//               title="Your location"
//             >
//               <LocateFixed className="h-5 w-5" aria-hidden />
//             </button>
//           </div>
//         </div>
//         {isInteractionLocked ? (
//           <div className="pointer-events-none absolute inset-0 z-[1250] flex items-center justify-center">
//             <span className="sr-only">Updating restaurants</span>
//             <div
//               className="h-9 w-9 rounded-full border-2 border-[#DC3545]/25 border-t-[#DC3545] shadow-sm animate-spin"
//               aria-hidden
//             />
//           </div>
//         ) : null}
//       </div>
//     </>
//   );
// }

// mapbox gl js code below new requiremet task

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { LocateFixed, Minus, Plus, X } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLocationConsent } from "@/components/location-consent-provider";
import { Button } from "@/components/ui/button";
import { DEFAULT_MAP_CENTER_LAT_LNG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  getStoredUserLatLng,
  persistUserLatLng,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/components/ui/use-mobile";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

type LatLng = { lat: number; lng: number };
type RestaurantMarker = {
  id: string;
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

function formatDistanceMiles(miles?: number): string {
  if (typeof miles !== "number" || !Number.isFinite(miles) || miles < 0)
    return "";
  return miles % 1 === 0 ? `${miles} mi` : `${miles.toFixed(1)} mi`;
}

export default function UserLocationMap({
  className,
  zoom = 6,
  restaurants = [],
  onViewDeal,
  isInteractionLocked = false,
  onVisibleRestaurantsChange,
  onClusterClick,
}: {
  className?: string;
  zoom?: number;
  restaurants?: RestaurantMarker[];
  onViewDeal?: (restaurantPathSegment: string, offerId?: string) => void;
  isInteractionLocked?: boolean;
  onVisibleRestaurantsChange?: (restaurantIds: string[]) => void;
  onClusterClick?: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const userRequestedRecenterRef = useRef(false);
  const skipFlyOnNextStorageSyncRef = useRef(false);
  const locationConsent = useLocationConsent();
  const [coords, setCoords] = useState<LatLng>({
    lat: DEFAULT_MAP_CENTER_LAT_LNG.lat,
    lng: DEFAULT_MAP_CENTER_LAT_LNG.lng,
  });
  const isMobile = useIsMobile();
  const [mapPopoverList, setMapPopoverList] = useState<MapPopoverState[]>([]);
  // No longer using popoverAnchor for sync
  const [portalReady, setPortalReady] = useState(false);
  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const isMapLoaded = useRef(false);
  const [isMapFullyLoaded, setIsMapFullyLoaded] = useState(false);

  const onVisibleRestaurantsChangeRef = useRef(onVisibleRestaurantsChange);
  onVisibleRestaurantsChangeRef.current = onVisibleRestaurantsChange;

  const onClusterClickRef = useRef(onClusterClick);
  onClusterClickRef.current = onClusterClick;

  const restaurantsRef = useRef(restaurants);
  restaurantsRef.current = restaurants;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("Mapbox token missing in environment variables. Set NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-2.0, 54.0], // Center of UK
      zoom: 5.5, // Frame the UK

      attributionControl: false,
      maxBounds: [[-8.7, 49.5], [1.95, 60.95]],
      minZoom: 5,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    const el = document.createElement("div");
    el.innerHTML = `<img src="/User-marker.svg" alt="User Location" style="width: 36px; height: 36px; drop-shadow: 0 4px 6px rgba(0,0,0,0.3);" />`;
    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);

    map.on("load", () => {
      isMapLoaded.current = true;
      setIsMapFullyLoaded(true);
      map.addSource("restaurants", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 18,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "restaurants-points",
        type: "circle",
        source: "restaurants",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 20, "circle-color": "transparent" },
      });

      map.addLayer({
        id: "restaurants-clusters",
        type: "circle",
        source: "restaurants",
        filter: ["has", "point_count"],
        paint: { "circle-radius": 20, "circle-color": "transparent" },
      });

      map.on("click", (e) => {
        setMapPopoverList([]);
        skipFlyOnNextStorageSyncRef.current = true;
        persistUserLatLng(e.lngLat.lat, e.lngLat.lng);
      });

      // const notifyVisible = () => {
      //   if (!onVisibleRestaurantsChangeRef.current) return;
      //   const bounds = map.getBounds();
      //   const visibleIds = restaurantsRef.current
      //     .filter((r) => typeof r.lat === "number" && typeof r.lng === "number" && bounds.contains([r.lng, r.lat]))
      //     .map((r) => r.id);
      //   onVisibleRestaurantsChangeRef.current(visibleIds);
      // };
      const notifyVisible = () => {
        if (!onVisibleRestaurantsChangeRef.current) return;

        const bounds = map.getBounds();
        if (!bounds) return;

        const visibleIds = restaurantsRef.current
          .filter(
            (r) =>
              typeof r.lat === "number" &&
              typeof r.lng === "number" &&
              bounds.contains([r.lng, r.lat])
          )
          .map((r) => r.id);

        onVisibleRestaurantsChangeRef.current(visibleIds);
      };
      map.on("moveend", notifyVisible);
      map.on("zoomend", notifyVisible);

      map.on("render", updateMarkers);
      updateSourceData();
      notifyVisible();
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      isMapLoaded.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    userMarkerRef.current?.setLngLat([coords.lng, coords.lat]);

    if (userRequestedRecenterRef.current) {
      userRequestedRecenterRef.current = false;
      const z = Math.max(map.getZoom(), 13);
      map.flyTo({ center: [coords.lng, coords.lat], zoom: z, duration: 1150 });
    }
    // Removed the else if (!isMapLoaded.current) map.setCenter(...) block 
    // to ensure the map stays perfectly centered on the UK on initial load.
  }, [coords, zoom]);

  const updateSourceData = () => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded.current) return;

    const validRestaurants = restaurants.filter(
      (r) =>
        typeof r.lat === "number" &&
        Number.isFinite(r.lat) &&
        typeof r.lng === "number" &&
        Number.isFinite(r.lng)
    );

    const features = validRestaurants.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
      properties: {
        id: r.id,
        restaurantData: JSON.stringify(r),
      },
    }));

    const source = map.getSource("restaurants") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: features as any,
      });

      // Removed auto fitBounds so the map starts at zoom 6 covering the UK,
      // instead of zooming in unpredictably based on filtered data.
    }
  };

  useEffect(() => {
    updateSourceData();
    setMapPopoverList((prev) => {
      if (prev.length === 0) return [];
      return prev.filter((p) => restaurants.some((r) => r.id === p.id));
    });
  }, [restaurants]);

  const updateMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded.current) return;
    const source = map.getSource("restaurants") as mapboxgl.GeoJSONSource;
    if (!source) return;

    const features = map.queryRenderedFeatures({ layers: ["restaurants-points", "restaurants-clusters"] });
    const newMarkers: { [key: string]: mapboxgl.Marker } = {};

    for (const feature of features) {
      // Auto fitBounds is disabled to ensure the map always loads showing the whole UK
      if (feature.geometry.type !== "Point") continue;
      const coords = feature.geometry.coordinates as [number, number];
      const props = feature.properties;
      if (!props) continue;
      const isCluster = props.cluster;

      let id = "";
      if (isCluster) {
        id = `cluster-${props.cluster_id}`;
      } else {
        id = `marker-${props.id}`;
      }

      let marker = markersRef.current[id];
      if (marker) {
        newMarkers[id] = marker;
        delete markersRef.current[id];
      } else {
        const el = document.createElement("div");
        el.className = "cursor-pointer transition-transform duration-200 hover:scale-110";

        if (isCluster) {
          const count = props.point_count;
          el.innerHTML = `<div style="background-color: #eb221c; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">${count}</div>`;

          el.onclick = (e) => {
            e.stopPropagation();
            source.getClusterExpansionZoom(props.cluster_id, (err, targetZoom) => {
              if (!err && targetZoom) {
                map.easeTo({ center: coords, zoom: targetZoom, duration: 800 });
              }
              if (onClusterClickRef.current) {
                onClusterClickRef.current();
              }
            });
          };
        } else {
          const restaurant = JSON.parse(props.restaurantData || "{}");
          el.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background: white; border: 3px solid #eb221c; box-shadow: 0 4px 6px rgba(0,0,0,0.3); overflow: hidden; position: relative;">
            <img src="${restaurant.imageUrl || "/placeholder.svg"}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/placeholder.svg'" />
          </div>`;

          el.onclick = (e) => {
            e.stopPropagation();
            setMapPopoverList([restaurant]);
            if (!isMobile) {
              // Pan to center the selected marker with a slight offset to accommodate the side panel
              map.easeTo({
                center: coords,
                offset: [130, 0], // Pan the map so marker moves to the right, leaving left side for the card
                duration: 500
              });
            }
          };
        }

        marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        newMarkers[id] = marker;
      }
    }

    for (const id in markersRef.current) {
      markersRef.current[id].remove();
    }
    markersRef.current = newMarkers;
  };

  // Removed legacy sync logic for desktop popover

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapPopoverList([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isInteractionLocked) setMapPopoverList([]);
  }, [isInteractionLocked]);

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
      const z = Math.max(map.getZoom(), zoom);
      map.flyTo({ center: [stored.lng, stored.lat], zoom: z, duration: 1150 });
      return;
    }

    userRequestedRecenterRef.current = true;
    setCoords(stored);
  };

  const popoverLayer =
    mapPopoverList.length > 0 && !isMobile
      ? (
          <div
            role="dialog"
            aria-labelledby="map-popover-restaurant-name"
            className="pointer-events-auto absolute left-4 top-4 z-[1200] w-[280px] rounded-xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-left-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMapPopoverList([])}
              className="absolute right-2 top-2 z-[1210] flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative h-[120px] w-full overflow-hidden rounded-t-xl bg-gray-100">
              <Image
                src={mapPopoverList[0].imageUrl || "/placeholder.svg"}
                alt={mapPopoverList[0].name}
                fill
                className="object-cover"
                sizes="280px"
              />
            </div>
            <div className="space-y-3 p-4">
              <h3
                id="map-popover-restaurant-name"
                className="line-clamp-2 text-base font-bold leading-snug text-gray-900"
              >
                {mapPopoverList[0].name}
                {mapPopoverList.length > 1 ? ` (+${mapPopoverList.length - 1} more)` : ""}
              </h3>
              <p className="line-clamp-2 text-sm leading-snug text-gray-600 font-medium">
                {mapPopoverList[0].offerSummary}
              </p>
              {formatDistanceMiles(mapPopoverList[0].distanceMiles) ? (
                <p className="text-sm font-semibold text-gray-500">
                  {formatDistanceMiles(mapPopoverList[0].distanceMiles)} away
                </p>
              ) : null}
              <Button
                type="button"
                className="w-full rounded-xl bg-[#eb221c] font-bold text-white hover:bg-[#eb221c]/90 h-10 mt-1"
                onClick={() => {
                  onViewDeal?.(
                    mapPopoverList[0].slug?.trim() || mapPopoverList[0].id,
                    mapPopoverList[0].firstOfferId,
                  );
                  setMapPopoverList([]);
                }}
              >
                View deal
              </Button>
            </div>
          </div>
      )
      : null;

  const mobileDrawer = isMobile && mapPopoverList.length > 0 ? (
    <Drawer open={mapPopoverList.length > 0} onOpenChange={(open) => { if (!open) setMapPopoverList([]); }}>
      <DrawerContent className="px-0 pb-24 pt-4 z-[9999]">
        <Carousel className="w-full" opts={{ loop: false, align: "start" }}>
          <CarouselContent className="ml-0">
            {mapPopoverList.map((mapPopover) => (
              <CarouselItem key={mapPopover.id} className="pl-4 basis-[85%]">
                <div className="flex flex-col gap-4 pr-4">
                  <div className="relative h-40 w-full overflow-hidden rounded-xl bg-gray-100">
                    <Image
                      src={mapPopover.imageUrl || "/placeholder.svg"}
                      alt={mapPopover.name}
                      fill
                      className="object-cover"
                      sizes="100vw"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                      {mapPopover.name}
                    </h3>
                    {formatDistanceMiles(mapPopover.distanceMiles) ? (
                      <p className="text-sm font-medium text-gray-500 mt-1">
                        {formatDistanceMiles(mapPopover.distanceMiles)} away
                      </p>
                    ) : null}
                    <p className="text-sm text-gray-700 mt-2 font-medium">
                      {mapPopover.offerSummary}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full rounded-xl bg-[#eb221c] font-bold text-white hover:bg-[#eb221c]/90 h-12 text-base mt-2"
                    onClick={() => {
                      onViewDeal?.(
                        mapPopover.slug?.trim() || mapPopover.id,
                        mapPopover.firstOfferId,
                      );
                      setMapPopoverList([]);
                    }}
                  >
                    View deal
                  </Button>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </DrawerContent>
    </Drawer>
  ) : null;

  return (
    <>
      {mobileDrawer}
      <div
        role="region"
        aria-label="Restaurant map"
        aria-busy={isInteractionLocked}
        className={cn("relative z-0 isolate h-full min-h-0 w-full", className)}
      >
        <div
          className={cn(
            "relative h-full min-h-0 w-full",
            isInteractionLocked && "pointer-events-none cursor-wait opacity-60",
          )}
        >
          {/* Skeleton Loader */}
          {!isMapFullyLoaded && (
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-[#E5E3DF] transition-opacity duration-300">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-[#eb221c]" />
              <p className="mt-4 text-sm font-medium text-gray-500">Loading map...</p>
            </div>
          )}

          {/* Map Container */}
          <div 
            ref={mapContainerRef} 
            className={cn(
              "h-full w-full transition-opacity duration-700 ease-in-out relative z-10",
              isMapFullyLoaded ? "opacity-100" : "opacity-0"
            )} 
          />
          {popoverLayer}
          <div
            className={cn(
              "pointer-events-none absolute z-[1200] flex flex-col gap-2",
              "right-3 top-[calc(8rem+env(safe-area-inset-top))] max-md:bottom-[calc(28dvh+env(safe-area-inset-bottom,0px))] max-md:justify-start",
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
        {isInteractionLocked && isMapFullyLoaded ? (
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
