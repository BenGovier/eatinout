import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Exact database names, verified against the installed SQL definitions.
export const DB = {
  claimFn: "claim_weekly_voucher",
  revealFn: "reveal_weekly_voucher_code",
  weekBoundsFn: "london_week_bounds",
  availabilityView: "weekly_offer_availability",
  settingsTable: "voucher_settings",
} as const;

export type ClaimResult =
  | "claimed"
  | "bad_request"
  | "claims_closed"
  | "not_found"
  | "not_weekly_limited"
  | "offer_unavailable"
  | "offer_expired"
  | "period_changed"
  | "preview_expired"
  | "already_claimed"
  | "sold_out";

export type RevealResult =
  | "revealed"
  | "bad_request"
  | "not_found"
  | "not_weekly_limited"
  | "retired"
  | "expired"
  | "already_revealed"
  | "used";

export const CLAIM_TOKEN_TTL_SECONDS = 10 * 60;
const CLAIM_TOKEN_AUDIENCE = "eatinout:weekly-claim";
const CLAIM_TOKEN_ISSUER = "eatinout:claim-preview";

export interface AuthenticatedCustomer {
  userId: string;
}

export type CustomerAuthResult =
  | { ok: true; customer: AuthenticatedCustomer }
  | { ok: false; status: 401 | 403; error: string };

export async function getAuthenticatedCustomer(): Promise<CustomerAuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return { ok: false, status: 401, error: "Authentication token required" };
  }

  let decoded: { userId?: string; role?: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId?: string;
      role?: string;
    };
  } catch {
    return { ok: false, status: 401, error: "Invalid authentication token" };
  }

  if (!decoded.userId) {
    return { ok: false, status: 401, error: "Invalid authentication token" };
  }
  if (decoded.role !== "user") {
    return { ok: false, status: 403, error: "Only users can redeem offers" };
  }
  return { ok: true, customer: { userId: decoded.userId } };
}

interface WeeklyOfferFields {
  recurring_type?: string | null;
  max_redemption_limit?: number | null;
  is_unlimited?: boolean | null;
}

export function isWeeklyLimitedOffer(offer: WeeklyOfferFields): boolean {
  return (
    offer.recurring_type === "weekly" &&
    !offer.is_unlimited &&
    typeof offer.max_redemption_limit === "number" &&
    offer.max_redemption_limit > 0
  );
}

export interface VoucherSettings {
  weeklyClaimsEnabled: boolean;
  weeklyV2StartsAt: Date;
}

export async function getVoucherSettings(): Promise<VoucherSettings | null> {
  const { data, error } = await supabaseAdmin
    .from(DB.settingsTable)
    .select("weekly_claims_enabled, weekly_v2_starts_at")
    .eq("id", true)
    .maybeSingle();

  if (error || !data || !data.weekly_v2_starts_at) {
    if (error) console.error("Error reading voucher_settings:", error);
    return null;
  }
  return {
    weeklyClaimsEnabled: data.weekly_claims_enabled === true,
    weeklyV2StartsAt: new Date(data.weekly_v2_starts_at),
  };
}

export function hasWeeklyV2CutoverBegun(settings: VoucherSettings, now = new Date()) {
  return now.getTime() >= settings.weeklyV2StartsAt.getTime();
}

export interface WeekBounds {
  periodStart: string;
  periodEnd: string;
}

export async function getLondonWeekBounds(): Promise<WeekBounds | null> {
  const { data, error } = await supabaseAdmin.rpc(DB.weekBoundsFn);
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.period_start || !row?.period_end) {
    if (error) console.error("Error calling london_week_bounds:", error);
    return null;
  }
  return { periodStart: row.period_start, periodEnd: row.period_end };
}

interface OfferExpiryFields {
  expiry_date?: string | null;
  run_until_further?: boolean | null;
}

export function getApplicableOfferExpiry(offer: OfferExpiryFields): string | null {
  if (offer.run_until_further || !offer.expiry_date) return null;
  return offer.expiry_date;
}

// Returns the original string of whichever bound is earlier so the value
// round-trips to Postgres without JavaScript millisecond rounding.
export function computeVoucherExpiry(periodEnd: string, offer: OfferExpiryFields): string {
  const offerExpiry = getApplicableOfferExpiry(offer);
  if (!offerExpiry) return periodEnd;
  return new Date(offerExpiry).getTime() < new Date(periodEnd).getTime()
    ? offerExpiry
    : periodEnd;
}

export interface ClaimIntent {
  userId: string;
  offerId: string;
  periodStart: string;
  expiresAt: string;
  previewIssuedAt: string;
}

// Separate key from the session JWT so a claim token can never be used as an
// auth token (or vice versa). CLAIM_INTENT_SECRET overrides the derived key.
function getClaimTokenKey(): string {
  const explicit = process.env.CLAIM_INTENT_SECRET;
  if (explicit) return explicit;
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error("Missing JWT_SECRET");
  return crypto
    .createHmac("sha256", base)
    .update("eatinout:weekly-claim-intent:v1")
    .digest("hex");
}

export function signClaimIntent(intent: ClaimIntent): string {
  return jwt.sign(
    {
      offerId: intent.offerId,
      periodStart: intent.periodStart,
      expiresAt: intent.expiresAt,
      previewIssuedAt: intent.previewIssuedAt,
    },
    getClaimTokenKey(),
    {
      algorithm: "HS256",
      subject: intent.userId,
      audience: CLAIM_TOKEN_AUDIENCE,
      issuer: CLAIM_TOKEN_ISSUER,
      expiresIn: CLAIM_TOKEN_TTL_SECONDS,
    }
  );
}

export type ClaimIntentVerification =
  | { ok: true; intent: ClaimIntent }
  | { ok: false; reason: "expired" | "invalid" };

export function verifyClaimIntent(token: string): ClaimIntentVerification {
  try {
    const payload = jwt.verify(token, getClaimTokenKey(), {
      algorithms: ["HS256"],
      audience: CLAIM_TOKEN_AUDIENCE,
      issuer: CLAIM_TOKEN_ISSUER,
    }) as jwt.JwtPayload;

    const { sub, offerId, periodStart, expiresAt, previewIssuedAt } = payload;
    if (
      typeof sub !== "string" ||
      typeof offerId !== "string" ||
      typeof periodStart !== "string" ||
      typeof expiresAt !== "string" ||
      typeof previewIssuedAt !== "string"
    ) {
      return { ok: false, reason: "invalid" };
    }
    return {
      ok: true,
      intent: { userId: sub, offerId, periodStart, expiresAt, previewIssuedAt },
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return { ok: false, reason: "expired" };
    return { ok: false, reason: "invalid" };
  }
}

export function generateWalletId(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 24);
}

export function generateRedeemCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}
