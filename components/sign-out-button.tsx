"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut as nextAuthSignOut } from "next-auth/react";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      await nextAuthSignOut({ callbackUrl: "/sign-in" });
    } catch (error) {
      console.error("Error during sign-out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div
      onClick={handleSignOut}
      className="flex items-center text-red-600 w-full cursor-pointer"
      role="button"
    >
      {isSigningOut ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
          <span>Signing Out</span>
        </div>
      ) : (
        <>
          <LogOut className="h-5 w-5 mr-2" />
          <span>Sign Out</span>
        </>
      )}
    </div>
  );
}
