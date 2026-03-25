"use client"

import React, { useState, useEffect, useCallback } from "react"
import InfiniteScroll from "react-infinite-scroll-component"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Tag, Calendar, Clock, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Define interface for restaurant info
interface RestaurantInfo {
    _id: string;
    name: string;
    area: string;
    cuisine: string;
    image: string | null;
    category: { _id: string | null; name: string | null } | Array<{ _id: string | null; name: string | null }>;
}

// Define interface for offer data
interface Offer {
    _id: string;
    title: string;
    description: string;
    validDays: string;
    validHours: string;
    expiryDate: Date;
    terms: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    restaurant: RestaurantInfo;
}

// Pagination interface
interface Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

// Skeleton loader for desktop table
const DesktopTableSkeleton = () => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Expiry</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {[...Array(5)].map((_, index) => (
                <TableRow key={index} className="animate-pulse">
                    <TableCell>
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
                            <div>
                                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-24"></div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </TableCell>
                    <TableCell>
                        <div className="h-6 bg-gray-200 rounded w-24"></div>
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

// Skeleton loader for mobile cards
const MobileCardSkeleton = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-14 w-14 bg-gray-200 rounded-md"></div>
                    </div>
                    <div className="border-t pt-3 mt-3">
                        <div className="flex items-center mb-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3 mr-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="flex flex-wrap gap-y-2 justify-between text-sm mt-2">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full mt-2"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
);

// Format date for display
const formatDate = (date: string | null | undefined) => {
    if (!date) return "Running until further notice";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "Running until further notice";
    return dateObj.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
};

export default function AdminOffersPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({
        total: 0,
        page: 1,
        limit: 10,
        pages: 0
    });

    const fetchOffers = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/admin/offers?page=${page}&limit=10`);

            if (!response.ok) {
                throw new Error("Failed to fetch offers");
            }

            const data = await response.json();

            if (data.success) {
                // Append new offers to existing offers
                setOffers(prevOffers => 
                    page === 1 ? data.offers : [...prevOffers, ...data.offers]
                );
                
                // Update pagination
                setPagination(data.pagination);
                
                // Check if there are more offers to load
                setHasMore(page < data.pagination.pages);
            } else {
                throw new Error(data.message || "Failed to fetch offers");
            }
        } catch (error) {
            console.error("Error fetching offers:", error);
            setError(error instanceof Error ? error.message : "An error occurred");
        } finally {
            setIsLoading(false);
            setIsInitialLoading(false);
        }
    }, [page]);

    useEffect(() => {
        document.title = 'Offers';
        fetchOffers();
    }, [page, fetchOffers]);

    // Truncate description text
    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mt-4">
                <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <h3 className="font-bold">Error</h3>
                </div>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Active Offers</h1>
                <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                    {pagination.total} active offers
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-red-700">All Active Offers</CardTitle>
                        <CardDescription>
                            Showing all active offers from restaurants
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isInitialLoading ? (
                            <DesktopTableSkeleton />
                        ) : offers.length > 0 ? (
                            <InfiniteScroll
                                dataLength={offers.length}
                                next={() => setPage(prevPage => prevPage + 1)}
                                hasMore={hasMore}
                                loader={
                                    <div className="sticky bottom-0 left-0 right-0 bg-white/80 flex justify-center items-center py-4 z-10">
                                        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                                    </div>
                                }
                                endMessage={
                                    <div className="sticky bottom-0 left-0 right-0 bg-white text-center py-4 text-gray-500 z-10">
                                        No more offers to load
                                    </div>
                                }
                            >
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white z-10">
                                        <TableRow>
                                            <TableHead>Offer</TableHead>
                                            <TableHead>Restaurant</TableHead>
                                            <TableHead>Valid Period</TableHead>
                                            <TableHead>Expiry</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {offers.map((offer, index) => (
                                            <TableRow 
                                                key={offer._id} 
                                                className="hover:bg-opacity-5 hover:bg-red-100"
                                            >
                                                <TableCell>
                                                    <div className="font-medium text-red-700">{truncateText(offer.title, 20)}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {truncateText(offer.description, 40)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-3">
                                                        {offer.restaurant.image ? (
                                                            <div className="relative h-10 w-10 rounded-md overflow-hidden">
                                                                <Image
                                                                    src={offer.restaurant.image}
                                                                    alt={offer.restaurant.name}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                                                                <Tag className="h-5 w-5 text-gray-500" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-medium">{offer.restaurant.name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {Array.isArray(offer.restaurant.area)
                                                                    ? offer.restaurant.area.map(area => area.name).join(", ")
                                                                    : offer.restaurant.area}
                                                                • {Array.isArray(offer.restaurant.category)
                                                                    ? offer.restaurant.category.map(cat => cat.name).filter(Boolean).join(", ")
                                                                    : offer.restaurant.category?.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-1 text-gray-700">
                                                        <Calendar className="h-4 w-4 mr-1 text-red-600" />
                                                        <span>{offer.validDays}</span>
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        <span>{offer.validHours}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="inline-block border border-red-200 text-red-700 px-2 py-1 rounded-full text-sm">
                                                        {formatDate(offer.expiryDate ? offer.expiryDate.toString() : null)}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>
                        ) : (
                            <div className="text-center py-8">
                                <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium">No Active Offers</h3>
                                <p className="text-gray-500 mt-2">There are no active offers at the moment.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden">
                <InfiniteScroll
                    dataLength={offers.length}
                    next={() => setPage(prevPage => prevPage + 1)}
                    hasMore={hasMore}
                    height={600}
                    loader={
                        <div className="sticky bottom-0 left-0 right-0 bg-white/80 flex justify-center items-center py-4 z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                        </div>
                    }
                    endMessage={
                        <div className="sticky bottom-0 left-0 right-0 bg-white text-center py-4 text-gray-500 z-10">
                            No more offers to load
                        </div>
                    }
                >
                    {isInitialLoading ? (
                        <MobileCardSkeleton />
                    ) : offers.length > 0 ? (
                        offers.map((offer) => (
                            <Card 
                                key={offer._id} 
                                className="shadow-sm hover:shadow-md transition-shadow mb-4"
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-red-700">{truncateText(offer.title, 20)}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {truncateText(offer.description, 80)}
                                            </p>
                                        </div>
                                        {offer.restaurant.image ? (
                                            <div className="relative h-14 w-14 rounded-md overflow-hidden ml-3 flex-shrink-0">
                                                <Image
                                                    src={offer.restaurant.image}
                                                    alt={offer.restaurant.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-14 w-14 rounded-md bg-gray-200 flex items-center justify-center ml-3 flex-shrink-0">
                                                <Tag className="h-6 w-6 text-gray-500" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t pt-3 mt-3">
                                        <div className="flex items-center mb-2">
                                            <div className="bg-red-50 px-2 py-1 rounded-full text-xs text-red-600 font-medium mr-2">
                                                {Array.isArray(offer.restaurant.category)
                                                    ? offer.restaurant.category.map(cat => cat.name).filter(Boolean).join(", ")
                                                    : offer.restaurant.category?.name}
                                            </div>
                                            <div className="text-sm text-gray-500">{offer.restaurant.name} •  {Array.isArray(offer.restaurant.area)
                                                ? offer.restaurant.area.map(area => area.name).join(", ")
                                                : offer.restaurant.area}</div>
                                        </div>

                                        <div className="flex flex-wrap gap-y-2 justify-between text-sm mt-2">
                                            <div className="flex items-center space-x-1 text-gray-700">
                                                <Calendar className="h-3 w-3 text-red-600" />
                                                <span className="text-xs">{offer.validDays}</span>
                                            </div>
                                            <div className="flex items-center text-gray-600">
                                                <Clock className="h-3 w-3 mr-1" />
                                                <span className="text-xs">{offer.validHours}</span>
                                            </div>
                                            <div className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs w-full mt-2 text-center">
                                                Expires: {formatDate(offer.expiryDate ? offer.expiryDate.toString() : null)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-8 bg-white rounded-lg shadow-sm p-6">
                            <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No Active Offers</h3>
                            <p className="text-gray-500 mt-2">There are no active offers at the moment.</p>
                        </div>
                    )}
                </InfiniteScroll>
            </div>
        </div>
    );
}

