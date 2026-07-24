import { Star } from "lucide-react"

const reviews = [
    { quote: "Saved £27 on our first meal.", name: "Ben G.", location: "Preston" },
    { quote: "Used it once and it paid for itself.", name: "Sarah M.", location: "Blackpool" },
    { quote: "No faff. Just showed the code.", name: "James T.", location: "Lytham" },
    { quote: "We eat out way more now.", name: "Emma R.", location: "Bolton" },
    { quote: "Brilliant for date night.", name: "Dan K.", location: "Liverpool" },
]

export function SocialProof() {
    return (
        <section className="py-10 md:py-14 bg-secondary/30">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* App Store style rating header */}
                <div className="text-center mb-6 md:mb-8">
                    <div className="flex items-center justify-center gap-1 mb-2" aria-hidden="true">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-5 w-5 fill-[#F5A623] text-[#F5A623]" />
                        ))}
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-foreground leading-tight text-balance">
                        Rated 4.8 by EatinOut members
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Real savings at local restaurants
                    </p>
                </div>

                {/* Horizontal snap-scroll review cards */}
                <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                    <ul className="flex gap-3 md:gap-4 pb-2 md:justify-center">
                        {reviews.map((review, index) => (
                            <li
                                key={index}
                                className="snap-start shrink-0 w-[230px] md:w-[240px]"
                            >
                                <div className="h-[130px] flex flex-col justify-between rounded-2xl bg-card p-4 shadow-sm border border-border/40">
                                    <div>
                                        <div className="flex items-center gap-0.5 mb-2" aria-hidden="true">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className="h-3.5 w-3.5 fill-[#F5A623] text-[#F5A623]" />
                                            ))}
                                        </div>
                                        <p className="text-sm font-semibold text-foreground text-pretty leading-snug">
                                            &ldquo;{review.quote}&rdquo;
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {review.name} · {review.location}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}
