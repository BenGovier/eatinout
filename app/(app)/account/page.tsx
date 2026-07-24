"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, CreditCard, User, Phone } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { SubscriptionSummaryCard } from "@/components/account/subscription-summary-card";
import { type NormalizedSubscription } from "@/lib/subscription";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [subscription, setSubscription] = useState<NormalizedSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    document.title = "Account";
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, subRes] = await Promise.all([
        axios.get("/api/profile"),
        axios.get("/api/subscriptions"),
      ]);
      setProfile(profileRes.data);
      setSubscription(subRes?.data?.subscription ?? null);
    } catch {
      toast.error("Error fetching account details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const res = await axios.patch("/api/subscriptions", { action: "reactivate" });
      trackSubscriptionEvent("cancellation_reversed", {
        subscription_segment: subscription?.isTrialing ? "trial" : "paid",
      });
      toast.success(res.data?.message || "Your membership has been reactivated.");
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "We couldn't reactivate your membership.");
    } finally {
      setReactivating(false);
    }
  };

  return (
    <div className="container px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      <div className="space-y-4">
        <Card className="p-5 sm:p-6">
          <p className="text-lg font-semibold text-foreground">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </Card>

        {loading ? (
          <Card className="p-6">
            <div className="h-5 w-40 rounded bg-muted animate-pulse" />
            <div className="mt-3 h-4 w-full rounded bg-muted animate-pulse" />
            <div className="mt-2 h-4 w-2/3 rounded bg-muted animate-pulse" />
          </Card>
        ) : (
          <SubscriptionSummaryCard
            subscription={subscription}
            onExplore={() => router.push("/restaurants")}
            onManage={() => router.push("/account/payment")}
            onKeepMembership={handleReactivate}
            onRestart={() => router.push("/account/payment")}
            reactivating={reactivating}
          />
        )}

        <div className="space-y-3">
          <Link href="/account/profile">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>Profile Settings</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/account/contact">
            <Card className="mt-2 transition-colors hover:bg-muted/50">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>Contact</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/payment">
            <Card className="mt-2 transition-colors hover:bg-muted/50">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>Manage Subscription</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
