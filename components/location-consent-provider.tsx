"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { MapLocationModal } from "@/components/map-location-modal";
import {
  USER_LAT_LNG_SESSION_KEY,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session";

type LocationConsentContextValue = {
  /** Opens the map GPS location modal (recenter control when no saved pin). */
  requestLocationModal: () => void;
};

const LocationConsentContext =
  createContext<LocationConsentContextValue | null>(null);

export function useLocationConsent() {
  return useContext(LocationConsentContext);
}

const MAP_PATH = "/map";

function isMapLocationRoute(pathname: string | null): boolean {
  return pathname === MAP_PATH;
}

export default function LocationConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const onMapRoute = isMapLocationRoute(pathname);

  const requestLocationModal = useCallback(() => {
    if (!isMapLocationRoute(pathname)) return;
    setIsOpen(true);
  }, [pathname]);

  const syncOpenFromStorage = useCallback(() => {
    try {
      if (!isMapLocationRoute(pathname)) {
        setIsOpen(false);
        return;
      }
      setIsOpen(!sessionStorage.getItem(USER_LAT_LNG_SESSION_KEY));
    } catch {
      setIsOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    syncOpenFromStorage();
  }, [pathname, syncOpenFromStorage]);

  useEffect(() => {
    window.addEventListener(USER_LOCATION_STORAGE_EVENT, syncOpenFromStorage);
    return () =>
      window.removeEventListener(
        USER_LOCATION_STORAGE_EVENT,
        syncOpenFromStorage,
      );
  }, [syncOpenFromStorage]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextValue = useMemo<LocationConsentContextValue>(
    () => ({ requestLocationModal }),
    [requestLocationModal],
  );

  return (
    <LocationConsentContext.Provider value={contextValue}>
      {children}
      <MapLocationModal isOpen={isOpen && onMapRoute} onClose={handleClose} />
    </LocationConsentContext.Provider>
  );
}
