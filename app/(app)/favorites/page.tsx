"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Heart, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "react-toastify";

export default function FavoriteRestaurantsPage() {
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();

    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [offerIndices, setOfferIndices] = useState<Record<string, number>>({});
    const [likedStatus, setLikedStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace("/sign-in");
            return;
        }

        const fetchFavorites = async () => {
            try {
                const res = await fetch("/api/favorites", {
                    credentials: "include",
                    cache: "no-store",
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data.success) {
                    const restaurants = data.restaurants || [];
                    setFavorites(restaurants);

                    // Initialize liked status
                    const initialLiked: Record<string, boolean> = {};
                    restaurants.forEach((r: any) => {
                        const id = r.id || r._id;
                        initialLiked[id] = true;
                    });
                    setLikedStatus(initialLiked);
                } else {
                    console.warn(data.message);
                }
            } catch (err) {
                console.error("Failed to load favorites:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [isAuthenticated, router]);


    const toggleFavorite = useCallback(
        async (restaurant: any) => {
            if (!user) return;

            const rid = restaurant.id || restaurant._id;

            try {
                const res = await fetch("/api/favorites/toggle", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        restaurantId: rid,
                        userId: user.userId,
                    }),
                });

                const data = await res.json();

                if (data.success) {
                    setLikedStatus((prev) => ({ ...prev, [rid]: data.liked }));

                    if (!data.liked) {
                        // Remove from list when unliked (same behavior)
                        setFavorites((prev) =>
                            prev.filter((r) => (r.id || r._id) !== rid)
                        );
                    }
                }
            } catch (err) {
                console.error("Toggle favorite failed:", err);
                // Silent failure (no toast)
            }
        },
        [user]
    );


    const updateOfferIndex = useCallback((rid: string, newIndex: number) => {
        setOfferIndices((prev) => ({ ...prev, [rid]: newIndex }));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
                Loading your favourite restaurants...
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold">My Favourites</h1>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Back
                </button>
            </div>

            {favorites.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground mb-4">
                        You haven’t added any restaurants to your favourites yet.
                    </p>
                    <p className="text-sm text-muted-foreground/80">
                        Start exploring and tap the heart icon to save your favourite places!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                    {favorites.map((restaurant) => {
                        const rid = restaurant.id || restaurant._id;
                        const liked = likedStatus[rid] ?? true;
                        const offers = restaurant.offers || [];

                        // Calculate remaining count for first offer
                        const firstOffer = offers[0];
                        const remainingCount = firstOffer?.totalCodes
                            ? firstOffer.totalCodes - (firstOffer.codesRedeemed || 0)
                            : undefined;

                        return (
                            <div
                                key={rid}
                                onClick={async () => {
                                    if (user && user.role === "user" &&  (user.subscriptionStatus === "inactive" || user.subscriptionStatus === "cancelled")) {
                                        try {
                                            const response = await fetch("/api/payment/create-checkout-session", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ email: user.email }),
                                            });
                                            const { url } = await response.json();
                                            if (response.ok && url) {
                                                sessionStorage.setItem('redirectUrl', `/restaurant/${rid}`);
                                                window.location.replace(url);
                                            } else {
                                                toast.error("Failed to initiate checkout");
                                            }
                                        } catch (error) {
                                            console.error("Stripe Checkout error:", error);
                                            toast.error("Failed to redirect to payment.");
                                        }
                                        return;
                                    }
                                    router.push(`/restaurant/${rid}`);
                                }}
                                className="w-full"
                            >
                                <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 cursor-pointer">
                                    {/* Image Section */}
                                    <div className="relative h-[130px] w-full overflow-hidden">
                                        <Image
                                            src={restaurant.imageUrl || restaurant.images?.[0] || "/placeholder.svg"}
                                            alt={restaurant.name || "Restaurant"}
                                            fill
                                            className="object-cover"
                                            loading="lazy"
                                            quality={85}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                                            }}
                                        />

                                        {/* Offer Badge - Top Left */}
                                        {firstOffer && (
                                            <div className="absolute top-2 left-0 flex items-stretch">
                                                <div className="bg-[#eb221c] text-white font-semibold text-xs px-2 py-1">
                                                    {firstOffer.title}
                                                </div>
                                                {!firstOffer.isUnlimited && !firstOffer.runUntilFurther && remainingCount && remainingCount > 0 && (
                                                    <div className="bg-white text-[#eb221c] font-medium text-xs px-2 py-1">
                                                        {remainingCount} left!
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-3 space-y-1.5 relative">
                                        {/* Title and Heart */}
                                        <div className="flex items-start justify-between">
                                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1 pr-2">
                                                {restaurant.name || "Unknown Restaurant"}
                                            </h3>
                                            <button
                                                className={`transition-colors flex-shrink-0 ${liked
                                                    ? "text-[#eb221c]"
                                                    : "text-gray-300 hover:text-[#eb221c]"
                                                    }`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleFavorite(restaurant);
                                                }}
                                                aria-label={liked ? "Remove from favourites" : "Add to favourites"}
                                            >
                                                <Heart
                                                    className={`h-4 w-4 ${liked ? "fill-[#eb221c]" : ""}`}
                                                />
                                            </button>
                                        </div>

                                        {/* Location */}
                                        <p className="text-gray-500 text-xs flex items-center gap-1">
                                            <span className="inline-block w-3 h-3 text-gray-400">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                            </span>
                                            {restaurant.city || "Unknown city"} ({restaurant.zipCode || "—"})
                                        </p>

                                        {/* Horizontal Scrollable Offers */}
                                        {offers.length > 0 && (
                                            <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    {offers.map((offer: any, index: number) => {
                                                        const offerRemaining = offer.totalCodes
                                                            ? offer.totalCodes - (offer.codesRedeemed || 0)
                                                            : undefined;
                                                        const isUnlimited = offer.isUnlimited || offer.runUntilFurther || !offer.totalCodes;

                                                        return (
                                                            <div
                                                                key={index}
                                                                onClick={async (e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (user && user.role === "user" && (user.subscriptionStatus === "inactive" || user.subscriptionStatus === "cancelled")                                                                    ) {
                                                                        try {
                                                                            const response = await fetch("/api/payment/create-checkout-session", {
                                                                                method: "POST",
                                                                                headers: { "Content-Type": "application/json" },
                                                                                body: JSON.stringify({ email: user.email }),
                                                                            });
                                                                            const { url } = await response.json();
                                                                            if (response.ok && url) {
                                                                                sessionStorage.setItem('redirectUrl', `/restaurant/${rid}?offerId=${offer._id}`);
                                                                                window.location.replace(url);
                                                                            } else {
                                                                                toast.error("Failed to initiate checkout");
                                                                            }
                                                                        } catch (error) {
                                                                            console.error("Stripe Checkout error:", error);
                                                                            toast.error("Failed to redirect to payment.");
                                                                        }
                                                                        return;
                                                                    }
                                                                    router.push(`/restaurant/${rid}?offerId=${offer._id}`);
                                                                }}
                                                                className="flex-shrink-0 flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1"
                                                            >
                                                                <Tag className="h-2.5 w-2.5 text-[#eb221c]" />
                                                                <span className="text-[10px] font-medium text-gray-700 whitespace-nowrap">
                                                                    {offer.title}
                                                                </span>
                                                                {!isUnlimited && offerRemaining && offerRemaining > 0 && (
                                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                                        {offerRemaining} left
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
