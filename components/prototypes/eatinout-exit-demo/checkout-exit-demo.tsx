"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EatinOutCheckoutPrototype } from "@/components/prototypes/eatinout-checkout/eatinout-checkout-prototype"
import { ModalImageWithHotspots, type Hotspot } from "./image-hotspot"

const ASSET = "/design/checkout-exit-demo/eatinout_checkout_exit_modal_exact.png"

/**
 * Isolated exit-intent demo. The existing Stripe checkout prototype is shown
 * underneath (unmodified, read-only) so the interception clearly reads as
 * "you were leaving payment". The approved modal artwork is the supplied PNG —
 * it is never recreated in HTML; invisible hotspots sit over the baked-in
 * controls. One intercept per page load, mirroring the intended production
 * behaviour. Nothing here touches live checkout, Stripe, auth or history.
 */
export function CheckoutExitDemo() {
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)
  const [exited, setExited] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const shownRef = useRef(false)

  // Show the intercept automatically, exactly once per page load.
  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    setOpen(true)

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    if (prefersReduced) {
      setEntered(true)
    } else {
      // Two frames so the initial (hidden) state paints before we animate in.
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
      return () => cancelAnimationFrame(r)
    }
  }, [])

  // Lock background scrolling while the intercept is visible.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Move focus into the dialog when it opens.
  useEffect(() => {
    if (open) dialogRef.current?.focus()
  }, [open])

  // Primary CTA: dismiss and reveal the checkout exactly as it was.
  const continueTrial = useCallback(() => {
    setOpen(false)
  }, [])

  // X or "No thanks, leave checkout": simulate a genuine exit. Do not trap,
  // do not reopen.
  const leaveCheckout = useCallback(() => {
    setOpen(false)
    setExited(true)
  }, [])

  // Escape leaves; Tab is trapped within the dialog for accessibility.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        leaveCheckout()
        return
      }
      if (event.key !== "Tab") return
      const root = dialogRef.current
      if (!root) return
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, leaveCheckout])

  const hotspots: Hotspot[] = [
    { id: "close", label: "Leave checkout", top: 3.0, left: 84.5, width: 10, height: 7, onClick: leaveCheckout },
    {
      id: "cta",
      label: "Continue and start my free trial",
      top: 57.8,
      left: 6.5,
      width: 87,
      height: 8,
      onClick: continueTrial,
    },
    {
      id: "leave",
      label: "No thanks, leave checkout",
      top: 67.8,
      left: 31,
      width: 38,
      height: 4.5,
      onClick: leaveCheckout,
    },
  ]

  return (
    <>
      {/* Existing checkout prototype, shown unmodified underneath. */}
      <EatinOutCheckoutPrototype />

      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-150 ease-out motion-reduce:transition-none"
          style={{
            background: "rgba(18, 17, 16, 0.72)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            opacity: entered ? 1 : 0,
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Before you go — your 30-day free trial is ready"
            tabIndex={-1}
            className="outline-none transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0) scale(1)" : "translateY(4px) scale(0.985)",
            }}
          >
            <ModalImageWithHotspots
              src={ASSET}
              alt="Before you go — still thinking? Your 30-day free trial is ready. £0 today, up to 50% off at 500+ places. Continue to start your free trial, or leave checkout."
              width={648}
              height={970}
              hotspots={hotspots}
            />
          </div>
        </div>
      ) : null}

      {exited ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[9998] -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-medium text-white shadow-lg"
          style={{ background: "rgba(18, 17, 16, 0.9)" }}
        >
          Demo: checkout exit allowed.
        </div>
      ) : null}
    </>
  )
}
