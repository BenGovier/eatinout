import { useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface ScrollPosition {
  y: number
  timestamp: number
  pathname: string
  pageState?: {
    currentPage: number
    totalItems: number
  }
}

const SCROLL_STORAGE_KEY = 'restaurants_scroll_position'
const RESTORATION_TIMEOUT = 100
const MAX_RESTORATION_ATTEMPTS = 50
const SCROLL_POSITION_EXPIRY = 5 * 60 * 1000 // 5 minutes

export function useScrollPreservation() {
  const router = useRouter()
  const pathname = usePathname()
  const restorationTimeoutRef = useRef<any>(null)
  const attemptCountRef = useRef(0)

  // Save current scroll position with optional page state
  const saveScrollPosition = useCallback((pageState?: { currentPage: number; totalItems: number }) => {
    const scrollY = window.scrollY
    const scrollData: ScrollPosition = {
      y: scrollY,
      timestamp: Date.now(),
      pathname: pathname,
      pageState: pageState
    }
    
    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollData))
      console.log('Scroll position saved:', scrollY, pageState)
    } catch (error) {
      console.warn('Failed to save scroll position:', error)
    }
  }, [pathname])

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY)
      if (!stored) return

      const scrollData: ScrollPosition = JSON.parse(stored)
      
      // Check if the scroll position is expired
      if (Date.now() - scrollData.timestamp > SCROLL_POSITION_EXPIRY) {
        sessionStorage.removeItem(SCROLL_STORAGE_KEY)
        return
      }

      // Only restore if returning to the same pathname
      if (scrollData.pathname !== pathname) {
        return
      }

      const targetScrollY = scrollData.y
      
      // Clear any existing timeout
      if (restorationTimeoutRef.current) {
        clearTimeout(restorationTimeoutRef.current)
      }

      // Reset attempt counter
      attemptCountRef.current = 0

      const attemptRestore = () => {
        const documentHeight = document.documentElement.scrollHeight
        const windowHeight = window.innerHeight
        const maxScrollY = documentHeight - windowHeight

        // If we can scroll to the target position, do it
        if (maxScrollY >= targetScrollY || attemptCountRef.current >= MAX_RESTORATION_ATTEMPTS) {
          window.scrollTo({
            top: Math.min(targetScrollY, maxScrollY),
            behavior: 'auto' // Use 'auto' for instant scroll, 'smooth' for animated
          })
          
          // Clean up
          sessionStorage.removeItem(SCROLL_STORAGE_KEY)
          console.log('Scroll position restored:', Math.min(targetScrollY, maxScrollY))
          return
        }

        // If document height is insufficient, wait and try again
        attemptCountRef.current++
        restorationTimeoutRef.current = setTimeout(attemptRestore, RESTORATION_TIMEOUT)
      }

      // Start restoration attempts
      attemptRestore()
    } catch (error) {
      console.warn('Failed to restore scroll position:', error)
      // Clean up on error
      try {
        sessionStorage.removeItem(SCROLL_STORAGE_KEY)
      } catch {}
    }
  }, [pathname])

  // Clear scroll position (call this when you don't want to restore)
  const clearScrollPosition = useCallback(() => {
    try {
      sessionStorage.removeItem(SCROLL_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear scroll position:', error)
    }
  }, [])

  // Handle navigation away from page
  const handleNavigation = useCallback((href: string, pageState?: { currentPage: number; totalItems: number }) => {
    saveScrollPosition(pageState)
    router.push(href)
  }, [saveScrollPosition, router])
  
  // Get saved page state
  const getSavedPageState = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY)
      if (!stored) return null

      const scrollData: ScrollPosition = JSON.parse(stored)
      
      // Check if the scroll position is expired
      if (Date.now() - scrollData.timestamp > SCROLL_POSITION_EXPIRY) {
        sessionStorage.removeItem(SCROLL_STORAGE_KEY)
        return null
      }

      // Only return if returning to the same pathname
      if (scrollData.pathname !== pathname) {
        return null
      }

      return scrollData.pageState || null
    } catch (error) {
      console.warn('Failed to get saved page state:', error)
      return null
    }
  }, [pathname])

  // Set up scroll restoration on page load
  useEffect(() => {
    // Small delay to ensure the page is rendered
    const timer = setTimeout(() => {
      restoreScrollPosition()
    }, 50)

    return () => {
      clearTimeout(timer)
      if (restorationTimeoutRef.current) {
        clearTimeout(restorationTimeoutRef.current)
      }
    }
  }, [restoreScrollPosition])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (restorationTimeoutRef.current) {
        clearTimeout(restorationTimeoutRef.current)
      }
    }
  }, [])

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
    handleNavigation,
    getSavedPageState
  }
}
