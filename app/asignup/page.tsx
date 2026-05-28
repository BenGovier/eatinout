"use client"

import { ImageCollage } from "@/components/asignup/image-collage"
import { HeroCard } from "@/components/asignup/hero-card"
import { SocialProof } from "@/components/asignup/social-proof"
import { HowItWorks } from "@/components/asignup/how-it-works"
import { WhereCanISave } from "@/components/asignup/where-can-i-save"
import { ValueReinforcement } from "@/components/asignup/value-reinforcement"
import { FAQSection } from "@/components/asignup/faq-section"
import { FinalCTA } from "@/components/asignup/final-cta"

export default function SignupPage() {
    return (
        <>
            {/* Hero Section */}
            <div className="relative min-h-[520px] md:min-h-[600px] lg:min-h-[680px]">
                <ImageCollage />
                <div className="absolute inset-0 flex items-center justify-center">
                    <HeroCard />
                </div>
            </div>

            {/* Built for Going Out + Ways to Use + Testimonials */}
            <SocialProof />

            {/* How It Works + Local Coverage */}
            <HowItWorks />

            {/* Member Offers Near You */}
            <WhereCanISave />

            {/* Value / Pricing Justification */}
            <ValueReinforcement />

            {/* FAQ */}
            <FAQSection />

            {/* Final CTA */}
            <FinalCTA />
        </>
    )
}
