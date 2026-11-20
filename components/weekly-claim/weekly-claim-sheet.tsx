"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/components/ui/use-mobile"
import { getUseByParts } from "@/lib/voucher-expiry-format"
import type { ClaimPreview, ClaimPreviewStatus } from "./types"

export type SheetPhase = "ready" | "refreshing" | "submitting"

interface WeeklyClaimSheetProps {
  open: boolean
  preview: ClaimPreview | null
  phase: SheetPhase
  notice: string | null
  onConfirm: () => void
  onDismiss: () => void
}

const STATUS_COPY: Record<Exclude<ClaimPreviewStatus, "available">, { title: string; body: string }> = {
  claims_closed: {
    title: "Weekly vouchers are paused",
    body: "Claims are temporarily unavailable. Please try again shortly.",
  },
  offer_unavailable: {
    title: "Not available right now",
    body: "This offer isn't currently available to claim.",
  },
  offer_expired: {
    title: "This offer has ended",
    body: "It can no longer be claimed.",
  },
  already_claimed: {
    title: "Already in your wallet",
    body: "You've claimed this voucher for this week.",
  },
  sold_out: {
    title: "All claimed this week",
    body: "Every voucher has gone. More are released on Monday.",
  },
}

function SheetBody({
  preview,
  phase,
  notice,
  onConfirm,
  onDismiss,
  Title,
  Description,
}: Omit<WeeklyClaimSheetProps, "open"> & {
  Title: typeof DialogTitle | typeof DrawerTitle
  Description: typeof DialogDescription | typeof DrawerDescription
}) {
  if (!preview) return null

  const status = preview.status
  const available = status === "available"
  const useBy = getUseByParts(preview.voucherExpiresAt)
  const submitting = phase === "submitting"
  const refreshing = phase === "refreshing"
  const statusCopy = available ? null : STATUS_COPY[status]

  return (
    <div className="flex flex-col px-6 pb-6 pt-5 sm:px-0 sm:pb-0 sm:pt-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        Exclusive offer
      </p>
      <Title className="mt-2 text-2xl font-bold leading-tight text-dark-ink text-balance text-left">
        {preview.offer.title}
      </Title>
      {preview.offer.restaurantName && (
        <p className="mt-1 text-base text-muted-foreground">{preview.offer.restaurantName}</p>
      )}

      {available && useBy ? (
        <>
          <div className="mt-6 border-t border-lines pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Use by
            </p>
            <p className="mt-1.5 text-xl font-bold text-dark-ink">
              {useBy.isToday ? "Today" : useBy.day}
            </p>
            <p className="text-xl font-bold text-primary">{useBy.time}</p>
          </div>
          <Description className="mt-4 text-sm leading-relaxed text-muted-foreground text-left">
            {useBy.isToday
              ? "This voucher expires tonight. Only claim it if you plan to use it today."
              : "This voucher expires at the end of the week. Only claim it if you plan to use it."}
          </Description>
        </>
      ) : (
        statusCopy && (
          <div className="mt-6 border-t border-lines pt-5">
            <p className="text-lg font-bold text-dark-ink">{statusCopy.title}</p>
            <Description className="mt-1 text-sm leading-relaxed text-muted-foreground text-left">
              {statusCopy.body}
            </Description>
          </div>
        )
      )}

      <p role="status" aria-live="polite" className="mt-3 min-h-0 text-sm font-medium text-primary empty:hidden">
        {notice ?? ""}
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        {available ? (
          <>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={submitting || refreshing || !preview.claimToken}
              aria-busy={submitting}
              className="h-12 w-full rounded-lg bg-primary text-base font-bold text-white shadow-[0_4px_14px_rgba(227,30,36,0.25)] hover:bg-primary/90"
            >
              {submitting || refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {submitting ? "Claiming..." : "Checking..."}
                </>
              ) : (
                "Claim voucher"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDismiss}
              disabled={submitting}
              className="h-12 w-full rounded-lg text-base font-semibold text-dark-ink"
            >
              Not now
            </Button>
          </>
        ) : status === "already_claimed" ? (
          <>
            <Button asChild className="h-12 w-full rounded-lg bg-primary text-base font-bold text-white hover:bg-primary/90">
              <Link href="/wallet">Go to wallet</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDismiss}
              className="h-12 w-full rounded-lg text-base font-semibold text-dark-ink"
            >
              Close
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onDismiss}
            className="h-12 w-full rounded-lg border-lines text-base font-semibold text-dark-ink"
          >
            Close
          </Button>
        )}
      </div>
    </div>
  )
}

export function WeeklyClaimSheet(props: WeeklyClaimSheetProps) {
  const isMobile = useIsMobile()
  const { open, phase, onDismiss } = props

  const handleOpenChange = (next: boolean) => {
    if (!next && phase !== "submitting") onDismiss()
  }

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        shouldScaleBackground={false}
        dismissible={phase !== "submitting"}
      >
        <DrawerContent className="mx-auto max-w-lg rounded-t-2xl border-lines bg-white pb-[env(safe-area-inset-bottom)]">
          <SheetBody {...props} Title={DrawerTitle} Description={DrawerDescription} />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-lines bg-white p-8">
        <SheetBody {...props} Title={DialogTitle} Description={DialogDescription} />
      </DialogContent>
    </Dialog>
  )
}
