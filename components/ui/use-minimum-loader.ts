"use client"

import { useState, useEffect } from "react"

const MINIMUM_LOADER_DURATION = 1400 // 1.4 seconds

/**
 * Hook to ensure a loader displays for a minimum duration.
 * 
 * Shows loader immediately on mount and for any loading state.
 * Keeps showing loader until BOTH:
 * 1. Minimum duration has passed since component mount
 * 2. Loading condition is false
 * 
 * @param isLoading - The actual loading state from auth/data
 * @param minimumDuration - Optional custom duration in ms (default: 1400ms)
 * @returns boolean - Whether to show the loader
 */
export function useMinimumLoader(
  isLoading: boolean,
  minimumDuration: number = MINIMUM_LOADER_DURATION
): boolean {
  // Start with minimum time NOT elapsed - loader shows immediately
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    // Set timer on mount to mark minimum duration as elapsed
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, minimumDuration)

    return () => clearTimeout(timer)
  }, [minimumDuration])

  // Show loader if either:
  // 1. Minimum time hasn't elapsed yet, OR
  // 2. Still actively loading
  return !minTimeElapsed || isLoading
}
