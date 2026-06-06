import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
    return (
        <section className="relative flex min-h-[88vh] w-full items-center justify-center overflow-hidden">
            {/* Full-screen dine-in background image */}
            <Image
                src="/images/asignup-hero-dinein.jpg"
                alt="Friends enjoying a meal together at a restaurant"
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />

            {/* Soft gradient overlay - lighter, only for text readability */}
            <div
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/20"
                aria-hidden="true"
            />

            {/* Hero content */}
            <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-16 text-center">
                <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
                    Save at 500+ restaurants, cafés and bars
                </h1>

                <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/95 drop-shadow sm:text-lg">
                    Enjoy exclusive dine-in discounts and save an average of £23 every time you eat out.
                </p>

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
