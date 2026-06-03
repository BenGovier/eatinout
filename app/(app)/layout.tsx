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
import { useMinimumLoader } from "@/components/ui/use-minimum-loader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, authLoading } = useAuth();
  const subscriptionCheckRef = useRef(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);

  const isPublicRestaurantPage = pathname?.startsWith("/restaurant/") || pathname === "/restaurants";

  // Minimum loader duration for branded "Dine Out" loader
  const showMinimumLoader = useMinimumLoader(authLoading || (!layoutReady && !isPublicRestaurantPage));

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
        if (user.subscriptionStatus === "inactive") {
          router.push("/conversion-popup");
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

    if (subscriptionCheckRef.current || pathname === "/conversion-popup" || isPublicRestaurantPage) {
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
              <div className="hidden md:block">
                <ClientWrapper isAuthenticated={!!user} />
              </div>
            </div>
          </header>
          <main className="flex-1 pb-16">{children}</main>
          <div className="md:hidden">
          </div>
        </div>
      </WalletProvider>
    );
  }

  if (authLoading || showMinimumLoader) {
    return (
      <Spinner />
    );
  }

  if (!user || user.role !== "user") {
    return (
      <Spinner />
    );
  }

  if (!layoutReady && !isPublicRestaurantPage) {
    return (
      <Spinner />
    );
  }

  return (
    <WalletProvider>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b bg-background">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center justify-between w-full md:w-auto md:justify-start space-x-4">
              <Logo href="/restaurants" />
              <div className="ml-6">
                <MainNav isAuthenticated={true} />
              </div>
            </div>
            <div className="hidden md:block">
              <ClientWrapper isAuthenticated={true} />
            </div>
          </div>
        </header>
        <main className="flex-1 pb-16">{children}</main>
        <div className="md:hidden">
        </div>
      </div>
    </WalletProvider>
  );
}
