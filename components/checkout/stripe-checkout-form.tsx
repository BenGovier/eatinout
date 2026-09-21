"use client"

import { useState } from "react"
import {
    Elements,
    PaymentElement,
    ExpressCheckoutElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeCheckoutFormProps {
    clientSecret: string
    mode: "setup" | "payment"
    onSuccess: () => void
    onReapply?: (voucherCode: string) => Promise<void>
}

function InnerForm({ mode, onSuccess, onReapply }: Omit<StripeCheckoutFormProps, "clientSecret">) {
    const stripe = useStripe()
    const elements = useElements()

    const [voucher, setVoucher] = useState("")

    const [voucherStatus, setVoucherStatus] = useState<
        null | { valid: boolean; label?: string; message?: string }
    >(null)

    const [isCheckingVoucher, setIsCheckingVoucher] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)

    const [error, setError] = useState<string | null>(null)

    const applyVoucher = async () => {
        if (!voucher.trim()) return
        setIsCheckingVoucher(true)
        setVoucherStatus(null)
        try {
            const res = await fetch("/api/payment/validate-voucher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: voucher.trim() }),
            })
            const data = await res.json()
            setVoucherStatus(data)

            // If valid, re-create the subscription with the discount applied
            if (data.valid && onReapply) {
                await onReapply(voucher.trim())
            }
        } catch (err) {
            setVoucherStatus({ valid: false, message: "Could not validate code" })
        } finally {
            setIsCheckingVoucher(false)
        }
    }

    const confirm = async () => {
        if (!stripe || !elements) return
        setIsSubmitting(true)
        setError(null)

        const returnUrl = `${window.location.origin}/success`

        const { error: confirmError } =
            mode === "setup"
                ? await stripe.confirmSetup({
                    elements,
                    confirmParams: { return_url: returnUrl },
                    redirect: "if_required",
                })
                : await stripe.confirmPayment({
                    elements,
                    confirmParams: { return_url: returnUrl },
                    redirect: "if_required",
                })

        setIsSubmitting(false)

        if (confirmError) {
            setError(confirmError.message || "Payment failed. Please check your details and try again.")
            return
        }

        onSuccess()
    }

    return (
        <div className="space-y-4">
            {/* Express wallets — Apple Pay / Google Pay */}
            <ExpressCheckoutElement onConfirm={confirm} />

            <div className="flex items-center gap-3 my-2">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">or pay with card</span>
                <span className="h-px flex-1 bg-border" />
            </div>

            {/* Card fields */}
            <PaymentElement />

            {/* Voucher code */}
            <div>
                <div className="flex gap-2">
                    <input
                        value={voucher}
                        onChange={(e) => setVoucher(e.target.value)}
                        placeholder="Voucher code"
                        className="flex-1 h-12 rounded-xl border border-border px-3 text-sm"
                    />
                    <button
                        type="button"
                        onClick={applyVoucher}
                        disabled={isCheckingVoucher || !voucher.trim()}
                        className="h-12 px-4 rounded-xl border border-border text-sm font-semibold disabled:opacity-50"
                    >
                        {isCheckingVoucher ? "Checking..." : "Apply"}
                    </button>
                </div>
                {voucherStatus && (
                    <p className={`mt-1.5 text-xs ${voucherStatus.valid ? "text-green-600" : "text-red-600"}`}>
                        {voucherStatus.valid ? `Applied: ${voucherStatus.label}` : voucherStatus.message}
                    </p>
                )}
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            <button
                type="button"
                onClick={confirm}
                disabled={isSubmitting || !stripe || !elements}
                className="w-full h-14 rounded-2xl text-lg font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#eb221c" }}
            >
                {isSubmitting ? "Processing..." : "Start saving — £0 today"}
            </button>
        </div>
    )
}

export function StripeCheckoutForm({ clientSecret, mode, onSuccess, onReapply }: StripeCheckoutFormProps) {
    return (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
            <InnerForm mode={mode} onSuccess={onSuccess} onReapply={onReapply} />
        </Elements>
    )
}