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
                <div className="text-center mb-10 md:mb-14">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
                        Loved by people who actually eat out
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                        Real savings at real places — without feeling like a delivery app.
                    </p>
                </div>

                {/* Testimonial Cards */}
                <div className="grid gap-4 md:gap-6 md:grid-cols-3 max-w-4xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="bg-card rounded-2xl p-6 shadow-sm border border-border/50"
                        >
                            <Quote className="h-6 w-6 text-primary/30 mb-3" />
                            <p className="text-foreground font-medium mb-4 text-pretty">
                                &ldquo;{testimonial.quote}&rdquo;
                            </p>
                            <p className="text-sm text-muted-foreground">
                                — {testimonial.name}, {testimonial.location}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Trust line */}
                <p className="text-center text-sm text-muted-foreground mt-8">
                    Used by local diners across Lancashire
                </p>
            </div>
        </section>
    )
}
