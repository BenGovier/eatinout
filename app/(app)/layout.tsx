"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { MainNav } from "@/components/main-nav";
import { Logo } from "@/components/logo";
import { WalletProvider } from "@/context/wallet-context";
import ClientWrapper from "@/components/client-wrapper";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Spinner } from "@/components/ui/spinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, authLoading } = useAuth();
  const subscriptionCheckRef = useRef(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const [isVerifyingStatus, setIsVerifyingStatus] = useState(false);

  const isPublicRestaurantPage = pathname?.startsWith("/restaurant/") || pathname === "/restaurants";
  console.log("user", user)
  useEffect(() => {
    if (isPublicRestaurantPage) {
      setLayoutReady(true);
      return;
    }

    if (!authLoading) {
      if (!user || user.role !== "user") {
        console.error("Unauthorized: Not a user or wrong role");
        router.push("/sign-in");
        return;
      }
      if (user && user.role === "user") {
        if (user.subscriptionStatus === "inactive" && !user.isTrialing) {
          const verifyStatusAndRedirect = async () => {
            setIsVerifyingStatus(true);
            try {
              const res = await fetch("/api/subscriptions");
              const data = await res.json();
              if (res.ok && (data.status === "active" || data.status === "trialing" || data.hasAccess)) {
                // Status is actually valid in Stripe, update context
                // Instead of hard reloading, we'll just set layout ready, and checkAuth could be called
                setLayoutReady(true);
              } else {
                router.push("/sign-up");
              }
            } catch (error) {
              router.push("/sign-up");
            } finally {
              setIsVerifyingStatus(false);
            }
          };
          verifyStatusAndRedirect();
          return;
        }
        setLayoutReady(true);
      }
    }
  }, [authLoading, user, router, isPublicRestaurantPage]);

  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    if (subscriptionCheckRef.current || isPublicRestaurantPage) {
      setLayoutReady(true);
      return;
    }

    if (!authLoading && user && user.role === "user") {
      setLayoutReady(true);

      if (!subscriptionCheckRef.current) {
        subscriptionCheckRef.current = true;

        const runCheck = async () => {
          try {
            const response = await fetch("/api/subscriptions", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            })

            if (response.status === 500) {
              console.error("[Subscription Check] API returned 500 - keeping user session intact, not redirecting")
              // Do not logout or redirect on API errors - user may be a valid subscriber
            }
          } catch (error) {
            console.error("Error checking subscription:", error)
          } finally {
            setTimeout(() => {
              subscriptionCheckRef.current = false;
            }, 5000);
          }
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(runCheck, { timeout: 2000 });
        } else {
          setTimeout(runCheck, 0);
        }
      }
    } else if (!authLoading) {
      setLayoutReady(true);
    }

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [authLoading, user, pathname, isPublicRestaurantPage]);

  if (isPublicRestaurantPage) {
    return (
      <WalletProvider>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b bg-background">
            <div className="container flex h-16 items-center justify-between px-4">
              <div className="flex items-center justify-between w-full md:w-auto md:justify-start space-x-4">
                <Logo href="/restaurants" />
                <div className="ml-6">
                  <MainNav isAuthenticated={!!user} />
                </div>
              </div>
              <div>
                <ClientWrapper isAuthenticated={!!user} />
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </WalletProvider>
    );
  }

  if (authLoading) {
    return (
      <Spinner />
    );
  }

  if (!user || user.role !== "user") {
    return (
      <Spinner />
    );
  }

  if (!layoutReady || isVerifyingStatus) {
    return (
      <Spinner />
    );
  }

  return (
    <WalletProvider>
      <div className="flex flex-col min-h-screen" suppressHydrationWarning>
        <header className="sticky top-0 z-50 w-full border-b bg-background">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center justify-between w-full md:w-auto md:justify-start space-x-4">
              <Logo href="/restaurants" />
              <div className="ml-6">
                <MainNav isAuthenticated={true} />
              </div>
            </div>
            <div>
              <ClientWrapper isAuthenticated={true} />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </WalletProvider>
  );
}
