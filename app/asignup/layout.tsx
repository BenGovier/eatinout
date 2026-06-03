"use client"

import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useMinimumLoader } from "@/components/ui/use-minimum-loader"
import { Button } from "@/components/ui/button"
import "./asignup-styles.css"

export default function AsignupLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, authLoading } = useAuth()
    const router = useRouter()
    const [isReady, setIsReady] = useState(false)

    const isUserPotentiallyLoggedIn = typeof window !== "undefined" && document.cookie.includes("auth_token")

    // Minimum loader duration for branded "Dine Out" loader
    // Always show loader for minimum duration, regardless of auth state
    const showMinimumLoader = useMinimumLoader(authLoading)

    // Actual loading condition (for logic)
    const isActuallyLoading = !isReady || authLoading || (isUserPotentiallyLoggedIn && !user)

    useEffect(() => {
        if (!authLoading) {
            setIsReady(true)
        }
    }, [authLoading])

    useEffect(() => {
        if (!authLoading && user) {
            router.replace("/restaurants")
        }
    }, [user, authLoading, router])

    if (showMinimumLoader || isActuallyLoading || user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FFFBF7]">
                <Spinner />
            </div>
        )
    }

    return (
        <div className="asignup-container min-h-screen flex flex-col font-sans bg-[#FFFBF7]">
            {/* Simple Header */}
            <header className="absolute top-0 left-0 right-0 z-50 px-5 py-4">
                <nav className="flex items-center justify-between max-w-lg mx-auto">
                    <Link href="/asignup" className="flex-shrink-0">
                        <Image
                            src="/images/eatinoutlogo.webp"
                            alt="Eatinout"
                            width={120}
                            height={32}
                            className="h-7 w-auto brightness-0 invert"
                            priority
                        />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/sign-in"
                            className="text-sm font-medium text-white/90 hover:text-white transition-colors"
                        >
                            Sign in
                        </Link>
                        <Button 
                            asChild 
                            size="sm" 
                            className="bg-[#DC3545] hover:bg-[#B91C2C] text-white rounded-full px-4 text-xs font-semibold"
                        >
                            <Link href="/start">Start free</Link>
                        </Button>
                    </div>
                </nav>
            </header>

            <main className="flex-1">
                {children}
            </main>

            {/* Simple Footer */}
            <footer className="py-6 px-5 bg-[#FFFBF7] border-t border-[#E8E4DF]">
                <div className="max-w-lg mx-auto text-center">
                    <p className="text-xs text-[#A8A29E]">
                        © {new Date().getFullYear()} Eatinout. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
