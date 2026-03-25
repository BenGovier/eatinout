"use client";

import { SignOutButton } from "@/components/sign-out-button";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export default function ClientWrapper({ isAuthenticated }: { isAuthenticated: boolean }) {
    const { user  } = useAuth();
    const canViewFullNav = isAuthenticated && user?.role === "user"
    return (
        <>
            {canViewFullNav ? (
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/account">My Account</Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                        <SignOutButton />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/sign-in">Sign In</Link>
                    </Button>
                    <Button size="sm" asChild>
                        <Link href="/sign-up">Sign Up</Link>
                    </Button>
                </div>
            )}
            {canViewFullNav && <MobileNav />}
        </>
    );
}