"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { EmailOtpStep } from "@/components/auth/email-otp-step"
import { passwordByteLength, requestEmailCode } from "@/lib/email-verification-client"
import { getSafeReturnUrl } from "@/lib/safe-return-url"

type JoinFormProps = {
  returnUrl: string
  socialPrefill: {
    provider: "google" | "facebook"
    email: string
    firstName: string
    lastName: string
  } | null
}

const MAX_PASSWORD_BYTES = 72

export function JoinForm({ returnUrl, socialPrefill }: JoinFormProps) {
  const [step, setStep] = useState<"details" | "verify">("details")
  const [firstName, setFirstName] = useState(socialPrefill?.firstName ?? "")
  const [lastName, setLastName] = useState(socialPrefill?.lastName ?? "")
  const [email, setEmail] = useState(socialPrefill?.email ?? "")
  const [password, setPassword] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(60)

  const passwordBytes = passwordByteLength(password)
  const passwordTooShort = password.length > 0 && password.length < 8
  const passwordTooLong = passwordBytes > MAX_PASSWORD_BYTES
  const providerName = socialPrefill?.provider === "facebook" ? "Facebook" : "Google"

  const handleDetailsSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const trimmedEmail = email.trim().toLowerCase()
    if (!firstName.trim() || !lastName.trim() || !trimmedEmail || !password || !zipCode.trim()) {
      setFormError("Please fill in all fields.")
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
      setFormError("Please agree to the Terms of Service and Privacy Policy.")
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

  const createAccount = async (verificationPass: string) => {
    const res = await fetch("/api/auth/register-free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
        zipCode: zipCode.trim().toUpperCase(),
        verificationPass,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "We couldn't create your account. Please try again.")
    }
    const dataLayer = (window as Window & { dataLayer?: Record<string, unknown>[] }).dataLayer
    dataLayer?.push({ event: "free_signup_complete" })
    window.location.assign(getSafeReturnUrl(returnUrl))
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 py-8 sm:py-12">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="EatinOut home">
          <Image src="/eatinout-logo.webp" alt="EatinOut" width={120} height={32} className="h-8 w-auto" priority />
        </Link>
        <Link href={`/sign-in?redirect=${encodeURIComponent(returnUrl)}`} className="text-sm font-medium text-primary">
          Sign in
        </Link>
      </header>

      {step === "verify" ? (
        <EmailOtpStep
          email={email}
          initialCooldownSeconds={cooldown}
          onVerified={createAccount}
          onChangeEmail={() => {
            setStep("details")
            setFormError(null)
          }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              Free EatinOut account. No subscription required.
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Create your free account
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {"Unlock national offers in a minute. We'll email you a code to verify your address."}
            </p>
          </div>

          {socialPrefill && (
            <p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
              {`You're signing up with ${providerName}. Set a password and verify your email to finish creating your account.`}
            </p>
          )}

          <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-first-name" className="text-sm font-medium text-foreground">First name</label>
              <Input
                id="join-first-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-14 rounded-xl text-base"
                maxLength={255}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-last-name" className="text-sm font-medium text-foreground">Last name</label>
              <Input
                id="join-last-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-14 rounded-xl text-base"
                maxLength={255}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-email" className="text-sm font-medium text-foreground">Email</label>
              <Input
                id="join-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-xl text-base"
                maxLength={255}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-password" className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Input
                  id="join-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-xl pr-12 text-base"
                  aria-describedby="join-password-hint"
                  aria-invalid={passwordTooShort || passwordTooLong}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p
                id="join-password-hint"
                className={`text-xs ${passwordTooShort || passwordTooLong ? "text-destructive" : "text-muted-foreground"}`}
              >
                {passwordTooLong ? "Password is too long." : "At least 8 characters."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-postcode" className="text-sm font-medium text-foreground">Postcode</label>
              <Input
                id="join-postcode"
                autoComplete="postal-code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.toUpperCase())}
                className="h-14 rounded-xl text-base"
                maxLength={10}
                required
              />
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
              <Checkbox
                id="join-terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                className="mt-0.5 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <label htmlFor="join-terms" className="text-xs leading-relaxed text-muted-foreground">
                {"I agree to the "}
                <Link href="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>
                {" and "}
                <Link href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>
              </label>
            </div>

            <div aria-live="polite" className="min-h-5">
              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSending}
              className="h-14 w-full rounded-full text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#eb221c" }}
            >
              {isSending ? "Sending code..." : "Continue"}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
