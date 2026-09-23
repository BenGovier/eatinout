"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ModalImageWithHotspots, type Hotspot } from "@/components/prototypes/eatinout-exit-demo/image-hotspot"

const ASSET = "/design/checkout-exit-demo/eatinout_checkout_exit_modal_exact.png"

export function CheckoutExitGuard({ active = true }: { active?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const guardActiveRef = useRef(false)

  // Push a dummy history entry so the browser Back button triggers a
  // popstate we can intercept, instead of navigating away immediately.
  useEffect(() => {
    if (!active) return
    window.history.pushState({ checkoutGuard: true }, "")
    guardActiveRef.current = true

    const handlePopState = () => {
      if (!guardActiveRef.current) return
      window.history.pushState({ checkoutGuard: true }, "")
      setOpen(true)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [active])

  // Native browser confirmation for tab close / refresh (cannot be
  // custom-styled — browsers restrict this by design).
  useEffect(() => {
    if (!active) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [active])

  useEffect(() => {
    if (!open) return
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(r)
  }, [open])

  useEffect(() => {
    if (open) dialogRef.current?.focus()
  }, [open])

  const continueCheckout = useCallback(() => {
    setEntered(false)
    setOpen(false)
  }, [])

  const leaveCheckout = useCallback(() => {
    guardActiveRef.current = false
    router.push("/restaurants")
  }, [router])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        continueCheckout()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, continueCheckout])

  const hotspots: Hotspot[] = [
    { id: "close", label: "Continue checkout", top: 3.0, left: 84.5, width: 10, height: 7, onClick: continueCheckout },
    { id: "cta", label: "Continue and start my free trial", top: 57.8, left: 6.5, width: 87, height: 8, onClick: continueCheckout },
    { id: "leave", label: "No thanks, leave checkout", top: 67.8, left: 31, width: 38, height: 4.5, onClick: leaveCheckout },
  ]

  if (!open) return null

  return (
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
  )
}