"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import { WeeklyClaimSheet, type SheetPhase } from "./weekly-claim-sheet"
import type { ClaimHandlers, ClaimPreview, ClaimPreviewStatus } from "./types"

type PreviewOutcome =
  | { kind: "legacy" }
  | { kind: "unavailable" }
  | { kind: "preview"; preview: ClaimPreview }

const TERMINAL_CODES: ReadonlySet<string> = new Set<ClaimPreviewStatus>([
  "claims_closed",
  "offer_unavailable",
  "offer_expired",
  "already_claimed",
  "sold_out",
])

// Refresh shortly before the signed confirmation lapses so a slow decision
// never ends in a rejected claim.
const TOKEN_REFRESH_MARGIN_MS = 15_000

async function fetchClaimPreview(offerId: string): Promise<PreviewOutcome> {
  let res: Response
  try {
    res = await fetch(`/api/wallet/claim-preview?offerId=${encodeURIComponent(offerId)}`, {
      cache: "no-store",
    })
  } catch {
    // The server still rejects unconfirmed weekly claims after cutover.
    return { kind: "legacy" }
  }
  if (res.status === 503) return { kind: "unavailable" }
  if (!res.ok) return { kind: "legacy" }

  const data = (await res.json().catch(() => null)) as ClaimPreview | null
  if (!data || data.cutoverActive !== true) return { kind: "legacy" }
  return { kind: "preview", preview: data }
}

interface SheetState {
  open: boolean
  offerId: string | null
  restaurantId?: string
  preview: ClaimPreview | null
  phase: SheetPhase
  notice: string | null
}

const CLOSED: SheetState = {
  open: false,
  offerId: null,
  preview: null,
  phase: "ready",
  notice: null,
}

export function useWeeklyClaim() {
  const [sheet, setSheet] = useState<SheetState>(CLOSED)
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null)
  const checkingRef = useRef(false)
  const submittingRef = useRef(false)
  const handlersRef = useRef<ClaimHandlers | null>(null)
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet

  const markUnavailable = (preview: ClaimPreview | null, status: ClaimPreviewStatus) =>
    preview ? { ...preview, status, claimToken: null, claimTokenExpiresAt: null } : null

  const refreshPreview = useCallback(async (notice: string | null) => {
    const { offerId, preview } = sheetRef.current
    if (!offerId) return
    setSheet((s) => ({ ...s, phase: "refreshing" }))
    const outcome = await fetchClaimPreview(offerId)
    if (sheetRef.current.offerId !== offerId) return

    if (outcome.kind === "preview") {
      setSheet((s) => ({ ...s, preview: outcome.preview, phase: "ready", notice }))
    } else if (outcome.kind === "unavailable") {
      setSheet((s) => ({ ...s, preview: markUnavailable(preview, "claims_closed"), phase: "ready", notice: null }))
    } else {
      setSheet(CLOSED)
      toast.error("This offer has changed. Please try again.")
    }
  }, [])

  const requestClaim = useCallback(
    async (offerId: string, restaurantId: string | undefined, handlers: ClaimHandlers) => {
      if (checkingRef.current || submittingRef.current || sheetRef.current.open) return
      checkingRef.current = true
      setPendingOfferId(offerId)
      try {
        const outcome = await fetchClaimPreview(offerId)
        if (outcome.kind === "legacy") {
          await handlers.onLegacyClaim(offerId, restaurantId)
          return
        }
        if (outcome.kind === "unavailable") {
          toast.error("Weekly vouchers are temporarily unavailable. Please try again shortly.")
          return
        }
        handlersRef.current = handlers
        setSheet({
          open: true,
          offerId,
          restaurantId,
          preview: outcome.preview,
          phase: "ready",
          notice: null,
        })
      } finally {
        checkingRef.current = false
        setPendingOfferId(null)
      }
    },
    []
  )

  const dismiss = useCallback(() => {
    if (submittingRef.current) return
    setSheet(CLOSED)
  }, [])

  const confirm = useCallback(async () => {
    const { offerId, restaurantId, preview } = sheetRef.current
    if (submittingRef.current || !offerId || !preview?.claimToken || preview.status !== "available") return
    submittingRef.current = true
    setSheet((s) => ({ ...s, phase: "submitting", notice: null }))

    let refreshNotice: string | null = null
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          offerRestaurantId: restaurantId,
          claimToken: preview.claimToken,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setSheet(CLOSED)
        handlersRef.current?.onClaimed()
        return
      }

      const code: string | undefined = data?.code
      if (code === "preview_expired") {
        refreshNotice = "We've refreshed the details. Please confirm again."
      } else if (code === "period_changed") {
        refreshNotice = "A new voucher week has started. Please check the new date."
      } else if (code && TERMINAL_CODES.has(code)) {
        setSheet((s) => ({
          ...s,
          preview: markUnavailable(s.preview, code as ClaimPreviewStatus),
          phase: "ready",
        }))
      } else if (res.status === 403) {
        setSheet(CLOSED)
        toast.error(data?.error === "Only users can redeem offers" ? "Only users can add offers to wallet" : data?.error || "You can't claim this voucher.")
      } else if (code === "not_weekly_limited") {
        setSheet(CLOSED)
        toast.error("This offer has changed. Please try again.")
      } else {
        setSheet((s) => ({ ...s, phase: "ready" }))
        toast.error(data?.message || data?.error || "Couldn't claim this voucher. Please try again.")
      }
    } catch {
      setSheet((s) => ({ ...s, phase: "ready" }))
      toast.error("Couldn't claim this voucher. Please check your connection and try again.")
    } finally {
      submittingRef.current = false
    }

    if (refreshNotice) await refreshPreview(refreshNotice)
  }, [refreshPreview])

  // Re-check when the confirmation token is about to lapse or the week rolls
  // over while the sheet is open. This only refreshes; it never claims.
  useEffect(() => {
    const { open, preview, phase } = sheet
    if (!open || phase !== "ready" || !preview || preview.status !== "available") return

    const now = Date.now()
    const tokenDeadline = preview.claimTokenExpiresAt
      ? Date.parse(preview.claimTokenExpiresAt) - TOKEN_REFRESH_MARGIN_MS
      : Infinity
    const weekEnd = Date.parse(preview.period.end)
    const voucherEnd = Date.parse(preview.voucherExpiresAt)
    const deadline = Math.min(tokenDeadline, weekEnd, voucherEnd)
    if (!Number.isFinite(deadline)) return

    const timer = setTimeout(() => {
      if (submittingRef.current) return
      const rolledOver = Date.now() >= Math.min(weekEnd, voucherEnd)
      refreshPreview(rolledOver ? "A new voucher week has started. Please check the new date." : null)
    }, Math.max(0, deadline - now))
    return () => clearTimeout(timer)
  }, [sheet, refreshPreview])

  const confirmation = (
    <WeeklyClaimSheet
      open={sheet.open}
      preview={sheet.preview}
      phase={sheet.phase}
      notice={sheet.notice}
      onConfirm={confirm}
      onDismiss={dismiss}
    />
  )

  return { requestClaim, pendingOfferId, confirmation }
}
