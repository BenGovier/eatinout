import type { Metadata } from "next"
import { cookies } from "next/headers"
import { JoinForm } from "@/components/auth/join-form"
import { SOCIAL_SIGNUP_COOKIE, readSocialSignupToken } from "@/lib/social-signup"
import { getSafeReturnUrl } from "@/lib/safe-return-url"

export const metadata: Metadata = {
  title: "Join EatinOut free",
  description: "Create a free EatinOut account to unlock national offers. No subscription required.",
  robots: { index: false, follow: false },
}

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams
  const rawReturn = params.returnUrl ?? params.redirect
  const returnUrl = getSafeReturnUrl(Array.isArray(rawReturn) ? rawReturn[0] : rawReturn)

  const cookieStore = await cookies()
  const prefill = readSocialSignupToken(cookieStore.get(SOCIAL_SIGNUP_COOKIE)?.value)

  return (
    <main className="min-h-screen bg-background">
      <JoinForm
        returnUrl={returnUrl}
        socialPrefill={prefill ? {
                provider: prefill.provider,
                email: prefill.email,
                firstName: prefill.firstName,
                lastName: prefill.lastName,
              } : null}
      />
    </main>
  )
}
