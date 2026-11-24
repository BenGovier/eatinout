import type { Metadata, Viewport } from "next"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import Image from "next/image"
import Link from "next/link"
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

const AUTH_IMAGE =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/22.png-FjHsCSsScJT76IHTeq7DFobAck45ur.jpeg"

const BENEFITS = [
  "Free national Big Brand offers",
  "Premium discounts at 500+ restaurants, cafés and bars",
  "Upgrade when you're ready",
]

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

  if (signedInEmail && !prefill) {
    return (
      <main className="min-h-screen bg-[#FBF5EF]">
        <SignedInNotice email={signedInEmail} returnUrl={returnUrl} />
      </main>
    )
  }

  const signInHref = `/sign-in?redirect=${encodeURIComponent(returnUrl)}`

  return (
    <main className="flex min-h-screen flex-col bg-[#fdf6ec] lg:flex-row">
      <div className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-1/2">
        <Image
          src={AUTH_IMAGE}
          alt="Friends enjoying dishes and drinks at a restaurant"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-12">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="EatinOut home">
              <Image
                src="/eatinout-logo.webp"
                alt="EatinOut"
                width={200}
                height={50}
                className="h-12 w-auto brightness-0 invert"
              />
            </Link>
            <Link
              href={signInHref}
              className="whitespace-nowrap text-sm font-medium text-white/90 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Already a member? Sign in
            </Link>
          </div>
          <div className="max-w-md space-y-5">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Restaurant discounts when you eat out
            </h2>
            <p className="text-pretty text-lg text-white/85">Save up to 50% at 500+ restaurants, cafés and bars.</p>
            <ul className="flex flex-wrap gap-2">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
                >
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-6 md:px-8 lg:w-1/2 lg:justify-center lg:px-12 lg:py-10">
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <Link href="/" aria-label="EatinOut home">
              <Image src="/eatinout-logo.webp" alt="EatinOut" width={180} height={46} className="h-10 w-auto" />
            </Link>
            <Link
              href={signInHref}
              className="whitespace-nowrap text-sm font-medium text-[#EB221C] underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>

          <div className="relative h-28 overflow-hidden rounded-3xl shadow-sm lg:hidden">
            <Image
              src={AUTH_IMAGE}
              alt="Friends enjoying dishes at a restaurant"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
            <div className="relative z-10 flex h-full flex-col justify-center px-5">
              <p className="text-balance text-base font-bold leading-snug text-white">
                Restaurant discounts when you eat out
              </p>
              <p className="mt-1 text-xs text-white/85">Save up to 50% at 500+ places</p>
            </div>
          </div>

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
        </div>
      </div>
    </main>
  )
}
