"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useAuth } from "@/context/auth-context";

const navItems = [
  { href: "/restaurants", label: "Restaurants" },
  { href: "/categories", label: "Categories" },
  { href: "/wallet", label: "Wallet" },
  { href : "account/contact", label: "Contact" },
  {href : "/favorites", label: "Favourites"}
];

export function MainNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { user  } = useAuth();
  const canViewFullNav = isAuthenticated && user?.role === "user"
  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div>
      {/* Hamburger Menu Button */}
      <button
        className="md:hidden flex items-center px-3 py-2 border rounded text-gray-600 border-gray-600 hover:text-red-600 hover:border-red-600"
        onClick={toggleMenu}
      >
        <svg
          className="fill-current h-3 w-3"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Menu</title>
          <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
        </svg>
      </button>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-6">
        {canViewFullNav && navItems.map((item) => (
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
        ))}
      </nav>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg z-50">
          <ul className="flex flex-col space-y-2 p-4">
            {/* Main Navigation Links */}
            {canViewFullNav && navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block text-sm font-medium transition-colors hover:text-red-600",
                    pathname === item.href ? "text-red-600" : "text-gray-800"
                  )}
                  onClick={() => setIsMenuOpen(false)} // Close menu on link click
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {/* ClientWrapper Links */}
            {canViewFullNav ? (
              <>
                <li>
                  <Link
                    href="/account"
                    className="block text-sm font-medium transition-colors hover:text-red-600 text-gray-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Account
                  </Link>
                </li>
                <li>
                  <button
                    className={cn(
                      "block text-sm font-medium transition-colors text-gray-800",
                      isSigningOut ? "opacity-50 cursor-not-allowed" : "hover:text-red-600"
                    )}
                    disabled={isSigningOut}
                    onClick={async () => {
                      setIsMenuOpen(false);
                      setIsSigningOut(true);

                      try {
                        await fetch("/api/auth/logout", { method: "POST" });
                        await signOut({ callbackUrl: "/sign-in" });
                      } catch (error) {
                        console.error("Error signing out:", error);
                      } finally {
                        setIsSigningOut(false);
                      }
                    }}
                  >
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </button>
                </li>

              </>
            ) : (
              <>
                <li>
                  <Link
                    href="/sign-in"
                    className="block text-sm font-medium transition-colors hover:text-red-600 text-gray-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sign-up"
                    className="block text-sm font-medium transition-colors hover:text-red-600 text-gray-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}

