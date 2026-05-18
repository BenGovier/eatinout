"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { ImageCollage } from "@/components/asignup/image-collage"
import { HeroCard } from "@/components/asignup/hero-card"

export default function SignupPage() {
    const { isAuthenticated, authLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace("/restaurants")
        }
    }, [isAuthenticated, authLoading, router])

    if (authLoading || isAuthenticated) {
        return <div className="min-h-screen bg-background" />
    }

    return (
        <div className="relative min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex-1">
            <ImageCollage />
            <div className="absolute inset-0 flex items-center justify-center">
                <HeroCard />
            </div>
        </div>
    )
}
