"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  CreditCard,
  User,
  Phone,
  AlertCircle,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { SubscriptionSummaryCard } from "@/components/account/subscription-summary-card";
import type { NormalizedSubscription } from "@/lib/subscription";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  role: "user" | "restaurant" | "admin";
  subscriptionStatus: "active" | "inactive" | "cancelled" | "cancelled_with_access";
  isTrialing?: boolean;
}

// Unusual compatibility case (section 5): the /api/subscriptions response has no
// nested `subscription` object but still carries legacy access signals.
interface LegacyInfo {
  hasAccess?: boolean;
  status?: string;
  subscriptionDetails?: { status?: string; current_period_end?: number } | null;
  isTrialing?: boolean;
}

export default function AccountPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>({
    firstName: "",
    lastName: "",
    email: "",
    role: "user",
    subscriptionStatus: "inactive",
    isTrialing: false,
  });

  const [subscription, setSubscription] = useState<NormalizedSubscription | null>(null);
  const [legacy, setLegacy] = useState<LegacyInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    document.title = "Account";
  }, []);

  const fetchData = useCallback(async () => {
    setSubLoading(true);
    setSubError(false);

    const [profileResult, subResult] = await Promise.allSettled([
      axios.get("/api/profile"),
      axios.get("/api/subscriptions"),
    ]);

    // Profile: keep whatever we can get; never block the identity card on the
    // subscription request.
    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value.data);
    }

    if (subResult.status === "fulfilled") {
      const data = subResult.value.data ?? {};
      if (data && "subscription" in data) {
        // Preferred normal path: nested normalized object, or explicit null
        // (a genuine inactive membership per section 4).
        setSubscription((data.subscription as NormalizedSubscription | null) ?? null);
        setLegacy(null);
      } else if (
        data &&
        (data.hasAccess !== undefined ||
          data.status !== undefined ||
          data.subscriptionDetails !== undefined)
      ) {
        // Compatibility case (section 5): no nested object but legacy signals
        // are present — do not falsely present the customer as inactive.
        setSubscription(null);
        setLegacy(data as LegacyInfo);
      } else {
        setSubscription(null);
        setLegacy(null);
      }
    } else {
      // Section 4: a failed subscription request must NOT be shown as inactive.
      setSubError(true);
      toast.error("Error fetching account details");
    }

    if (profileResult.status === "rejected" && subResult.status === "rejected") {
      // Both failed — the subscription error state above already covers the UI.
    }

    setSubLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReactivate = useCallback(async () => {
    if (reactivating) return; // prevent a second request while one is running
    setReactivating(true);
    try {
      const res = await axios.patch("/api/subscriptions", { action: "reactivate" });
      // Fire once, only after the PATCH succeeds. No PII.
      trackSubscriptionEvent("cancellation_reversed", {
        subscription_segment: subscription?.effectiveStatus,
        billing_interval: subscription?.billingInterval ?? null,
        is_trialing: subscription?.isTrialing,
        cancel_at_period_end: subscription?.cancelAtPeriodEnd,
      });
      toast.success(res?.data?.message || "Your membership has been reactivated.");
      await fetchData();
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.error) ||
        "We couldn't reactivate your membership. Please try again.";
      toast.error(message);
      // Current subscription display is preserved (state untouched on failure).
    } finally {
      setReactivating(false);
    }
  }, [reactivating, subscription, fetchData]);

  const renderLegacyStatus = () => {
    const status = legacy?.subscriptionDetails?.status ?? legacy?.status;
    const periodEnd = legacy?.subscriptionDetails?.current_period_end;

    let label = "Inactive Subscription";
    let indicator: "ok" | "warn" = "warn";

    if (legacy?.isTrialing || profile.isTrialing) {
      label = "Free Trial Active";
      indicator = "ok";
    } else if (status === "active" || profile.subscriptionStatus === "active" || legacy?.hasAccess) {
      label = "Active Subscription";
      indicator = "ok";
    } else if (
      (status === "cancelled" ||
        status === "cancelled_with_access" ||
        profile.subscriptionStatus === "cancelled" ||
        profile.subscriptionStatus === "cancelled_with_access") &&
      periodEnd
    ) {
      const formattedDate = new Date(periodEnd * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      label = `Valid until ${formattedDate}`;
      indicator = "ok";
    }

    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-center">
          <div
            className={`h-6 w-6 mr-2 rounded-full flex items-center justify-center text-xs ${
              indicator === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {indicator === "ok" ? "✓" : "!"}
          </div>
          <span>{label}</span>
        </div>
      </Card>
    );
  };

  const renderSubscriptionSection = () => {
    if (subLoading) {
      return (
        <Card className="p-5 sm:p-6" aria-busy="true">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-4 w-full max-w-sm rounded bg-muted" />
            <div className="h-9 w-40 rounded bg-muted mt-2" />
          </div>
        </Card>
      );
    }

    if (subError) {
      return (
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">
                We couldn&apos;t load your membership details.
              </p>
              <Button variant="outline" className="mt-3" onClick={fetchData}>
                Try again
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    if (legacy) {
      return renderLegacyStatus();
    }

    return (
      <SubscriptionSummaryCard
        subscription={subscription}
        showManage
        onExplore={() => router.push("/restaurants")}
        onManage={() => router.push("/account/payment")}
        onKeepMembership={handleReactivate}
        onRestart={() => router.push("/account/payment")}
        reactivating={reactivating}
      />
    );
  };

  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {profile.firstName} {profile.lastName}
            </CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
        </Card>

        {renderSubscriptionSection()}

        <div className="space-y-3">
          <Link href="/account/profile">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Profile Settings</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/account/contact">
            <Card className="mt-2">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Contact</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/payment">
            <Card className="mt-2">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Manage Subscription</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent>
              <SignOutButton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
