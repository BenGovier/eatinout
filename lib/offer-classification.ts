export const OFFER_CLASSIFICATIONS = ["exclusive", "existing"] as const;
export type OfferClassification = (typeof OFFER_CLASSIFICATIONS)[number];

export const WALLET_ENTRY_KINDS = ["voucher", "saved_offer"] as const;
export type WalletEntryKind = (typeof WALLET_ENTRY_KINDS)[number];

export const SAVED_OFFER_STATUS = "saved";

// Missing or unknown values fall back to "exclusive", which matches the
// database default and keeps every pre-existing offer behaving as before.
export function normalizeOfferClassification(value: unknown): OfferClassification {
  return value === "existing" ? "existing" : "exclusive";
}

export function isExistingOffer(offer: { offer_classification?: unknown } | null | undefined) {
  return normalizeOfferClassification(offer?.offer_classification) === "existing";
}

export function parseOfferClassificationInput(
  value: unknown
): { ok: true; value: OfferClassification } | { ok: false } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: "exclusive" };
  }
  if (typeof value === "string" && (OFFER_CLASSIFICATIONS as readonly string[]).includes(value)) {
    return { ok: true, value: value as OfferClassification };
  }
  return { ok: false };
}

export function isSavedOfferEntry(entry: { entry_kind?: unknown } | null | undefined) {
  return entry?.entry_kind === "saved_offer";
}

export const OFFER_CLASSIFICATION_LABELS: Record<OfferClassification, string> = {
  exclusive: "EatinOut Exclusive",
  existing: "Existing restaurant offer",
};
