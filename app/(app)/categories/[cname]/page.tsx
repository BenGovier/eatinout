"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { RedeemAnimation } from "@/components/redeem-animation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowLeft } from "lucide-react";

interface Restaurant {
    _id: string;
    name: string;
    description: string;
    cuisine: string;
    priceRange: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    area: string;
    phone: string;
    email: string;
    website: string;
    openingHours: {
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
        sunday: string;
    };
    images: string[];
    status: string;
    dineIn: boolean;
    dineOut: boolean;
    offers: Array<{
        _id: string;
        title: string;
        description: string;
        validDays: string;
        validHours: string;
        expiryDate: string;
        terms: string;
        status: string;
        dineIn: boolean;
        dineOut: boolean;
        offerType: string;
    }>;
    categoryName: string;
    addressLink: string;
    deliveryAvailable: boolean;
    menuPdfUrls?: string[] | any;
}

const weekOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

// Helper function moved outside component since it doesn't depend on component state
function getOrderedValidDays(validDays: string) {
    if (!validDays || validDays.trim() === "") return "N/A";
    if (validDays.trim().toLowerCase() === "all week") return "All week";

    // Split and trim
    const daysArray = validDays.split(",").map(day => day.trim());
    // Sort according to weekOrder
    const ordered = weekOrder.filter(day => daysArray.includes(day));
    return ordered.join(", ");
}

export default function CategoryDetailPage() {
    let { cname } = useParams();
    const router = useRouter();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [redeemLoadingId, setRedeemLoadingId] = useState<string | null>(null);
    const [redeemError, setRedeemError] = useState(false)
    const [openDialogId, setOpenDialogId] = useState<string | null>(null);
    
    // Request deduplication - prevent multiple simultaneous requests
    const fetchingRef = useRef(false);

    useEffect(() => {
        document.title = `Category: ${decodeURIComponent(cname as string)}`
    }, [cname])

    const fetchRestaurants = useCallback(async () => {
        // Prevent duplicate requests
        if (fetchingRef.current) {
            return;
        }

        try {
            fetchingRef.current = true;
            setLoading(true);
            setError(null);
            
            const encodedCname = encodeURIComponent(cname as string);
            const response = await fetch(`/api/categories/${encodedCname}`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'max-age=300' // Cache for 5 minutes
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch restaurants: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setRestaurants(data.restaurants || []);
            } else if (!data.restaurants || data.restaurants.length === 0) {
                setRestaurants([]);
            } else {
                throw new Error(data.message || "Failed to fetch restaurants");
            }
        } catch (err: any) {
            console.error("Error fetching restaurants:", err);
            setError(err.message || "Failed to load restaurants");
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [cname]);

    useEffect(() => {
        fetchRestaurants();
    }, [fetchRestaurants]);

    if (loading) {
        // return <div className="container px-4 py-6">Loading...</div>;
        return (
            <div className="container px-4 py-6">
                <h1 className="text-2xl font-bold mb-6">Loading Restaurants...</h1>
                <div className="grid grid-cols-1 gap-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="p-4 flex flex-col md:flex-row border rounded-lg shadow animate-pulse bg-white"
                        >
                            {/* Image placeholder */}
                            <div className="w-full md:w-1/3 h-48 bg-gray-200 rounded mb-4 md:mb-0 md:mr-4" />

                            {/* Text placeholder */}
                            <div className="w-full md:w-2/3 space-y-3">
                                <div className="h-6 bg-gray-200 rounded w-1/2" /> {/* Restaurant name */}
                                <div className="h-4 bg-gray-200 rounded w-1/3" /> {/* Badge/Delivery */}
                                <div className="h-4 bg-gray-200 rounded w-full" /> {/* Description line 1 */}
                                <div className="h-4 bg-gray-200 rounded w-5/6" /> {/* Description line 2 */}
                                <div className="h-4 bg-gray-200 rounded w-2/3" /> {/* Address/Cuisine */}
                                <div className="h-4 bg-gray-200 rounded w-1/2" /> {/* Phone/Menu */}
                                <div className="h-10 w-32 bg-gray-200 rounded mt-2" /> {/* Button */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container px-4 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-10 w-10 rounded-full hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold">{decodeURIComponent(cname as string)} Restaurants</h1>
                </div>
                <div className="text-center py-8">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button
                        onClick={() => fetchRestaurants()}
                        className="bg-primary hover:bg-primary/90 text-white"
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    const handleRedeem = async (offerId: string, offerRestaurantId: string) => {
        setRedeemLoadingId(offerId);
        try {
            const response = await fetch("/api/wallet", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    offerId,
                    offerStatus: "redeemed",
                    offerRestaurantId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 410) {
                    // Offer fully claimed
                    toast.error(data.message || "This offer has reached its redemption limit");
                } else if (response.status === 409) {
                    // Already redeemed by this user
                    toast.error("You have already redeemed this offer");
                } else {
                    toast.error(data.error || "Failed to redeem offer");
                }
                setRedeemError(true);
                return;
            }

            setRedeemError(true);

            // Close the dialog
            setOpenDialogId(null);

            setTimeout(() => {
                window.location.href = `/wallet`;
            }, 500);
        } catch (err) {
            toast.error("An error occurred while redeeming the offer");
            console.error("Error redeeming offer:", err);
            setRedeemError(true);
        } finally {
            setRedeemLoadingId(null);
        }
    };

    return (
        <div className="container px-4 py-6">
            <RedeemAnimation isVisible={redeemError} onComplete={() => setRedeemError(false)} />

            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="h-10 w-10 rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">{decodeURIComponent(cname as string)} Restaurants</h1>
            </div>

            {restaurants.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No restaurants found in this category.</p>
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {restaurants.map((restaurant) => (
                        <Card key={restaurant._id} className="h-full hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col md:flex-row">
                                <div className="w-full md:w-1/3 mb-4 md:mb-0 md:mr-4 h-fit relative">
                                    {restaurant.images && restaurant.images.length > 0 ? (
                                        <Image
                                            src={restaurant.images[0]}
                                            alt={restaurant.name}
                                            width={400}
                                            height={192}
                                            className="w-full h-48 object-cover rounded"
                                            loading="lazy"
                                            quality={85}
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-gray-200 rounded flex items-center justify-center">
                                            <span className="text-gray-400">No image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="w-full md:w-2/3">
                                    <div className="flex flex-col md:flex-row justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-xl">{restaurant.name}</h3>
                                            {restaurant.deliveryAvailable && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                                Delivery Available
                                            </Badge>}
                                        </div>
                                        {restaurant.offers && restaurant.offers.length > 0 && (
                                            <Dialog open={openDialogId === restaurant._id} onOpenChange={(isOpen) => !isOpen && setOpenDialogId(null)}>
                                                <DialogTrigger
                                                    onClick={() => setOpenDialogId(restaurant._id)}
                                                    className="bg-red-500 text-white px-4 py-2  rounded hover:bg-red-600 mb-6 md:mb-0"
                                                >
                                                    View Offers ({restaurant.offers.length})
                                                </DialogTrigger>
                                                <DialogContent className="w-[90vw] max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-semibold">Offers at {restaurant.name}</DialogTitle>
                                                    </DialogHeader>

                                                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
                                                        {restaurant.offers.map((offer: any) => (
                                                            <Card key={offer._id} className="p-6 relative shadow-lg border border-gray-200 rounded-lg bg-white">
                                                                <div className="space-y-4">
                                                                    <h4 className="font-semibold text-2xl text-gray-800">{offer.title}</h4>
                                                                    <div className="space-y-3 text-sm text-gray-600">
                                                                        {offer.description.split("\n").map((line: any, index: any) => (
                                                                            <p key={index}>{line.trim()}</p>
                                                                        ))}
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                                                                        <p><span className="font-semibold">Valid Days:</span> {getOrderedValidDays(offer?.validDays)}</p>
                                                                        <p><span className="font-semibold">Valid Hours:</span> {offer?.validHours}</p>
                                                                        <p>
                                                                            <span className="font-semibold">Expires:</span>{' '}
                                                                            {offer.expiryDate
                                                                                ? new Date(offer.expiryDate).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
                                                                                : 'Until Further Notice'}
                                                                        </p>

                                                                        <p><span className="font-semibold">Type:</span> {offer.offerType}</p>
                                                                    </div>

                                                                    {offer.terms && (
                                                                        <div className="mt-4">
                                                                            <p className="text-sm font-semibold text-gray-800">Terms & Conditions:</p>
                                                                            <div className="space-y-3 text-sm text-gray-600 mt-3">
                                                                                {offer.terms.split("\n").map((line: any, index: any) => (
                                                                                    <p key={index}>{line.trim()}</p>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="mt-6">
                                                                        <Button
                                                                            onClick={() => handleRedeem(offer._id, offer.associatedId)}
                                                                            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg"
                                                                            disabled={redeemLoadingId === offer._id}
                                                                        >
                                                                            {redeemLoadingId === offer._id ? "Loading..." : "Add to wallet"}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </DialogContent>


                                            </Dialog>

                                        )}
                                    </div>
                                    <div className="space-y-3 text-sm text-gray-600 mb-2">
                                        {restaurant.description.split("\n").map((line: string, index: number) => (
                                            <p key={index}>{line.trim()}</p>
                                        ))}
                                    </div>                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="mb-2">
                                                {restaurant.address ? (
                                                    restaurant.addressLink ? (
                                                        <a
                                                            href={restaurant.addressLink}
                                                            className="text-sm text-blue-600 hover:underline block"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {`${restaurant.address}, ${restaurant.city || ""}${restaurant.city && restaurant.zipCode ? ", " : ""}${restaurant.zipCode?.toUpperCase() || ""}`}
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            {`${restaurant.address}, ${restaurant.city || ""}${restaurant.city && restaurant.zipCode ? ", " : ""}${restaurant.zipCode?.toUpperCase() || ""}`}
                                                        </p>
                                                    )
                                                ) : null}
                                            </div>
                                            <div className="mb-2">
                                                <p className="text-sm"><span className="font-medium">Cuisine:</span> {restaurant.categoryName}</p>
                                                {/* <p className="text-sm"><span className="font-medium">Price Range:</span> {restaurant.priceRange}</p> */}
                                            </div>
                                            <div className="mb-2">
                                                <p className="text-sm"><span className="font-medium">Phone:</span> {restaurant.phone}</p>
                                                {/* <p className="text-sm"><span className="font-medium">Email:</span> {restaurant.email}</p> */}
                                            </div>
                                            {restaurant.menuPdfUrls && restaurant.menuPdfUrls.length > 0 && (
                                                <div className="mt-2 text-sm flex flex-wrap items-center gap-1">
                                                    {restaurant.menuPdfUrls.map((url: any, index: any) => (
                                                        <span key={index} className="flex items-center gap-1">
                                                            <FileText className="h-4 w-4 text-gray-500" />
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-red-600 hover:text-red-800 font-medium"
                                                            >
                                                                View Menu{restaurant.menuPdfUrls.length > 1 ? ` ${index + 1}` : ""}
                                                            </a>
                                                            {index < restaurant.menuPdfUrls.length - 1 && (
                                                                <span className="text-gray-500">,</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
