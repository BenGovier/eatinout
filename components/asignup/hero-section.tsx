import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const benefits = ["500+ venues", "Up to 50% off", "7 days free", "Cancel anytime"]

export function HeroSection() {
    return (
        <section className="relative flex min-h-[92vh] w-full items-center justify-center overflow-hidden">
            {/* Full-screen dine-in background image */}
            <Image
                src="/images/asignup-hero-sharing.jpg"
                alt="Friends sharing plates of food together at a restaurant table"
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />

            {/* Subtle dark overlay - only for text readability */}
            <div
                className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25"
                aria-hidden="true"
            />

            {/* Hero content */}
            <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-16 text-center">
                <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
                    Up to 50% off food and drinks at 500+ restaurants, cafés and bars
                </h1>

                <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/95 drop-shadow sm:text-lg">
                    Members save an average of £23 every time they eat out. Start with a 7-day free trial.
                </p>

                {/* Trust / benefit row */}
                <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                    {benefits.map((benefit) => (
                        <li
                            key={benefit}
                            className="flex items-center gap-1.5 text-sm font-medium text-white/95 drop-shadow"
                        >
                            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            {benefit}
                        </li>
                    ))}
                </ul>

                <div className="mt-8 flex w-full flex-col gap-3 sm:max-w-md">
                    {/* Primary - Eatinout red */}
                    <Button
                        asChild
                        size="lg"
                        className="w-full rounded-full bg-primary py-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                        <Link href="/restaurants">See restaurants</Link>
                    </Button>

                    {/* Secondary - black */}
                    <Button
                        asChild
                        size="lg"
                        className="w-full rounded-full bg-black py-6 text-base font-semibold text-white hover:bg-black/85"
                    >
                        <Link href="#how-it-works">Learn more</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
