export type ClaimPreviewStatus =
  | "available"
  | "claims_closed"
  | "offer_unavailable"
  | "offer_expired"
  | "already_claimed"
  | "sold_out"

export interface ClaimPreview {
  status: ClaimPreviewStatus
  cutoverActive: boolean
  offer: {
    id: string
    title: string
    restaurantId: string | null
    restaurantName: string | null
  }
  remaining: number
  period: { start: string; end: string }
  voucherExpiresAt: string
  claimToken: string | null
  claimTokenExpiresAt: string | null
}

export interface ClaimHandlers {
  // The existing, unchanged claim path for every non-weekly offer and for
  // weekly offers before the V2 cutover.
  onLegacyClaim: (offerId: string, restaurantId?: string) => unknown
  onClaimed: () => void
}
