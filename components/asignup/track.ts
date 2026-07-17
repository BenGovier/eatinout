// Lightweight click tracking for the /asignup landing page.
// Pushes events to the existing Google Tag Manager dataLayer (GTM-KR2NK8KD).
// No new dependencies — safe no-op if GTM/dataLayer is unavailable.
export function trackAsignupEvent(event: string) {
    if (typeof window === "undefined") return
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] }
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({ event })
}
