export const OFFER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== ""
}

export function isOfferLive(offer: { starts_at: string | null; ends_at: string | null }, now: number) {
  if (!hasText(offer.starts_at)) return false
  const startsAt = Date.parse(offer.starts_at)
  if (Number.isNaN(startsAt) || startsAt > now) return false
  if (offer.ends_at === null || offer.ends_at === "") return true
  const endsAt = Date.parse(offer.ends_at)
  return !Number.isNaN(endsAt) && endsAt > now
}
