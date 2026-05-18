import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroCard() {
    return (
        <div className="relative z-10 mx-auto max-w-lg px-4 py-2 md:py-0">
            <div className="rounded-2xl md:rounded-3xl bg-card/95 backdrop-blur-sm p-4 md:p-10 shadow-2xl border border-border/50">
                <div className="text-center space-y-2.5 md:space-y-5">
                    {/* Headline */}
                    <h1 className="text-xl md:text-4xl font-bold tracking-tight text-card-foreground text-balance">
                        Your go-to for dining out deals
                    </h1>

                    {/* Subheadline */}
                    <p className="text-sm md:text-xl font-semibold text-card-foreground">
                        Eatinout saves you money.
                    </p>

                    {/* Body */}
                    <p className="text-xs md:text-base text-muted-foreground leading-relaxed text-pretty">
                        Unlock offers at restaurants, cafes, bars & more near you — including up to 50% off, 2-for-1 deals and freebies.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col gap-2 md:gap-3 pt-1 md:pt-2">
                        <Button
                            asChild
                            size="lg"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm md:text-base font-semibold py-4 md:py-6"
                        >
                            <Link href="/sign-up">
                                Get 7 days free now!
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full rounded-full text-sm md:text-base font-medium py-4 md:py-6 border-border hover:bg-secondary"
                        >
                            <Link href="/start?path=learn">Learn more about Eatinout</Link>
                        </Button>
                    </div>

                    {/* Text link */}
                    <a
                        href="https://www.eatinout.com"
                        className="inline-block text-xs md:text-sm font-medium text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
                    >
                        See where you can save
                    </a>
                </div>
            </div>
        </div>
    )
}
