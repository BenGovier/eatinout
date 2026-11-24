// lib/email-verification-client.ts
// Browser-side calls to the shared email OTP endpoints.

export type RequestCodeResponse =
  | { ok: true; cooldownSeconds: number }
  | { ok: false; message: string; retryAfterSeconds?: number };

export type VerifyCodeResponse =
  | { ok: true; verificationPass: string }
  | { ok: false; error: string; message: string; attemptsRemaining?: number };

export async function requestEmailCode(email: string): Promise<RequestCodeResponse> {
  try {
    const res = await fetch("/api/auth/email-verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      return { ok: true, cooldownSeconds: Number(data.cooldownSeconds) || 60 };
    }
    return {
      ok: false,
      message: data?.message || "We couldn't send a code right now. Please try again.",
      retryAfterSeconds: typeof data?.retryAfterSeconds === "number" ? data.retryAfterSeconds : undefined,
    };
  } catch {
    return { ok: false, message: "Network error. Please check your connection and try again." };
  }
}

export async function verifyEmailCode(email: string, code: string): Promise<VerifyCodeResponse> {
  try {
    const res = await fetch("/api/auth/email-verification/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && typeof data.verificationPass === "string") {
      return { ok: true, verificationPass: data.verificationPass };
    }
    return {
      ok: false,
      error: data?.error || "server_error",
      message: data?.message || "Something went wrong. Please try again.",
      attemptsRemaining: typeof data?.attemptsRemaining === "number" ? data.attemptsRemaining : undefined,
    };
  } catch {
    return { ok: false, error: "network", message: "Network error. Please check your connection and try again." };
  }
}

export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}
