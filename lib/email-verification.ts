// lib/email-verification.ts
// Shared, server-only email OTP verification for new EatinOut registrations.
// All limits are enforced against public.email_verifications using
// compare-and-swap updates, so concurrent requests cannot bypass them.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import sendEmail from "@/lib/sendEmail";

export const REGISTRATION_PURPOSE = "registration";

export const CODE_TTL_SECONDS = 10 * 60;
export const PASS_TTL_SECONDS = 15 * 60;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_VERIFY_ATTEMPTS = 5;
export const MAX_SENDS_PER_WINDOW = 5;
export const SEND_WINDOW_SECONDS = 60 * 60;
export const MAX_EMAILS_PER_IP_PER_WINDOW = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 255;
const CODE_PATTERN = /^\d{6}$/;

const ROW_COLUMNS =
  "id, email, purpose, code_hash, expires_at, attempts, send_count, window_started_at, last_sent_at, verified_at, verification_pass_hash, pass_expires_at, consumed_at";

type VerificationRow = {
  id: string;
  email: string;
  purpose: string;
  code_hash: string | null;
  expires_at: string | null;
  attempts: number | null;
  send_count: number | null;
  window_started_at: string | null;
  last_sent_at: string | null;
  verified_at: string | null;
  verification_pass_hash: string | null;
  pass_expires_at: string | null;
  consumed_at: string | null;
};

export class VerificationUnavailableError extends Error {}

function getHmacSecret(): string {
  const secret = process.env.EMAIL_OTP_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new VerificationUnavailableError("EMAIL_OTP_HMAC_SECRET is not configured");
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", getHmacSecret()).update(value).digest("hex");
}

function safeEqualHex(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

const hashCode = (email: string, purpose: string, code: string) =>
  hmac(`code:${purpose}:${email}:${code}`);
const hashPass = (email: string, purpose: string, pass: string) =>
  hmac(`pass:${purpose}:${email}:${pass}`);
const hashIp = (ip: string) => hmac(`ip:${ip}`);

const toMs = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function getRow(email: string, purpose: string): Promise<VerificationRow | null> {
  const { data, error } = await supabaseAdmin
    .from("email_verifications")
    .select(ROW_COLUMNS)
    .eq("email", email)
    .eq("purpose", purpose)
    .maybeSingle();
  if (error) throw new Error(`email_verifications lookup failed: ${error.message}`);
  return (data as VerificationRow | null) ?? null;
}

async function emailHasAccount(email: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`users lookup failed: ${error.message}`);
  return Boolean(data);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailShell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#fdfaf5;font-family:Arial,Helvetica,sans-serif;color:#111111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #f0e6d8;">
<tr><td style="padding:28px 24px;">
<p style="margin:0 0 20px;font-size:20px;font-weight:bold;color:#eb221c;">EatinOut</p>
${inner}
</td></tr></table></body></html>`;
}

function codeEmailHtml(code: string): string {
  return emailShell(`
<h1 style="margin:0 0 12px;font-size:22px;">Verify your email</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;">Enter this code to finish creating your EatinOut account:</p>
<p style="margin:0 0 20px;font-size:34px;font-weight:bold;letter-spacing:8px;text-align:center;">${escapeHtml(code)}</p>
<p style="margin:0 0 8px;font-size:14px;color:#555555;">This code expires in 10 minutes.</p>
<p style="margin:0;font-size:14px;color:#555555;">If you didn't try to create an EatinOut account, you can ignore this email.</p>`);
}

function existingAccountEmailHtml(origin: string): string {
  const signInUrl = escapeHtml(`${origin}/sign-in`);
  const resetUrl = escapeHtml(`${origin}/forgot-password`);
  return emailShell(`
<h1 style="margin:0 0 12px;font-size:22px;">You already have an account</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Someone tried to create a new EatinOut account with this email address, but one already exists.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5;"><a href="${signInUrl}" style="color:#eb221c;">Sign in to your account</a> or <a href="${resetUrl}" style="color:#eb221c;">reset your password</a>.</p>
<p style="margin:0;font-size:14px;color:#555555;">If this wasn't you, no action is needed.</p>`);
}

export type RequestCodeResult =
  | { status: "sent"; cooldownSeconds: number }
  | { status: "rate_limited"; retryAfterSeconds: number };

export async function requestRegistrationCode(params: {
  email: string;
  ip: string;
  origin: string;
}): Promise<RequestCodeResult> {
  const { email, ip, origin } = params;
  const purpose = REGISTRATION_PURPOSE;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const ipHash = hashIp(ip);

  const windowStartIso = new Date(now - SEND_WINDOW_SECONDS * 1000).toISOString();
  const { count: ipCount, error: ipError } = await supabaseAdmin
    .from("email_verifications")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .neq("email", email)
    .gte("last_sent_at", windowStartIso);
  if (ipError) throw new Error(`ip limit lookup failed: ${ipError.message}`);
  if ((ipCount ?? 0) >= MAX_EMAILS_PER_IP_PER_WINDOW) {
    return { status: "rate_limited", retryAfterSeconds: SEND_WINDOW_SECONDS };
  }

  const hasAccount = await emailHasAccount(email);
  // Existing accounts get an unusable code so the stored state (and the
  // response) look identical to a real send, preventing email enumeration.
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = hasAccount
    ? hashCode(email, purpose, randomBytes(16).toString("hex"))
    : hashCode(email, purpose, code);

  const freshState = {
    code_hash: codeHash,
    expires_at: new Date(now + CODE_TTL_SECONDS * 1000).toISOString(),
    attempts: 0,
    last_sent_at: nowIso,
    verified_at: null,
    verification_pass_hash: null,
    pass_expires_at: null,
    consumed_at: null,
    ip_hash: ipHash,
  };

  const existing = await getRow(email, purpose);

  if (!existing) {
    const { error: insertError } = await supabaseAdmin.from("email_verifications").insert({
      email,
      purpose,
      ...freshState,
      send_count: 1,
      window_started_at: nowIso,
    });
    if (insertError) {
      // 23505: a concurrent request created the row first
      if (insertError.code === "23505") {
        return { status: "rate_limited", retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
      }
      throw new Error(`email_verifications insert failed: ${insertError.message}`);
    }
  } else {
    const sinceLastSend = now - toMs(existing.last_sent_at);
    if (existing.last_sent_at && sinceLastSend < RESEND_COOLDOWN_SECONDS * 1000) {
      return {
        status: "rate_limited",
        retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - sinceLastSend) / 1000),
      };
    }

    const windowAge = now - toMs(existing.window_started_at);
    const windowExpired = !existing.window_started_at || windowAge >= SEND_WINDOW_SECONDS * 1000;
    const currentCount = existing.send_count ?? 0;
    if (!windowExpired && currentCount >= MAX_SENDS_PER_WINDOW) {
      return {
        status: "rate_limited",
        retryAfterSeconds: Math.ceil((SEND_WINDOW_SECONDS * 1000 - windowAge) / 1000),
      };
    }

    let update = supabaseAdmin
      .from("email_verifications")
      .update({
        ...freshState,
        send_count: windowExpired ? 1 : currentCount + 1,
        window_started_at: windowExpired ? nowIso : existing.window_started_at,
      })
      .eq("id", existing.id);
    update = existing.send_count === null ? update.is("send_count", null) : update.eq("send_count", existing.send_count);
    update = existing.last_sent_at === null ? update.is("last_sent_at", null) : update.eq("last_sent_at", existing.last_sent_at);

    const { data: updated, error: updateError } = await update.select("id");
    if (updateError) throw new Error(`email_verifications update failed: ${updateError.message}`);
    if (!updated || updated.length === 0) {
      return { status: "rate_limited", retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
    }
  }

  if (hasAccount) {
    await sendEmail(email, "You already have an EatinOut account", existingAccountEmailHtml(origin));
  } else {
    await sendEmail(email, `${code} is your EatinOut verification code`, codeEmailHtml(code));
  }

  return { status: "sent", cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}

export type VerifyCodeResult =
  | { status: "verified"; verificationPass: string; passExpiresInSeconds: number }
  | { status: "invalid_code"; attemptsRemaining: number }
  | { status: "expired" }
  | { status: "too_many_attempts" }
  | { status: "no_active_code" }
  | { status: "conflict" };

export async function verifyRegistrationCode(params: {
  email: string;
  code: string;
}): Promise<VerifyCodeResult> {
  const { email, code } = params;
  const purpose = REGISTRATION_PURPOSE;
  if (!CODE_PATTERN.test(code)) {
    return { status: "invalid_code", attemptsRemaining: MAX_VERIFY_ATTEMPTS };
  }

  const row = await getRow(email, purpose);
  if (!row || !row.code_hash || row.verified_at || row.consumed_at) {
    return { status: "no_active_code" };
  }

  const now = Date.now();
  if (toMs(row.expires_at) <= now) return { status: "expired" };

  const attempts = row.attempts ?? 0;
  if (attempts >= MAX_VERIFY_ATTEMPTS) return { status: "too_many_attempts" };

  // Claim the attempt before comparing so parallel guesses each consume one.
  let claim = supabaseAdmin
    .from("email_verifications")
    .update({ attempts: attempts + 1 })
    .eq("id", row.id)
    .eq("code_hash", row.code_hash)
    .is("verified_at", null);
  claim = row.attempts === null ? claim.is("attempts", null) : claim.eq("attempts", attempts);
  const { data: claimed, error: claimError } = await claim.select("id");
  if (claimError) throw new Error(`attempt update failed: ${claimError.message}`);
  if (!claimed || claimed.length === 0) return { status: "conflict" };

  if (!safeEqualHex(row.code_hash, hashCode(email, purpose, code))) {
    const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - (attempts + 1));
    return remaining === 0 ? { status: "too_many_attempts" } : { status: "invalid_code", attemptsRemaining: remaining };
  }

  const verificationPass = randomBytes(32).toString("base64url");
  const { data: verified, error: verifyError } = await supabaseAdmin
    .from("email_verifications")
    .update({
      verified_at: new Date(now).toISOString(),
      verification_pass_hash: hashPass(email, purpose, verificationPass),
      pass_expires_at: new Date(now + PASS_TTL_SECONDS * 1000).toISOString(),
      consumed_at: null,
    })
    .eq("id", row.id)
    .eq("code_hash", row.code_hash)
    .is("verified_at", null)
    .select("id");
  if (verifyError) throw new Error(`verification update failed: ${verifyError.message}`);
  if (!verified || verified.length === 0) return { status: "conflict" };

  return { status: "verified", verificationPass, passExpiresInSeconds: PASS_TTL_SECONDS };
}

export type ConsumedPass = { verificationId: string; consumedAt: string; verifiedAt: string };

/**
 * Atomically marks a verification pass as used. Returns null when the pass is
 * missing, wrong, expired, already used, or belongs to a different email.
 */
export async function consumeRegistrationPass(email: string, pass: unknown): Promise<ConsumedPass | null> {
  if (typeof pass !== "string" || pass.length < 32 || pass.length > 128) return null;
  const purpose = REGISTRATION_PURPOSE;
  const passHash = hashPass(email, purpose, pass);

  const row = await getRow(email, purpose);
  if (!row || !row.verified_at || row.consumed_at) return null;
  if (!safeEqualHex(row.verification_pass_hash, passHash)) return null;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("email_verifications")
    .update({ consumed_at: nowIso })
    .eq("id", row.id)
    .eq("verification_pass_hash", passHash)
    .is("consumed_at", null)
    .gt("pass_expires_at", nowIso)
    .select("id, verified_at");
  if (error) throw new Error(`pass consumption failed: ${error.message}`);
  if (!data || data.length === 0) return null;

  return { verificationId: row.id, consumedAt: nowIso, verifiedAt: (data[0] as { verified_at: string }).verified_at };
}

/**
 * Restores a consumed pass when account creation failed for a reason unrelated
 * to the pass, so the user can retry without a new code. Expiry still applies.
 */
export async function releaseRegistrationPass(consumed: ConsumedPass): Promise<void> {
  const { error } = await supabaseAdmin
    .from("email_verifications")
    .update({ consumed_at: null })
    .eq("id", consumed.verificationId)
    .eq("consumed_at", consumed.consumedAt);
  if (error) console.error("Failed to release verification pass:", error.message);
}
