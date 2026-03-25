"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Utensils, List, Wallet, User, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/restaurants", label: "Restaurants" },
  { href: "/categories", label: "Categories" },
  { href: "/wallet", label: "Wallet" },
  { href: "/account/contact", label: "Contact" },
];

export function MainNav2({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);


  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      setIsMenuOpen(false);
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut({ callbackUrl: "/sign-in" });
    } catch (error) {
      console.error("Sign-out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="md:hidden">
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="absolute top-16 left-0 w-full bg-white shadow-lg z-50">
          <ul className="flex flex-col space-y-2 p-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block text-sm font-medium transition-colors hover:text-red-600",
                    pathname === item.href ? "text-red-600" : "text-gray-800"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {isAuthenticated ? (
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
                    className="flex items-center text-sm font-medium transition-colors text-gray-800 hover:text-red-600"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                        Signing Out...
                      </div>
                    ) : (
                      "Sign Out"
                    )}
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

      {/* Sticky Footer Navigation */}
      <footer className="fixed bottom-0 w-screen bg-red-600 text-white py-4 z-50">
        <nav className="flex justify-around items-center">
          {navItems.map((item, index) => {
            const labels = ["Restaurants", "Categories", "Wallet"];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs font-medium transition-colors hover:text-gray-200 text-white"
              >
                <span>{labels[index]}</span>
              </Link>
            );
          })}

          {isAuthenticated && (
            <Link
              href="/account"
              className="text-xs font-medium transition-colors hover:text-gray-200 text-white"
            >
              <span>My Account</span>
            </Link>
          )}

          {isAuthenticated && (
            <button
              className="flex items-center justify-center text-xs font-medium transition-colors hover:text-gray-200 text-white"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                // <LogOut />
                "Log Out"
              )}
            </button>
          )}
        </nav>
      </footer>
    </div>
  );
}
