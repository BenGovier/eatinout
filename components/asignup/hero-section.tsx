import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const benefits = ["Restaurants, cafés & bars", "Up to 50% off food & drinks", "7 days free", "Cancel anytime"]

export function HeroSection() {
    return (
        <section className="relative flex min-h-[92vh] w-full items-end justify-center overflow-hidden">
            {/* Full-screen dine-in background image */}
            <Image
                src="/images/asignup-hero-sharing.jpg"
                alt="Friends sharing plates of food together at a restaurant table"
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />

            {/* Vertical gradient overlay - transparent top, strong bottom for readability */}
            <div
                className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/30 to-black/85"
                aria-hidden="true"
            />

            {/* Hero content - anchored to bottom 45% over the darker section */}
            <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pb-12 pt-0 text-center">
                <h1 className="text-balance text-[30px] font-bold leading-[1.1] tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
                    Save up to 50% at 500+ restaurants
                </h1>

                <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-white/95 drop-shadow sm:text-lg">
                    Members save an average of £23 every time they eat out. Start with a 7-day free trial.
                </p>

                {/* Trust / benefit row - compact, 2 columns on mobile */}
                <ul className="mt-5 grid w-full max-w-md grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:justify-center">
                    {benefits.map((benefit) => (
                        <li
                            key={benefit}
                            className="flex items-center gap-1.5 text-left text-[13px] font-medium text-white/95 drop-shadow sm:text-sm"
                        >
                            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            {benefit}
                        </li>
                    ))}
                </ul>

                <div className="mt-7 flex w-full flex-col gap-3 sm:max-w-md">
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
