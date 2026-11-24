"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { requestEmailCode, verifyEmailCode } from "@/lib/email-verification-client"

type EmailOtpStepProps = {
  email: string
  initialCooldownSeconds: number
  onVerified: (verificationPass: string) => Promise<void> | void
  onChangeEmail: () => void
  submittingLabel?: string
}

type Phase = "entry" | "verifying" | "submitting" | "success"

export function EmailOtpStep({
  email,
  initialCooldownSeconds,
  onVerified,
  onChangeEmail,
  submittingLabel = "Creating your account...",
}: EmailOtpStepProps) {
  const [code, setCode] = useState("")
  const [phase, setPhase] = useState<Phase>("entry")
  const [error, setError] = useState<string | null>(null)
  const [needsNewCode, setNeedsNewCode] = useState(false)
  const [cooldown, setCooldown] = useState(initialCooldownSeconds)
  const [isResending, setIsResending] = useState(false)
  const [resendNotice, setResendNotice] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const busy = phase !== "entry"

  const submitCode = async (value: string) => {
    if (value.length !== 6 || busy || needsNewCode) return
    setError(null)
    setResendNotice(null)
    setPhase("verifying")

    const result = await verifyEmailCode(email, value)
    if (!result.ok) {
      setPhase("entry")
      setCode("")
      if (result.error === "expired" || result.error === "too_many_attempts") {
        setNeedsNewCode(true)
      }
      const attemptsHint =
        result.error === "invalid_code" && typeof result.attemptsRemaining === "number"
          ? ` ${result.attemptsRemaining} ${result.attemptsRemaining === 1 ? "attempt" : "attempts"} left.`
          : ""
      setError(`${result.message}${attemptsHint}`)
      return
    }

    setPhase("submitting")
    try {
      await onVerified(result.verificationPass)
      setPhase("success")
    } catch (err) {
      setPhase("entry")
      setCode("")
      setError(err instanceof Error ? err.message : "We couldn't create your account. Please try again.")
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || isResending || busy) return
    setIsResending(true)
    setError(null)
    setResendNotice(null)
    const result = await requestEmailCode(email)
    setIsResending(false)
    if (result.ok) {
      setNeedsNewCode(false)
      setCode("")
      setCooldown(result.cooldownSeconds)
      setResendNotice("A new code is on its way. Any earlier codes no longer work.")
    } else {
      if (result.retryAfterSeconds) setCooldown(result.retryAfterSeconds)
      setError(result.message)
    }
  }

  if (phase === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
        <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
        <p className="text-lg font-semibold text-foreground">Email verified</p>
        <p className="text-sm text-muted-foreground">Taking you to the next step...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">Check your email</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {"We've sent a 6-digit code to "}
          <span className="font-semibold text-foreground break-all">{email}</span>
          {". Enter it below to verify your email. The code expires in 10 minutes."}
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submitCode(code)
        }}
      >
        <label htmlFor="email-otp" className="sr-only">
          6-digit verification code
        </label>
        <InputOTP
          id="email-otp"
          maxLength={6}
          value={code}
          onChange={(value) => {
            const digits = value.replace(/\D/g, "")
            setCode(digits)
            setError(null)
            if (digits.length === 6) submitCode(digits)
          }}
          inputMode="numeric"
          pattern="^[0-9]*$"
          autoComplete="one-time-code"
          autoFocus
          disabled={busy || needsNewCode}
          containerClassName="justify-center"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "email-otp-error" : undefined}
        >
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="h-14 w-12 rounded-xl border border-border bg-background text-xl font-semibold first:rounded-xl last:rounded-xl sm:w-14"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <div aria-live="polite" className="min-h-5 text-center text-sm">
          {error ? (
            <p id="email-otp-error" className="text-destructive">
              {error}
            </p>
          ) : resendNotice ? (
            <p className="text-muted-foreground">{resendNotice}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={code.length !== 6 || busy || needsNewCode}
          className="h-14 w-full rounded-full text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#eb221c" }}
        >
          {phase === "verifying" ? "Verifying..." : phase === "submitting" ? submittingLabel : "Verify email"}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending || busy}
          className="font-medium text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {isResending ? "Sending..." : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          disabled={busy}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          Use a different email
        </button>
        <p className="text-center text-xs text-muted-foreground">
          {"Can't find it? Check your spam or junk folder."}
        </p>
      </div>
    </div>
  )
}
