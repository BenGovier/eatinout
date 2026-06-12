import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

const steps = [
    {
        number: "1",
        image: "/images/how-step-browse.png",
        text: "Browse 500+ restaurants, cafés and bars near you.",
    },
    {
        number: "2",
        image: "/images/how-step-code.png",
        text: "Choose an offer and generate your discount code.",
    },
    {
        number: "3",
        image: "/images/how-step-show.png",
        text: "Show the code when you dine and enjoy the savings.",
    },
]

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-12 md:py-20 bg-background">
            <div className="mx-auto max-w-5xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 md:mb-20">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground text-balance">
                        How EatinOut works
                    </h2>
                </div>

                {/* Steps */}
                <div className="flex flex-col gap-16 md:gap-24">
                    {steps.map((step, index) => (
                        <div
                            key={step.number}
                            className={`flex flex-col items-center gap-6 md:gap-12 ${
                                index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                            }`}
                        >
                            {/* Phone mockup */}
                            <div className="relative w-48 sm:w-56 md:w-64 shrink-0">
                                <Image
                                    src={step.image || "/placeholder.svg"}
                                    alt={`Step ${step.number}: ${step.text}`}
                                    width={512}
                                    height={512}
                                    className="w-full h-auto"
                                />
                            </div>

                            {/* Text */}
                            <div className="text-center md:text-left max-w-sm">
                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-base font-bold mb-4">
                                    {step.number}
                                </span>
                                <p className="text-xl md:text-2xl font-semibold text-foreground text-balance leading-snug">
                                    {step.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-16 md:mt-24">
                    <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-base font-semibold">
                        <Link href="/start">Start saving today</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
