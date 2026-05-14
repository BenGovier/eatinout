"use client"

import { ImageCollage } from "@/components/asignup/image-collage"
import { HeroCard } from "@/components/asignup/hero-card"

export default function SignupPage() {
    return (
        <div className="relative min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex-1">
            <ImageCollage />
            <div className="absolute inset-0 flex items-center justify-center">
                <HeroCard />
            </div>
        </div>
    )
}
