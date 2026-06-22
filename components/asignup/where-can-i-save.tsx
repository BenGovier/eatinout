"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tag, ChevronLeft, ChevronRight } from "lucide-react"
import { useRef } from "react"
import { trackAsignupEvent } from "@/components/asignup/track"

const featuredRestaurants = [
    {
        name: "Tugra",
        location: "Preston",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tugra-bShvD6ou1S2QNdhR9hRM1y35h21oFK.webp",
        offer: "25% Off",
    },
    {
        name: "Abacus Oriental",
        location: "Middlebrook",
        image: "/images/abacus-oriental-food.jpg",
        offer: "25% Off",
    },
    {
        name: "Tribez",
        location: "Blackburn + Bolton",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tribez-oUtwRgkXXaXrWkW9y9aTMMjLOaBAap.webp",
        offer: "50% Off",
    },
    {
        name: "Turtle Bay",
        location: "Blackpool, Preston + Liverpool",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Turtle%20bay-2d2M8ENNqFeBTsNhza5FIGdo4a3d1t.webp",
        offer: "20% Off",
    },
    {
        name: "The Olive Tree Brasserie",
        location: "Lytham",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/olive%20tree-rxewqkY0xPHNYfNvq5g1mTQ4NduxZ3.webp",
        offer: "25% Off",
    },
    {
        name: "Kings Castle",
        location: "Blackburn, Bolton + Preston",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kings%20castle-mXYpYiyAu73tUgRzvRLT1DMwpH6tKv.webp",
        offer: "Up to 50% Off",
    },
    {
        name: "Boonak Thai",
        location: "Blackpool",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/boonak-SCwavVRYruOXaNf28VFA2rcWHwMzcK.webp",
        offer: "25% Off",
    },
    {
        name: "Levi's Pizzeria",
        location: "Burnley",
        image: "/images/levis-pizza-food.jpg",
        offer: "50% Off",
    },
    {
        name: "Ranchos Steakhouse",
        location: "Liverpool",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rancho-W8WEWg3OE51h9HpuXVScbAW3XeP7jg.webp",
        offer: "50% Off",
    },
    {
        name: "City Winebar + Kitchen",
        location: "Liverpool",
        image: "/images/city-winebar-food.jpg",
        offer: "25% Off",
    },
    {
        name: "Three Guys Woodfired Pizza",
        location: "Standish",
        image: "/images/three-guys-pizza-food.jpg",
        offer: "25% Off",
    },
    {
        name: "Nuvo",
        location: "Poulton",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/nuvo-Hc0tZM0WSgll0LAPhS9XdrRTbn8nEk.webp",
        offer: "50% Off",
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
        <section className="py-10 md:py-14 bg-background">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        Find dining out deals near you
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                        Real EatinOut offers across Lancashire, Bolton and Liverpool. Browse before you join.
                    </p>
                </div>

                {/* Restaurant Carousel */}
                <div className="relative mb-8">
                    {/* Scroll buttons - hidden on mobile */}
                    <button
                        onClick={() => scroll("left")}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Scrollable container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
                    >
                        {featuredRestaurants.map((restaurant, index) => (
                            <div
                                key={index}
                                className="flex-shrink-0 w-[260px] md:w-[300px] snap-start bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                            >
                                {/* Image with offer badge */}
                                <div className="relative h-[170px] md:h-[190px] w-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={restaurant.image}
                                        alt={restaurant.name}
                                        fill
                                        className="object-cover"
                                    />
                                    {/* Offer badge */}
                                    <div className="absolute top-3 left-3">
                                        <div className="rounded-full bg-[#DC3545] text-white font-bold text-sm px-3 py-1.5 shadow-md">
                                            {restaurant.offer}
                                        </div>
                                    </div>
                                </div>

                                {/* Card content */}
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-900 text-base line-clamp-1">
                                        {restaurant.name}
                                    </h3>
                                    <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">
                                        {restaurant.location}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-3">
                                        <Tag className="h-4 w-4 text-[#DC3545]" />
                                        <span className="text-sm font-semibold text-gray-700">
                                            {restaurant.offer}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                    <Button asChild className="rounded-full bg-primary px-8 py-6 text-base font-semibold text-primary-foreground hover:bg-primary/90">
                        <a
                            href="/restaurants"
                            onClick={() => trackAsignupEvent("asignup_browse_restaurants_click")}
                        >
                            Browse all restaurants
                        </a>
                    </Button>
                </div>
            </div>
        </section>
    )
}
