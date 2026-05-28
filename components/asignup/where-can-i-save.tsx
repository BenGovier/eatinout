"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { useRef } from "react"

const featuredRestaurants = [
    {
        name: "Turtle Bay",
        location: "Blackpool",
        postcode: "FY1",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Turtle%20bay-2d2M8ENNqFeBTsNhza5FIGdo4a3d1t.webp",
        offer: "20% off food when you visit",
    },
    {
        name: "Tugra",
        location: "Preston",
        postcode: "PR1",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tugra-bShvD6ou1S2QNdhR9hRM1y35h21oFK.webp",
        offer: "25% off your bill",
    },
    {
        name: "Tribez",
        location: "Blackburn",
        postcode: "BB1",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tribez-oUtwRgkXXaXrWkW9y9aTMMjLOaBAap.webp",
        offer: "50% off mains",
    },
    {
        name: "The Olive Tree Brasserie",
        location: "Lytham",
        postcode: "FY8",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/olive%20tree-rxewqkY0xPHNYfNvq5g1mTQ4NduxZ3.webp",
        offer: "25% off food",
    },
    {
        name: "Kings Castle",
        location: "Preston",
        postcode: "PR1",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kings%20castle-mXYpYiyAu73tUgRzvRLT1DMwpH6tKv.webp",
        offer: "Up to 50% off",
    },
    {
        name: "Boonak Thai",
        location: "Blackpool",
        postcode: "FY1",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/boonak-SCwavVRYruOXaNf28VFA2rcWHwMzcK.webp",
        offer: "25% off food",
    },
    {
        name: "Ranchos Steakhouse",
        location: "Liverpool",
        postcode: "L1",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rancho-W8WEWg3OE51h9HpuXVScbAW3XeP7jg.webp",
        offer: "50% off mains",
    },
    {
        name: "Nuvo",
        location: "Poulton",
        postcode: "FY6",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/nuvo-Hc0tZM0WSgll0LAPhS9XdrRTbn8nEk.webp",
        offer: "50% off food",
    },
    {
        name: "Abacus Oriental",
        location: "Middlebrook",
        postcode: "BL6",
        image: "/images/abacus-oriental-food.jpg",
        offer: "25% off your bill",
    },
    {
        name: "Levi's Pizzeria",
        location: "Burnley",
        postcode: "BB11",
        image: "/images/levis-pizza-food.jpg",
        offer: "50% off pizzas",
    },
    {
        name: "City Winebar + Kitchen",
        location: "Liverpool",
        postcode: "L2",
        image: "/images/city-winebar-food.jpg",
        offer: "25% off food",
    },
    {
        name: "Three Guys Woodfired Pizza",
        location: "Standish",
        postcode: "WN6",
        image: "/images/three-guys-pizza-food.jpg",
        offer: "25% off your order",
    },
]

export function WhereCanISave() {
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 320
            scrollContainerRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            })
        }
    }

    return (
        <section className="py-12 md:py-20 bg-[#FAF9F7]">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-4xl font-bold text-[#1C1917] mb-3">
                        Member offers near you
                    </h2>
                    <p className="text-[#57534E] text-sm md:text-base max-w-xl mx-auto text-pretty">
                        Explore restaurants, cafes and bars across Lancashire with member-only offers you can use when you visit.
                    </p>
                </div>

                {/* Restaurant Carousel */}
                <div className="relative mb-10">
                    {/* Scroll buttons - hidden on mobile */}
                    <button
                        onClick={() => scroll("left")}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-11 h-11 rounded-full bg-white shadow-lg border border-[#E8E4DF] items-center justify-center hover:bg-[#FAF9F7] transition-colors"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-5 h-5 text-[#1C1917]" />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-11 h-11 rounded-full bg-white shadow-lg border border-[#E8E4DF] items-center justify-center hover:bg-[#FAF9F7] transition-colors"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-5 h-5 text-[#1C1917]" />
                    </button>

                    {/* Scrollable container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
                    >
                        {featuredRestaurants.map((restaurant, index) => (
                            <div
                                key={index}
                                className="flex-shrink-0 w-[280px] md:w-[300px] snap-start bg-white rounded-2xl shadow-sm border border-[#E8E4DF] overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Image with badge */}
                                <div className="relative h-[160px] md:h-[180px] w-full overflow-hidden">
                                    <Image
                                        src={restaurant.image}
                                        alt={restaurant.name}
                                        fill
                                        className="object-cover"
                                    />
                                    {/* Subtle gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                    
                                    {/* Member offer badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 text-[#DC3545] text-xs font-semibold shadow-sm">
                                            MEMBER OFFER
                                        </span>
                                    </div>
                                </div>

                                {/* Card content */}
                                <div className="p-4 md:p-5">
                                    <h3 className="font-semibold text-[#1C1917] text-base md:text-lg line-clamp-1">
                                        {restaurant.name}
                                    </h3>
                                    <p className="text-[#78716C] text-sm mt-1">
                                        {restaurant.location} &bull; {restaurant.postcode}
                                    </p>
                                    
                                    {/* Offer */}
                                    <p className="text-[#1C1917] text-sm font-medium mt-3 pb-3 border-b border-[#E8E4DF]">
                                        {restaurant.offer}
                                    </p>

                                    {/* CTA and footer */}
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-xs text-[#78716C]">
                                            Included with Eatinout
                                        </span>
                                        <span className="inline-flex items-center text-[#DC3545] text-sm font-medium">
                                            View offer
                                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                    <Button asChild variant="outline" className="rounded-full px-8 py-6 text-base font-medium border-[#E8E4DF] bg-white hover:bg-[#FAF9F7] text-[#1C1917]">
                        <Link href="/restaurants">
                            Browse all restaurants
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
