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
import { WelcomeLocationModal } from "@/components/welcome-location-modal";
import {
  USER_LAT_LNG_SESSION_KEY,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session";

type LocationConsentContextValue = {
  /** Opens the location consent modal (e.g. from map control). */
  requestLocationModal: () => void;
};

const LocationConsentContext =
  createContext<LocationConsentContextValue | null>(null);

export function useLocationConsent() {
  return useContext(LocationConsentContext);
}

const RESTAURANTS_LIST_PATH = "/restaurants";
const JOIN_RESTAURANT_PATH = "/join-restaurant";
const DASHBOARD_RESTAURANT_CREATE_PATH = "/dashboard/restaurant/create";

function isLocationModalRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (
    pathname === RESTAURANTS_LIST_PATH ||
    pathname === JOIN_RESTAURANT_PATH ||
    pathname === DASHBOARD_RESTAURANT_CREATE_PATH
  ) {
    return true;
  }
  if (pathname.startsWith("/dashboard/restaurant/edit/")) return true;
  return false;
}

export default function LocationConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const onLocationModalRoute = isLocationModalRoute(pathname);

  const requestLocationModal = useCallback(() => {
    if (!isLocationModalRoute(pathname)) return;
    setIsOpen(true);
  }, [pathname]);

  const syncOpenFromStorage = useCallback(() => {
    try {
      if (!isLocationModalRoute(pathname)) {
        setIsOpen(false);
        return;
      }
      // Auto-prompt only on the main restaurants list, not on join flow (button opens modal there).
      if (pathname === RESTAURANTS_LIST_PATH) {
        setIsOpen(!sessionStorage.getItem(USER_LAT_LNG_SESSION_KEY));
      } else {
        setIsOpen(false);
      }
    } catch {
      setIsOpen(false);
    }
  }, [pathname]);

  // On /restaurants: offer the location modal when nothing is stored (and on storage events).
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
      <WelcomeLocationModal
        isOpen={isOpen && onLocationModalRoute}
        onClose={handleClose}
      />
    </LocationConsentContext.Provider>
  );
}
