"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useAuth } from "@/context/auth-context";
import { MobileMenuDrawer } from "@/components/mobile-menu-drawer";

const navItems = [
  { href: "/restaurants", label: "Restaurants" },
  { href: "/map", label: "Map", isPublic: true },
  { href: "/categories", label: "Categories" },
  { href: "/wallet", label: "Wallet" },
  { href: "/account/contact", label: "Contact" },
  { href: "/favorites", label: "Favourites" }
];

export function MainNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { user } = useAuth();
  const canViewFullNav = isAuthenticated && user?.role === "user"

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut({ redirect: false });
      window.location.assign("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div>
      <MobileMenuDrawer
        isCustomer={canViewFullNav}
        role={isAuthenticated ? user?.role : null}
        isSigningOut={isSigningOut}
        onSignOut={handleSignOut}
      />

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-6">
        {navItems.map((item) => {
          if (!canViewFullNav) return null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-red-600",
                pathname === item.href ? "text-red-600" : "text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
