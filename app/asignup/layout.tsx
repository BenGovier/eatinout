"use client"

import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useMinimumLoader } from "@/components/ui/use-minimum-loader"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/asignup/footer"
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

    // Minimum loader duration for branded loader
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
            {/* Header with Logo */}
            <header className="absolute top-0 left-0 right-0 z-50">
                {/* Dark overlay for header readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
                <nav className="relative flex items-center justify-between px-5 py-4 max-w-7xl mx-auto">
                    <Link href="/asignup" className="flex items-center">
                        <img 
                            src="/images/eatinoutlogo.webp" 
                            alt="EATINOUT" 
                            className="h-8 sm:h-10 brightness-0 invert"
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

            {/* Shared Site Footer */}
            <Footer />
        </div>
    )
}
