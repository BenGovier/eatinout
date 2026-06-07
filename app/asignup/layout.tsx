"use client"

import { Header } from "@/components/asignup/header"
import { Footer } from "@/components/asignup/footer"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import "./asignup-styles.css"

export default function AsignupLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, authLoading } = useAuth()
    const router = useRouter()
    const [isReady, setIsReady] = useState(false)

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

    const isUserPotentiallyLoggedIn = typeof window !== "undefined" && document.cookie.includes("auth_token")

    if (!isReady || authLoading || user || (isUserPotentiallyLoggedIn && !user)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FFFBF7]">
                <Spinner />
            </div>
        )
    }

    return (
        <div className="asignup-container min-h-screen flex flex-col font-sans">
            <Header />
            <main className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
    )
}
