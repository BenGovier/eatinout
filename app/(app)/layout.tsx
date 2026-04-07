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
import { signOut } from "next-auth/react";

/** When not `"false"`, `/restaurants` and `/map` are guest-accessible (see NEXT_PUBLIC_RESTAURANTS_PAGE_PUBLIC). */
const isRestaurantsBrowsePublic =
  process.env.NEXT_PUBLIC_RESTAURANTS_PAGE_PUBLIC !== "false";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, authLoading } = useAuth();
  const subscriptionCheckRef = useRef(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);

  /** Guest-accessible consumer pages (no sign-in required). */
  const isPublicRestaurantPage =
    pathname?.startsWith("/restaurant/") ||
    (isRestaurantsBrowsePublic &&
      (pathname === "/restaurants" || pathname === "/map"));

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
              console.error("Subscription API returned 500, logging out user")
              try {
                await fetch("/api/auth/logout", {
                  method: "POST",
                })
                await signOut({ callbackUrl: "/conversion-popup" })
              } catch (logoutError) {
                console.error("Error during logout:", logoutError)
                window.location.href = "/conversion-popup"
              }
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

  if (!layoutReady) {
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