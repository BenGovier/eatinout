"use client"

import { HeroSection } from "@/components/asignup/hero-section"
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
            <HeroSection />

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
