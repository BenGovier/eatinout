import { getSafeReturnUrl } from "@/lib/safe-return-url"

type AppRouter = { replace: (href: string, options?: { scroll?: boolean }) => void }

const ORIGIN_MARKER = "__eatinoutCheckoutOrigin"
const ORIGIN_PENDING_KEY = "checkoutHistoryOriginPending"
const FALLBACK_URL = "/restaurants"

let checkoutEntryIndex: number | null = null
let leavingCheckout = false

/**
 * Called on the page that opens checkout, immediately before `router.push("/checkout")`.
 * Tags the current history entry so an abandoned checkout can rewind to it
 * instead of pushing a duplicate page on top of `/checkout`.
 */
export function markCheckoutOrigin() {
  try {
    window.history.replaceState({ ...(window.history.state ?? {}), [ORIGIN_MARKER]: true }, "")
    sessionStorage.setItem(ORIGIN_PENDING_KEY, "1")
  } catch {}
}

/**
 * Called once when checkout mounts, before any guard entry is pushed.
 * Records where the `/checkout` entry sits; only valid when checkout was
 * opened via `markCheckoutOrigin` (refreshes and direct visits are ignored).
 */
export function registerCheckoutEntry() {
  leavingCheckout = false
  try {
    const pending = sessionStorage.getItem(ORIGIN_PENDING_KEY) === "1"
    sessionStorage.removeItem(ORIGIN_PENDING_KEY)
    checkoutEntryIndex = pending ? window.history.length - 1 : null
  } catch {
    checkoutEntryIndex = null
  }
}

export function isLeavingCheckout() {
  return leavingCheckout
}

/**
 * Leaves an abandoned checkout without leaving `/checkout` as the next Back
 * destination. Rewinds to the tagged origin entry when possible, otherwise
 * replaces the current entry with the return URL.
 */
export function leaveCheckout(router: AppRouter, returnUrl: string) {
  const target = getSafeReturnUrl(returnUrl, FALLBACK_URL)
  leavingCheckout = true

  const steps = checkoutEntryIndex === null ? 0 : window.history.length - checkoutEntryIndex
  checkoutEntryIndex = null

  if (steps < 1) {
    router.replace(target)
    return
  }

  const onPopState = () => {
    window.removeEventListener("popstate", onPopState)
    const landedOnOrigin = !!window.history.state?.[ORIGIN_MARKER]
    const current = window.location.pathname + window.location.search + window.location.hash
    if (!landedOnOrigin || current !== target) router.replace(target, { scroll: false })
  }
  window.addEventListener("popstate", onPopState)
  window.history.go(-steps)
}
