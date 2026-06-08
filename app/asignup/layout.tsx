"use client"

import { Header } from "@/components/asignup/header"
import { Footer } from "@/components/asignup/footer"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import "./asignup-styles.css"

export default function AsignupLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, authLoading } = useAuth()
    const router = useRouter()

    // Logged-in users are redirected to /restaurants in the background.
    // Public users always see the landing page immediately (no loader gate).
    useEffect(() => {
        if (!authLoading && user) {
            router.replace("/restaurants")
        }
    }, [user, authLoading, router])

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
