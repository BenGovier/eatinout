import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, QrCode, PiggyBank } from "lucide-react"

const steps = [
    {
        icon: Search,
        title: "Find an offer",
        description: "Browse nearby restaurants, cafés and bars with live dining out deals.",
    },
    {
        icon: QrCode,
        title: "Show your code",
        description: "Choose the offer and show your Eatinout code at the venue.",
    },
    {
        icon: PiggyBank,
        title: "Save money",
        description: "Enjoy the discount, freebie or 2-for-1 deal when you dine out.",
    },
]

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-12 md:py-20 bg-background">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-10 md:mb-14">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground">
                        How Eatinout works
                    </h2>
                </div>

                {/* Steps */}
                <div className="grid gap-6 md:gap-8 md:grid-cols-3 max-w-4xl mx-auto">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className="text-center"
                        >
                            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 text-primary mb-4">
                                <step.icon className="h-7 w-7 md:h-8 md:w-8" />
                            </div>
                            <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                                {step.title}
                            </h3>
                            <p className="text-sm md:text-base text-muted-foreground text-pretty">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-10 md:mt-14">
                    <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-base font-semibold">
                        <Link href="/start">Start saving today</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
