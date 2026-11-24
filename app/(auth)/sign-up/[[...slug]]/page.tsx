import { redirect } from "next/navigation"
import { getSafeReturnUrl } from "@/lib/safe-return-url"

type SearchParams = Record<string, string | string[] | undefined>

type LegacySignUpPageProps = {
  params: Promise<{ slug?: string[] }>
  searchParams: Promise<SearchParams>
}

// Rewardful reads `via` from the URL; the rest are campaign/ad attribution.
const ATTRIBUTION_PARAMS = [
  "via",
  "referral",
  "ref",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
]

const STRIPE_PRICE_ID = /^price_[A-Za-z0-9_]+$/
const SOURCE_SLUG = /^[A-Za-z0-9_-]{1,64}$/

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LegacySignUpPage({ params, searchParams }: LegacySignUpPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const target = new URLSearchParams()

  // Legacy billing ids (monthly, 6months, annual) were all Premium.
  target.set("plan", firstValue(query.plan) === "free" ? "free" : "premium")

  const priceId = firstValue(query.priceId)?.trim()
  if (priceId && STRIPE_PRICE_ID.test(priceId)) target.set("priceId", priceId)

  const rawReturn = firstValue(query.returnUrl) ?? firstValue(query.redirect) ?? firstValue(query.returnTo)
  const returnUrl = getSafeReturnUrl(rawReturn, "")
  if (returnUrl) target.set("returnUrl", returnUrl)

  for (const key of ATTRIBUTION_PARAMS) {
    const value = firstValue(query[key])?.trim()
    if (value) target.set(key, value.slice(0, 200))
  }

  const sourceSlug = slug?.[0]
  if (!target.has("source") && sourceSlug && SOURCE_SLUG.test(sourceSlug)) {
    target.set("source", sourceSlug)
  }

  redirect(`/join?${target.toString()}`)
}
