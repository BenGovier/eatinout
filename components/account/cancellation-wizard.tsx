"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Sparkles,
  BadgePercent,
  CalendarClock,
  LifeBuoy,
  ArrowLeft,
} from "lucide-react";
import {
  type NormalizedSubscription,
  formatUKDate,
  daysUntil,
  subscriptionSegment,
} from "@/lib/subscription";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

type Step = "reason" | "offer" | "confirm";

type OfferType = "extend_trial" | "discount" | "support" | "keep";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: NormalizedSubscription;
  /** Called after any state-changing action so the parent can refetch. */
  onChanged: () => void;
  contactHref?: string;
}

const REASONS = [
  { value: "too_expensive", label: "It's too expensive" },
  { value: "not_using", label: "I'm not using it enough" },
  { value: "missing_restaurants", label: "Not enough restaurants near me" },
  { value: "technical", label: "I had technical problems" },
  { value: "temporary", label: "Just need a break for a while" },
  { value: "other", label: "Something else" },
];

export function CancellationWizard({
  open,
  onOpenChange,
  subscription,
  onChanged,
  contactHref = "/account/contact",
}: Props) {
  const segment = useMemo(() => subscriptionSegment(subscription), [subscription]);
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<string>("");
  const [reasonDetail, setReasonDetail] = useState<string>("");
  const [busy, setBusy] = useState<null | "offer" | "cancel">(null);
  const [error, setError] = useState<string>("");

  // Reset each time the dialog is opened.
  useEffect(() => {
    if (open) {
      setStep("reason");
      setReason("");
      setReasonDetail("");
      setBusy(null);
      setError("");
      trackSubscriptionEvent("cancellation_started", {
        subscription_segment: segment,
        billing_interval: subscription.billingInterval,
        is_trialing: subscription.isTrialing,
      });
    }
  }, [open, segment, subscription.billingInterval, subscription.isTrialing]);

  // Choose the single best retention offer for this member + reason.
  const offer = useMemo<{
    type: OfferType;
    icon: React.ReactNode;
    title: string;
    body: string;
    cta: string;
  }>(() => {
    // Trialists who haven't used an extension: offer more trial time.
    if (subscription.isTrialing && subscription.canExtendTrial) {
      return {
        type: "extend_trial",
        icon: <Sparkles className="h-5 w-5" />,
        title: "Have another 14 days on us",
        body: "Still deciding? We'll add 14 more free days to your trial so you can find your new favourite spot — you won't be charged until it ends.",
        cta: "Add 14 free days",
      };
    }

    // Price-sensitive monthly members → discount (only when a coupon is configured).
    if (segment === "monthly" && subscription.canApplyRetentionDiscount) {
      return {
        type: "discount",
        icon: <BadgePercent className="h-5 w-5" />,
        title: "Stay for 50% off your next payment",
        body: "We'd love for you to stay. Take 50% off your next monthly payment and keep every member discount.",
        cta: "Claim 50% off",
      };
    }

    // Technical problems → route to support rather than losing them.
    if (reason === "technical") {
      return {
        type: "support",
        icon: <LifeBuoy className="h-5 w-5" />,
        title: "Let us fix that for you",
        body: "Sorry you hit a snag. Our team can usually sort technical issues quickly — get in touch before you go and we'll help.",
        cta: "Contact support",
      };
    }

    // Longer commitments (6-month / annual) → highlight the prepaid value they'd lose.
    if (segment === "six_month" || segment === "annual") {
      return {
        type: "keep",
        icon: <CalendarClock className="h-5 w-5" />,
        title: "You've still got plenty of value left",
        body: subscription.currentPeriodEnd
          ? `Your membership is already paid up until ${formatUKDate(
              subscription.currentPeriodEnd
            )}. Keep enjoying member discounts across the country until then — there's no need to cancel today.`
          : "Your membership is already paid up for the rest of your term. Keep enjoying member discounts until then — there's no need to cancel today.",
        cta: "Keep my membership",
      };
    }

    // General reassurance fallback.
    return {
      type: "keep",
      icon: <Sparkles className="h-5 w-5" />,
      title: "Your discounts are waiting",
      body: "Members save far more than the price of membership with a single meal out. Keep your access and put it to work at thousands of restaurants near you.",
      cta: "Keep my membership",
    };
  }, [reason, segment, subscription]);

  const accessEnd = subscription.accessEndDate || subscription.currentPeriodEnd;

  function goToOffer() {
    trackSubscriptionEvent("cancellation_reason_selected", {
      subscription_segment: segment,
      cancellation_reason: reason || "not_specified",
    });
    trackSubscriptionEvent("retention_offer_displayed", {
      subscription_segment: segment,
      offer_type: offer.type,
    });
    setStep("offer");
  }

  async function acceptOffer() {
    setError("");
    trackSubscriptionEvent("retention_offer_accepted", {
      subscription_segment: segment,
      offer_type: offer.type,
    });

    // "Keep" is a pure reassurance nudge — no backend change, just close.
    if (offer.type === "keep") {
      onOpenChange(false);
      return;
    }

    if (offer.type === "support") {
      onOpenChange(false);
      window.location.href = contactHref;
      return;
    }

    const action =
      offer.type === "extend_trial" ? "extend_trial" : "apply_retention_discount";

    setBusy("offer");
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        setBusy(null);
        return;
      }
      if (offer.type === "extend_trial") {
        trackSubscriptionEvent("trial_extension_applied", { subscription_segment: segment });
      } else if (offer.type === "discount") {
        trackSubscriptionEvent("retention_discount_applied", { subscription_segment: segment });
      }
      setBusy(null);
      onOpenChange(false);
      onChanged();
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setBusy(null);
    }
  }

  function declineOffer() {
    trackSubscriptionEvent("retention_offer_declined", {
      subscription_segment: segment,
      offer_type: offer.type,
    });
    setStep("confirm");
  }

  async function confirmCancel() {
    setError("");
    setBusy("cancel");
    try {
      const res = await fetch("/api/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, reasonDetail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "We couldn't process your cancellation. Please try again.");
        setBusy(null);
        return;
      }
      trackSubscriptionEvent("cancellation_confirmed", {
        subscription_segment: segment,
        cancellation_reason: reason || "not_specified",
        cancel_at_period_end: true,
        days_remaining: daysUntil(accessEnd),
      });
      setBusy(null);
      onOpenChange(false);
      onChanged();
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        {/* ---------------- Step 1: Reason ---------------- */}
        {step === "reason" && (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">Before you go</DialogTitle>
              <DialogDescription>
                We're sorry to see you thinking about leaving. What's the main reason?
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={reason}
              onValueChange={setReason}
              className="mt-5 gap-2"
              aria-label="Reason for cancelling"
            >
              {REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <label
                    key={r.value}
                    htmlFor={`reason-${r.value}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <RadioGroupItem id={`reason-${r.value}`} value={r.value} />
                    <span className="text-sm font-medium text-foreground">{r.label}</span>
                  </label>
                );
              })}
            </RadioGroup>

            {reason === "other" && (
              <div className="mt-3">
                <Label htmlFor="reason-detail" className="sr-only">
                  Tell us more
                </Label>
                <Textarea
                  id="reason-detail"
                  placeholder="Tell us a little more (optional)"
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Never mind
              </Button>
              <Button onClick={goToOffer} disabled={!reason}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* ---------------- Step 2: Retention offer ---------------- */}
        {step === "offer" && (
          <div className="p-6">
            <DialogHeader>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                {offer.icon}
              </div>
              <DialogTitle className="text-xl text-balance">{offer.title}</DialogTitle>
              <DialogDescription className="leading-relaxed">{offer.body}</DialogDescription>
            </DialogHeader>

            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={acceptOffer} disabled={busy === "offer"} className="w-full">
                {busy === "offer" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying
                  </>
                ) : (
                  offer.cta
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={declineOffer}
                disabled={busy === "offer"}
                className="w-full text-muted-foreground"
              >
                No thanks, continue to cancel
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setStep("reason")}
              disabled={busy === "offer"}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </div>
        )}

        {/* ---------------- Step 3: Final confirmation ---------------- */}
        {step === "confirm" && (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-balance">
                Confirm your cancellation
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                {accessEnd ? (
                  <>
                    Your membership will stay active until{" "}
                    <strong className="text-foreground">{formatUKDate(accessEnd)}</strong>. You
                    won't be charged again, and you can reactivate any time before then.
                  </>
                ) : (
                  <>
                    Your membership will remain active until the end of your current period. You
                    won't be charged again, and you can reactivate any time before then.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <ul className="mt-4 space-y-2 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              <li>You keep full access until your access end date.</li>
              <li>No further payments will be taken.</li>
              <li>You can reactivate with one click before then.</li>
            </ul>

            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep("offer")}
                disabled={busy === "cancel"}
                className="sm:w-auto"
              >
                Go back
              </Button>
              <Button
                variant="destructive"
                onClick={confirmCancel}
                disabled={busy === "cancel"}
                className="sm:w-auto"
              >
                {busy === "cancel" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling
                  </>
                ) : (
                  "Confirm cancellation"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
