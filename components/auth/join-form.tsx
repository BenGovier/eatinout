"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { EmailOtpStep } from "@/components/auth/email-otp-step"
import { MembershipSelector, type BillingOption, type MembershipPlan } from "@/components/auth/membership-selector"
import { passwordByteLength, requestEmailCode } from "@/lib/email-verification-client"
import { MOBILE_NUMBER_ERROR, normalizeOptionalMobile } from "@/lib/mobile-number"
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
// Previously restored on plain /join and overrode the Premium default; cleared so old values can't linger.
const LEGACY_PLAN_STORAGE_KEY = "eio_join_plan"
const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || null
const IS_STRIPE_TEST_MODE = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").startsWith("pk_test_")
const TEST_MODE_PRICE = "Test mode"

const BILLING_OPTIONS: BillingOption[] = [
  {
    priceId: MONTHLY_PRICE_ID ?? "",
    label: "Monthly",
    price: "£4.99/month",
  },
  {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS_DISCOUNT || "",
    label: "6 months",
    price: "£25.45 every 6 months",
    monthlyEquivalent: "£4.24/month equivalent",
    saving: "Save 15% vs monthly",
  },
  {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR_DISCOUNT || "",
    label: "Annual",
    price: "£47.90/year",
    monthlyEquivalent: "£3.99/month equivalent",
    saving: "Save 20% vs monthly",
  },
]
  .filter((option) => option.priceId)
  .map((option) =>
    IS_STRIPE_TEST_MODE
      ? { priceId: option.priceId, label: option.label, price: TEST_MODE_PRICE }
      : option,
  )

function getPremiumSummary(priceId: string | null) {
  const option = BILLING_OPTIONS.find((candidate) => candidate.priceId === priceId)
  if (!option) return "Plan price confirmed at checkout · Cancel anytime"
  if (IS_STRIPE_TEST_MODE) return "Test mode: amount and currency confirmed at checkout · Cancel anytime"
  return `Then ${option.price} · Cancel anytime`
}

const inputClassName =
  "h-12 w-full rounded-xl border border-[#ecdfcb] bg-[#faf7f1] px-3.5 text-base text-[#1A1A1A] outline-none transition-colors placeholder:text-[#9A928A] focus:border-[#EB221C] focus:bg-white focus:ring-2 focus:ring-[#EB221C]/20 aria-[invalid=true]:border-[#EB221C]"

const cardClassName = "rounded-2xl border border-[#ecdfcb] bg-white p-4 shadow-md shadow-black/5 sm:p-6 md:p-7"

export function JoinForm({ returnUrl, explicitReturnUrl, initialPlan, priceId, socialPrefill }: JoinFormProps) {
  const [plan, setPlan] = useState<MembershipPlan>(initialPlan ?? "premium")
  const [step, setStep] = useState<"details" | "verify">("details")
  const [firstName, setFirstName] = useState(socialPrefill?.firstName ?? "")
  const [lastName, setLastName] = useState(socialPrefill?.lastName ?? "")
  const [email, setEmail] = useState(socialPrefill?.email ?? "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [mobile, setMobile] = useState("")
  const [mobileTouched, setMobileTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [zipCode, setZipCode] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [marketingEmailConsent, setMarketingEmailConsent] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(60)
  const [referral, setReferral] = useState<string | null>(null)
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(
    initialPlan === "free" ? MONTHLY_PRICE_ID : priceId || MONTHLY_PRICE_ID,
  )
  const creatingRef = useRef(false)

  const passwordBytes = passwordByteLength(password)
  const passwordTooShort = password.length > 0 && password.length < 8
  const passwordTooLong = passwordBytes > MAX_PASSWORD_BYTES
  const providerName = socialPrefill?.provider === "facebook" ? "Facebook" : "Google"
  const isPremium = plan === "premium"
  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password
  const showMismatch = passwordsMismatch && (confirmTouched || submitAttempted)
  const showConfirmMissing = submitAttempted && confirmPassword.length === 0
  const normalizedMobile = normalizeOptionalMobile(mobile)
  const showMobileError = normalizedMobile === "invalid" && (mobileTouched || submitAttempted)

  useEffect(() => {
    sessionStorage.removeItem(LEGACY_PLAN_STORAGE_KEY)
    if (initialPlan === "free") {
      setSelectedPriceId(MONTHLY_PRICE_ID)
      clearPremiumPrice()
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
    const url = new URL(window.location.href)
    url.searchParams.set("plan", next)
    if (next === "free") {
      url.searchParams.delete("priceId")
      sessionStorage.removeItem("selectedPriceId")
      setSelectedPriceId(MONTHLY_PRICE_ID)
    }
    window.history.replaceState(window.history.state, "", url)
  }

  const changePrice = (nextPriceId: string) => {
    setSelectedPriceId(nextPriceId)
    const url = new URL(window.location.href)
    url.searchParams.set("priceId", nextPriceId)
    window.history.replaceState(window.history.state, "", url)
  }

  const handleDetailsSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSending) return
    setFormError(null)
    setSubmitAttempted(true)
    const trimmedEmail = email.trim().toLowerCase()
    if (!firstName.trim() || !lastName.trim() || !trimmedEmail || !password || !confirmPassword || !zipCode.trim()) {
      setFormError("Please fill in all required fields.")
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
    if (confirmPassword !== password) {
      document.getElementById("join-confirm-password")?.focus()
      return
    }
    if (normalizedMobile === "invalid") {
      document.getElementById("join-mobile")?.focus()
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
      mobile: normalizedMobile === "invalid" ? null : normalizedMobile,
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

      sessionStorage.removeItem("selectedPriceId")
      dataLayer?.push({ event: "free_signup_complete" })
      window.location.assign(getSafeReturnUrl(returnUrl))
    } catch (error) {
      creatingRef.current = false
      throw error
    }
  }

  const signInHref = `/sign-in?redirect=${encodeURIComponent(returnUrl)}`

  return (
    <div className="flex w-full flex-col gap-4">
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
          <h1 className="text-balance text-[22px] font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-2xl">
            Create your EatinOut account
          </h1>

          <MembershipSelector
            value={plan}
            onChange={changePlan}
            billingOptions={BILLING_OPTIONS}
            selectedPriceId={selectedPriceId}
            onPriceChange={changePrice}
            premiumSummary={getPremiumSummary(selectedPriceId)}
            disabled={isSending}
          />

          <section
            aria-labelledby="join-details-heading"
            className={cardClassName}
          >
            <h2 id="join-details-heading" className="mb-3 text-base font-bold text-[#1A1A1A] sm:text-lg">
              Your details
            </h2>

            {socialPrefill && (
              <p className="mb-3 rounded-xl bg-[#EAF4EC] p-3 text-sm text-[#1F4D2E]">
                {`You're signing up with ${providerName}. Set a password and verify your email to finish.`}
              </p>
            )}

            <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-3.5" noValidate>
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
                  <VisibilityToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    label="password"
                  />
                </div>
                <p
                  id="join-password-hint"
                  className={`text-xs ${passwordTooShort || passwordTooLong ? "text-[#C41A15]" : "text-[#6B645D]"}`}
                >
                  {passwordTooLong ? "Password is too long." : "At least 8 characters."}
                </p>
              </Field>

              <Field id="join-confirm-password" label="Confirm password">
                <div className="relative">
                  <input
                    id="join-confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    className={`${inputClassName} pr-12`}
                    aria-describedby={showMismatch || showConfirmMissing ? "join-confirm-password-error" : undefined}
                    aria-invalid={showMismatch || showConfirmMissing}
                    required
                  />
                  <VisibilityToggle
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((value) => !value)}
                    label="confirm password"
                  />
                </div>
                {(showMismatch || showConfirmMissing) && (
                  <p id="join-confirm-password-error" className="text-xs text-[#C41A15]" role="alert">
                    {showMismatch ? "Passwords don't match" : "Please confirm your password"}
                  </p>
                )}
              </Field>

              <Field id="join-mobile" label="Mobile number (optional)">
                <input
                  id="join-mobile"
                  name="mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  onBlur={() => setMobileTouched(true)}
                  className={inputClassName}
                  maxLength={25}
                  aria-describedby={showMobileError ? "join-mobile-error" : undefined}
                  aria-invalid={showMobileError}
                />
                {showMobileError && (
                  <p id="join-mobile-error" className="text-xs text-[#C41A15]" role="alert">
                    {MOBILE_NUMBER_ERROR}
                  </p>
                )}
              </Field>

              <Field id="join-postcode" label="Postcode">
                <input
                  id="join-postcode"
                  autoComplete="postal-code"
                  autoCapitalize="characters"
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
                {isSending ? "Sending code..." : isPremium ? "Start my 30-day free trial" : "Create my free account"}
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

function clearPremiumPrice() {
  sessionStorage.removeItem("selectedPriceId")
  const url = new URL(window.location.href)
  if (!url.searchParams.has("priceId")) return
  url.searchParams.delete("priceId")
  window.history.replaceState(window.history.state, "", url)
}

function VisibilityToggle({ visible, onToggle, label }: { visible: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#5C5650] hover:text-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EB221C]/40"
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      aria-pressed={visible}
    >
      {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
    </button>
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
