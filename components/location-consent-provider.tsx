"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { WelcomeLocationModal } from "@/components/welcome-location-modal"
import {
  USER_LAT_LNG_SESSION_KEY,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session"

export default function LocationConsentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const syncOpenFromStorage = useCallback(() => {
    try {
      setIsOpen(!sessionStorage.getItem(USER_LAT_LNG_SESSION_KEY))
    } catch {
      setIsOpen(false)
    }
  }, [])

  // Whenever there is no stored location, the app should offer the location modal
  // (including after client navigation or when storage is cleared on sign-out).
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

  return (
    <>
      {children}
      <WelcomeLocationModal isOpen={isOpen} onClose={handleClose} />
    </>
  )
}

