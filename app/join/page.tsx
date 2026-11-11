import type { Metadata, Viewport } from "next"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { JoinForm } from "@/components/auth/join-form"
import { SignedInNotice } from "@/components/auth/signed-in-notice"
import type { MembershipPlan } from "@/components/auth/membership-selector"
import { SOCIAL_SIGNUP_COOKIE, readSocialSignupToken } from "@/lib/social-signup"
import { getSafeReturnUrl } from "@/lib/safe-return-url"

export const metadata: Metadata = {
  title: "Join EatinOut | Create your account",
  description:
    "Create your EatinOut account. Start a 30-day free Premium trial or join free for big-brand offers.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#FBF5EF",
}

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parsePlan(value: string | undefined): MembershipPlan | null {
  return value === "free" || value === "premium" ? value : null
}

function getSignedInEmail(token: string | undefined): string | null {
  const secret = process.env.JWT_SECRET
  if (!token || !secret) return null
  try {
    const payload = jwt.verify(token, secret)
    return typeof payload === "object" && typeof payload.email === "string" ? payload.email : null
  } catch {
    return null
  }
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams
  const rawReturn = firstValue(params.returnUrl) ?? firstValue(params.redirect)
  const returnUrl = getSafeReturnUrl(rawReturn)
  const explicitReturnUrl = rawReturn ? getSafeReturnUrl(rawReturn, "") || null : null
  const priceId = firstValue(params.priceId) || null

  const cookieStore = await cookies()
  const signedInEmail = getSignedInEmail(cookieStore.get("auth_token")?.value)
  const prefill = readSocialSignupToken(cookieStore.get(SOCIAL_SIGNUP_COOKIE)?.value)

  return (
    <main className="min-h-screen bg-[#FBF5EF]">
      {signedInEmail && !prefill ? (
        <SignedInNotice email={signedInEmail} returnUrl={returnUrl} />
      ) : (
        <JoinForm
          returnUrl={returnUrl}
          explicitReturnUrl={explicitReturnUrl}
          initialPlan={parsePlan(firstValue(params.plan))}
          priceId={priceId}
          socialPrefill={
            prefill
              ? {
                  provider: prefill.provider,
                  email: prefill.email,
                  firstName: prefill.firstName,
                  lastName: prefill.lastName,
                }
              : null
          }
        />
      )}
    </main>
  )
}
