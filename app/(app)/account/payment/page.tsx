"use client";

import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, CreditCard, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { toast } from "react-toastify";
import axios from "axios";
import { useAuth } from "@/context/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SubscriptionSummaryCard } from "@/components/account/subscription-summary-card";
import { CancellationWizard } from "@/components/account/cancellation-wizard";
import { type NormalizedSubscription, formatUKDate } from "@/lib/subscription";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuth();

  const [subscription, setSubscription] = useState<NormalizedSubscription | null>(null);
  const [email, setEmail] = useState("");
  const [cardDetails, setCardDetails] = useState<NormalizedSubscription["paymentMethod"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelWizard, setShowCancelWizard] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    document.title = "Manage membership";
    trackSubscriptionEvent("manage_subscription_opened");
  }, []);

  const getSubscriptions = useCallback(async () => {
    try {
      const response = await fetch("/api/subscriptions", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch subscription");
      const data = await response.json();
      setEmail(data.email || "");
      setSubscription(data.subscription ?? null);
      setCardDetails(data.card ?? null);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load your membership");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSubscriptions();
  }, [getSubscriptions]);

  const refreshAll = useCallback(async () => {
    await getSubscriptions();
    await checkAuth();
  }, [getSubscriptions, checkAuth]);

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const res = await axios.patch("/api/subscriptions", { action: "reactivate" });
      trackSubscriptionEvent("cancellation_reversed", {
        subscription_segment: subscription?.isTrialing ? "trial" : "paid",
      });
      toast.success(res.data?.message || "Your membership has been reactivated.");
      await refreshAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "We couldn't reactivate your membership.");
    } finally {
      setReactivating(false);
    }
  };

  const handleRestart = async () => {
    try {
      const response = await fetch("/api/payment/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      await checkAuth();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("We couldn't start checkout. Please try again.");
      }
    } catch {
      toast.error("We couldn't start checkout. Please try again.");
    }
  };

  const handleUpdateCard = async () => {
    try {
      const response = await fetch("/api/payment/create-setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
    } catch {
      toast.error("Failed to start card update. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    if (user?.subscriptionStatus === "active") {
      toast.error("Please cancel your membership before deleting your account.");
      setShowDeleteModal(false);
      return;
    }
    try {
      setIsDeleting(true);
      await axios.post("/api/delete-account");
      toast.success(
        "Thanks, customer service will process your request and confirm within 48 hours."
      );
      setShowDeleteModal(false);
    } catch {
      toast.error("Error processing account deletion request");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading your membership
      </div>
    );
  }

  const canCancel =
    subscription &&
    subscription.hasAccess &&
    !subscription.cancelAtPeriodEnd &&
    subscription.effectiveStatus !== "cancelled" &&
    subscription.effectiveStatus !== "inactive";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage membership</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review your plan, update payment details, or make changes.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/account")} className="shrink-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to account</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        {error && (
          <Card className="p-4 mb-4 border-l-4 border-l-destructive">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {/* Membership overview */}
        <div className="mb-4">
          <SubscriptionSummaryCard
            subscription={subscription}
            showManage={false}
            onExplore={() => router.push("/restaurants")}
            onKeepMembership={handleReactivate}
            onRestart={handleRestart}
            reactivating={reactivating}
          />
        </div>

        {/* Payment method */}
        <Card className="p-5 sm:p-6 mb-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Payment method</h2>
          {cardDetails ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-lg text-primary">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {cardDetails.brand?.toUpperCase()} ending {cardDetails.last4}
                  </p>
                  {cardDetails.expMonth && cardDetails.expYear && (
                    <p className="text-sm text-muted-foreground">
                      Expires {cardDetails.expMonth}/{cardDetails.expYear}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={handleUpdateCard}>
                Update card
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-muted-foreground">No payment method on file</p>
            </div>
          )}
        </Card>

        {/* Cancel membership */}
        {canCancel && (
          <Card className="p-5 sm:p-6 mb-4">
            <h2 className="text-lg font-bold text-foreground mb-1">Cancel membership</h2>
            <p className="text-sm text-muted-foreground mb-4">
              You'll keep full access until the end of your current period
              {subscription?.currentPeriodEnd
                ? ` (${formatUKDate(subscription.currentPeriodEnd)})`
                : ""}
              .
            </p>
            <Button variant="outline" onClick={() => setShowCancelWizard(true)}>
              Cancel membership
            </Button>
          </Card>
        )}

        {/* Delete account (destructive, clearly separated) */}
        <Card className="p-5 sm:p-6 border-destructive/30">
          <h2 className="text-lg font-bold text-foreground mb-1">Delete account</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This can't be undone.
          </p>
          <Button
            variant="ghost"
            onClick={() => setShowDeleteModal(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete your account
          </Button>
        </Card>
      </div>

      {/* Cancellation wizard */}
      {subscription && (
        <CancellationWizard
          open={showCancelWizard}
          onOpenChange={setShowCancelWizard}
          subscription={subscription}
          onChanged={refreshAll}
          contactHref="/account/contact"
        />
      )}

      {/* Update card modal */}
      <Dialog open={!!clientSecret} onOpenChange={(o) => !o && setClientSecret(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update payment method</DialogTitle>
            <DialogDescription>
              Enter your new card details below. Your membership and billing date stay the same.
            </DialogDescription>
          </DialogHeader>
          {clientSecret && (
            <Elements stripe={stripePromise}>
              <CardUpdateForm
                clientSecret={clientSecret}
                email={email}
                setClientSecret={setClientSecret}
                setIsUpdating={setIsUpdating}
                getSubscriptions={getSubscriptions}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete account modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data, including your membership history and
              wallet offers, will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          {user?.subscriptionStatus === "active" && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                You need to cancel your membership before deleting your account.
              </p>
            </div>
          )}

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Yes, delete account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isUpdating && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[60]">
          <div className="flex items-center gap-2 text-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Updating payment method
          </div>
        </div>
      )}
    </div>
  );
}

const CardUpdateForm = ({
  clientSecret,
  setClientSecret,
  email,
  setIsUpdating,
  getSubscriptions,
}: {
  clientSecret: string;
  setClientSecret: React.Dispatch<React.SetStateAction<string | null>>;
  email: string;
  setIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
  getSubscriptions: () => Promise<void>;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setIsUpdating(true);

    const cardElement = elements.getElement(CardElement);
    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardElement!,
        billing_details: { email },
      },
    });

    if (error) {
      toast.error(error.message || "Failed to update card");
    } else {
      toast.success("Card updated successfully");
      setClientSecret(null);
    }
    await getSubscriptions();
    setIsUpdating(false);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-input p-3">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#0a0a0a",
                "::placeholder": { color: "#737373" },
              },
            },
          }}
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting || !stripe}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating
          </>
        ) : (
          "Save new card"
        )}
      </Button>
    </form>
  );
};
