"use client"

import { ImageCollage } from "@/components/asignup/image-collage"
import { HeroCard } from "@/components/asignup/hero-card"
import { SocialProof } from "@/components/asignup/social-proof"
import { HowItWorks } from "@/components/asignup/how-it-works"
import { ValueReinforcement } from "@/components/asignup/value-reinforcement"
import { WhereCanISave } from "@/components/asignup/where-can-i-save"
import { FAQSection } from "@/components/asignup/faq-section"
import { FinalCTA } from "@/components/asignup/final-cta"

export default function SignupPage() {
    return (
        <>
            {/* Hero Section */}
            <div className="relative min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
                <ImageCollage />
                <div className="absolute inset-0 flex items-center justify-center">
                    <HeroCard />
                </div>
            </div>

            {/* Social Proof */}
            <SocialProof />

            {/* How It Works */}
            <HowItWorks />

            {/* Value Reinforcement */}
            <ValueReinforcement />

            {/* Where Can I Save */}
            <WhereCanISave />

            {/* FAQ */}
            <FAQSection />

            {/* Final CTA */}
            <FinalCTA />
        </>
    )
}
