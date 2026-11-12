"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { EmailOtpStep } from "@/components/auth/email-otp-step"
import { MembershipSelector, type MembershipPlan } from "@/components/auth/membership-selector"
import { passwordByteLength, requestEmailCode } from "@/lib/email-verification-client"
import { getSafeReturnUrl } from "@/lib/safe-return-url"

type JoinFormProps = {
  returnUrl: string
  explicitReturnUrl: string | null
  initialPlan: MembershipPlan | null
  priceId: string | null
  socialPrefill: {
    provider: "google" | "facebook"
    email: string
    firstName: string
    lastName: string
  } | null
}

const MAX_PASSWORD_BYTES = 72
const PLAN_STORAGE_KEY = "eio_join_plan"
const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? null

const inputClassName =
  "h-12 w-full rounded-xl border border-[#ecdfcb] bg-[#faf7f1] px-4 text-base text-[#1A1A1A] outline-none transition-colors placeholder:text-[#9A928A] focus:border-[#EB221C]/60 focus:ring-2 focus:ring-[#EB221C]/20 aria-[invalid=true]:border-[#EB221C]"

const cardClassName = "rounded-2xl border border-[#ecdfcb] bg-white p-6 shadow-md shadow-black/5 md:p-7"

export function JoinForm({ returnUrl, explicitReturnUrl, initialPlan, priceId, socialPrefill }: JoinFormProps) {
  const [plan, setPlan] = useState<MembershipPlan>(initialPlan ?? "premium")
  const [step, setStep] = useState<"details" | "verify">("details")
  const [firstName, setFirstName] = useState(socialPrefill?.firstName ?? "")
  const [lastName, setLastName] = useState(socialPrefill?.lastName ?? "")
  const [email, setEmail] = useState(socialPrefill?.email ?? "")
  const [password, setPassword] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [marketingEmailConsent, setMarketingEmailConsent] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(60)
  const [referral, setReferral] = useState<string | null>(null)
  const creatingRef = useRef(false)

  const selectedPriceId = priceId || MONTHLY_PRICE_ID
  const showMonthlyPrice = !priceId || priceId === MONTHLY_PRICE_ID
  const passwordBytes = passwordByteLength(password)
  const passwordTooShort = password.length > 0 && password.length < 8
  const passwordTooLong = passwordBytes > MAX_PASSWORD_BYTES
  const providerName = socialPrefill?.provider === "facebook" ? "Facebook" : "Google"
  const isPremium = plan === "premium"

  useEffect(() => {
    if (!initialPlan) {
      const saved = sessionStorage.getItem(PLAN_STORAGE_KEY)
      if (saved === "premium" || saved === "free") setPlan(saved)
    }

    const rewardfulWindow = window as Window & {
      rewardful?: (event: string, callback: () => void) => void
      Rewardful?: { referral?: string }
    }
    rewardfulWindow.rewardful?.("ready", () => {
      if (rewardfulWindow.Rewardful?.referral) setReferral(rewardfulWindow.Rewardful.referral)
    })
  }, [initialPlan])

  const changePlan = (next: MembershipPlan) => {
    setPlan(next)
    sessionStorage.setItem(PLAN_STORAGE_KEY, next)
    const url = new URL(window.location.href)
    url.searchParams.set("plan", next)
    window.history.replaceState(window.history.state, "", url)
  }

  const handleDetailsSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSending) return
    setFormError(null)
    const trimmedEmail = email.trim().toLowerCase()
    if (!firstName.trim() || !lastName.trim() || !trimmedEmail || !password || !zipCode.trim()) {
      setFormError("Please fill in all fields.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError("Please enter a valid email address.")
      return
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.")
      return
    }
    if (passwordTooLong) {
      setFormError("Password is too long. Please use a shorter password.")
      return
    }
    if (!agreeToTerms) {
      setFormError("Please agree to the Terms and Privacy Policy.")
      return
    }

    setIsSending(true)
    const result = await requestEmailCode(trimmedEmail)
    setIsSending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    sessionStorage.setItem(PLAN_STORAGE_KEY, plan)
    setEmail(trimmedEmail)
    setCooldown(result.cooldownSeconds)
    setStep("verify")
  }

  const registerAccount = async (verificationPass: string) => {
    const details = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      password,
      zipCode: zipCode.trim().toUpperCase(),
      acceptedTerms: agreeToTerms,
      marketingEmailConsent,
      verificationPass,
    }
    const res = await fetch(isPremium ? "/api/auth/register" : "/api/auth/register-free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isPremium ? { ...details, selectedPriceId, referral, source: null } : details),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "We couldn't create your account. Please try again.")
    }
    return data as { user?: { email?: string } }
  }

  const createAccount = async (verificationPass: string) => {
    if (creatingRef.current) return
    creatingRef.current = true
    try {
      const data = await registerAccount(verificationPass)
      const dataLayer = (window as Window & { dataLayer?: Record<string, unknown>[] }).dataLayer
      sessionStorage.removeItem(PLAN_STORAGE_KEY)

      if (isPremium) {
        dataLayer?.push({ event: "signup_complete" })
        if (explicitReturnUrl) sessionStorage.setItem("redirectUrl", explicitReturnUrl)
        sessionStorage.setItem("checkoutEmail", data.user?.email || email)
        sessionStorage.setItem("checkoutPostcode", zipCode.trim().toUpperCase())
        if (selectedPriceId) sessionStorage.setItem("selectedPriceId", selectedPriceId)
        if (referral) sessionStorage.setItem("checkoutReferral", referral)
        window.location.assign("/checkout")
        return
      }

      dataLayer?.push({ event: "free_signup_complete" })
      window.location.assign(getSafeReturnUrl(returnUrl))
    } catch (error) {
      creatingRef.current = false
      throw error
    }
  }

  const signInHref = `/sign-in?redirect=${encodeURIComponent(returnUrl)}`

  return (
    <div className="flex w-full flex-col gap-5">
      {step === "verify" ? (
        <section className={`flex flex-col gap-4 ${cardClassName}`}>
          <p className="w-fit rounded-full bg-[#EAF4EC] px-3 py-1 text-xs font-semibold text-[#1F5A3A]">
            {isPremium ? "Premium membership · 30-day free trial" : "Free account"}
          </p>
          <EmailOtpStep
            email={email}
            initialCooldownSeconds={cooldown}
            onVerified={createAccount}
            submittingLabel={isPremium ? "Setting up your trial..." : "Creating your account..."}
            onChangeEmail={() => {
              setStep("details")
              setFormError(null)
            }}
          />
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-balance text-2xl font-bold tracking-tight text-[#1A1A1A]">Create your EatinOut account</h1>
            <p className="text-pretty text-sm leading-relaxed text-[#5C5650]">
              Discover restaurant offers, show them when you visit, and save on your bill.
            </p>
          </div>

          <MembershipSelector value={plan} onChange={changePlan} showMonthlyPrice={showMonthlyPrice} disabled={isSending} />

          <section
            aria-labelledby="join-details-heading"
            className={cardClassName}
          >
            <h2 id="join-details-heading" className="mb-4 text-lg font-bold text-[#1A1A1A]">
              {"A few details and you're in"}
            </h2>

            {socialPrefill && (
              <p className="mb-4 rounded-xl bg-[#EAF4EC] p-3 text-sm text-[#1F4D2E]">
                {`You're signing up with ${providerName}. Set a password and verify your email to finish.`}
              </p>
            )}

            <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <Field id="join-first-name" label="First name">
                  <input
                    id="join-first-name"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClassName}
                    maxLength={255}
                    required
                  />
                </Field>
                <Field id="join-last-name" label="Last name">
                  <input
                    id="join-last-name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClassName}
                    maxLength={255}
                    required
                  />
                </Field>
              </div>

              <Field id="join-email" label="Email address">
                <input
                  id="join-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                  maxLength={255}
                  required
                />
              </Field>

              <Field id="join-password" label="Password">
                <div className="relative">
                  <input
                    id="join-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClassName} pr-12`}
                    aria-describedby="join-password-hint"
                    aria-invalid={passwordTooShort || passwordTooLong}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#5C5650] hover:text-[#1A1A1A]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p
                  id="join-password-hint"
                  className={`text-xs ${passwordTooShort || passwordTooLong ? "text-[#C41A15]" : "text-[#6B645D]"}`}
                >
                  {passwordTooLong ? "Password is too long." : "At least 8 characters."}
                </p>
              </Field>

              <Field id="join-postcode" label="Postcode">
                <input
                  id="join-postcode"
                  autoComplete="postal-code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.toUpperCase())}
                  className={inputClassName}
                  maxLength={10}
                  required
                />
              </Field>

              <div className="flex items-center gap-3 py-1">
                <Checkbox
                  id="join-terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                  className="h-5 w-5 rounded-md border-[#EB221C] data-[state=checked]:border-[#EB221C] data-[state=checked]:bg-[#EB221C]"
                />
                <label htmlFor="join-terms" className="text-sm text-[#3A3A3A]">
                  {"I agree to the "}
                  <Link href="/terms" target="_blank" className="text-[#EB221C] underline underline-offset-2">Terms</Link>
                  {" & "}
                  <Link href="/privacy" target="_blank" className="text-[#EB221C] underline underline-offset-2">Privacy Policy</Link>
                </label>
              </div>

              <div className="flex items-start gap-3 py-1">
                <Checkbox
                  id="join-marketing"
                  checked={marketingEmailConsent}
                  onCheckedChange={(checked) => setMarketingEmailConsent(checked === true)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-[#EB221C] data-[state=checked]:border-[#EB221C] data-[state=checked]:bg-[#EB221C]"
                />
                <label htmlFor="join-marketing" className="text-sm leading-relaxed text-[#3A3A3A]">
                  Keep me updated with exclusive restaurant offers, discounts and free giveaways from EatinOut.
                </label>
              </div>

              <div aria-live="polite" className="min-h-5">
                {formError && <p className="text-sm text-[#C41A15]">{formError}</p>}
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#EB221C] text-lg font-semibold text-white transition-colors hover:bg-[#D11D17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EB221C] focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {isSending ? "Sending code..." : isPremium ? "Continue with 30-day trial" : "Create my free account"}
                {!isSending && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
              </button>

              <div className="flex items-start justify-center gap-2 text-center text-sm text-[#5C5650]">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1F5A3A]" aria-hidden="true" />
                {isPremium ? (
                  <p>
                    {"First we'll verify your email. Then you'll add payment details to start your trial."}
                    <br />
                    <strong className="font-semibold text-[#1A1A1A]">No charge today.</strong>
                  </p>
                ) : (
                  <p>
                    {"We'll verify your email next."}
                    <br />
                    No card or subscription needed.
                  </p>
                )}
              </div>

              <p className="text-center text-base text-[#2B2B2B]">
                {"Already have an account? "}
                <Link href={signInHref} className="font-medium text-[#EB221C] underline underline-offset-2">
                  Sign in
                </Link>
              </p>
            </form>
          </section>
        </>
      )}
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[#1A1A1A]">
        {label}
      </label>
      {children}
    </div>
  )
}
