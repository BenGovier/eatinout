"use client"

import { useState, useEffect } from "react"

const MINIMUM_LOADER_DURATION = 1400 // 1.4 seconds

/**
 * Hook to ensure a loader displays for a minimum duration.
 * 
 * Shows loader:
 * 1. Always for the first `minimumDuration` milliseconds from mount
 * 2. After that, continues showing if `isLoading` is still true
 * 
 * This ensures users see the branded loader for at least 1.4s,
 * but doesn't hide content prematurely if actual loading is still in progress.
 * 
 * @param isLoading - The actual loading state from auth/data
 * @param minimumDuration - Optional custom duration in ms (default: 1400ms)
 * @returns boolean - Whether to show the loader
 */
export function useMinimumLoader(
  isLoading: boolean,
  minimumDuration: number = MINIMUM_LOADER_DURATION
): boolean {
  // Track whether minimum time has elapsed
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    // Timer to mark minimum duration as complete
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, minimumDuration)

    return () => clearTimeout(timer)
  }, [minimumDuration])

  // Show loader if:
  // 1. Minimum time hasn't elapsed yet, OR
  // 2. Still actively loading after minimum time
  return !minTimeElapsed || isLoading
}
