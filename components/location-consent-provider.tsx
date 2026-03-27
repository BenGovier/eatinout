"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import { WelcomeLocationModal } from "@/components/welcome-location-modal"
import {
  USER_LAT_LNG_SESSION_KEY,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session"

type LocationConsentContextValue = {
  /** Opens the location consent modal (e.g. from map control). */
  requestLocationModal: () => void
}

const LocationConsentContext =
  createContext<LocationConsentContextValue | null>(null)

export function useLocationConsent() {
  return useContext(LocationConsentContext)
}

const ALLOWED_ROUTE = "/restaurants"

export default function LocationConsentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const onRestaurantsListPage = pathname === ALLOWED_ROUTE

  const requestLocationModal = useCallback(() => {
    if (pathname !== ALLOWED_ROUTE) return
    setIsOpen(true)
  }, [pathname])

  const syncOpenFromStorage = useCallback(() => {
    try {
      if (pathname !== ALLOWED_ROUTE) {
        setIsOpen(false)
        return
      }
      setIsOpen(!sessionStorage.getItem(USER_LAT_LNG_SESSION_KEY))
    } catch {
      setIsOpen(false)
    }
  }, [pathname])

  // On /restaurants only: offer the location modal when nothing is stored (and on storage events).
  useEffect(() => {
    syncOpenFromStorage()
  }, [pathname, syncOpenFromStorage])

  useEffect(() => {
    window.addEventListener(USER_LOCATION_STORAGE_EVENT, syncOpenFromStorage)
    return () =>
      window.removeEventListener(USER_LOCATION_STORAGE_EVENT, syncOpenFromStorage)
  }, [syncOpenFromStorage])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const contextValue = useMemo<LocationConsentContextValue>(
    () => ({ requestLocationModal }),
    [requestLocationModal],
  )

  return (
    <LocationConsentContext.Provider value={contextValue}>
      {children}
      <WelcomeLocationModal
        isOpen={isOpen && onRestaurantsListPage}
        onClose={handleClose}
      />
    </LocationConsentContext.Provider>
  )
}

