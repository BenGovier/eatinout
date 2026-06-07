import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
    return (
        <section className="relative flex min-h-[65vh] w-full items-end justify-center overflow-hidden">
            {/* Dine-in background image */}
            <Image
                src="/images/asignup-hero-friends.png"
                alt="Friends laughing together over a table full of food at a restaurant"
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />

            {/* Bottom-only gradient: top stays bright, lower portion darkens into a dedicated content area */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.75) 80%, rgba(0,0,0,0.92) 100%)",
                }}
                aria-hidden="true"
            />

            {/* Hero content - sits low over the darker table-edge area */}
            <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center px-6 pb-10 text-center">
                <h1
                    className="text-balance text-[44px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl"
                    style={{ textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}
                >
                    Save up to 50%
                </h1>

                <p
                    className="mt-4 text-pretty text-[22px] font-medium leading-snug text-white sm:text-3xl"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
                >
                    At 500+ restaurants, cafés and bars
                </p>

                <p
                    className="mt-4 text-pretty text-base leading-relaxed text-white"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
                >
                    Members save an average of £23 every time they eat out.
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
