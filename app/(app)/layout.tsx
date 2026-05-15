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
  const [layoutReady, setLayoutReady] = useState(false);

  const isPublicRestaurantPage = pathname?.startsWith("/restaurant/");

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
    if (
      subscriptionCheckRef.current ||
      pathname === "/conversion-popup" ||
      isPublicRestaurantPage
    ) {
      return;
    }

    if (!authLoading && user?.role === "user") {
      subscriptionCheckRef.current = true;

      const runCheck = async () => {
        try {
          const response = await fetch("/api/subscriptions", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });

          const data = await response.json().catch(() => ({}));

          // Only redirect when API explicitly flags abandoned-checkout (never on 500/auth errors)
          if (
            response.ok &&
            data.checkStatus === "ok" &&
            data.showConversionPopup === true
          ) {
            const inCheckoutFunnel =
              sessionStorage.getItem("checkoutEmail") ||
              sessionStorage.getItem("triggeredLogin");

            if (inCheckoutFunnel) {
              if (data.email && !sessionStorage.getItem("checkoutEmail")) {
                sessionStorage.setItem("checkoutEmail", data.email);
              }
              router.push("/conversion-popup");
            }
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        } finally {
          setTimeout(() => {
            subscriptionCheckRef.current = false;
          }, 30000);
        }
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(
          runCheck,
          { timeout: 2000 }
        );
      } else {
        setTimeout(runCheck, 0);
      }
    }
  }, [authLoading, user, pathname, isPublicRestaurantPage, router]);

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