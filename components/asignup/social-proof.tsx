import { Quote } from "lucide-react"

const testimonials = [
    {
        quote: "Used it once and it already paid for itself.",
        name: "Sarah",
        location: "Preston",
    },
    {
        quote: "We saved £18 on a meal out. No faff, just showed the code.",
        name: "James",
        location: "Blackpool",
    },
    {
        quote: "Great for finding somewhere local without paying full price.",
        name: "Emma",
        location: "Lytham St Annes",
    },
]

export function SocialProof() {
    return (
        <section className="py-12 md:py-20 bg-secondary/30">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground">
                        Loved by people who eat out
                    </h2>
                </div>

                {/* Testimonial Cards - smaller and more compact */}
                <div className="grid gap-3 md:gap-4 md:grid-cols-3 max-w-3xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="bg-card rounded-xl p-4 shadow-sm border border-border/50"
                        >
                            <Quote className="h-4 w-4 text-primary/30 mb-2" />
                            <p className="text-sm text-foreground font-medium mb-2 text-pretty">
                                &ldquo;{testimonial.quote}&rdquo;
                            </p>
                            <p className="text-xs text-muted-foreground">
                                — {testimonial.name}, {testimonial.location}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Trust line */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                    Used by local diners in Lancashire, Liverpool and Bolton
                </p>
            </div>
        </section>
    )
}
