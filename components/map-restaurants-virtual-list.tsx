"use client";

import { memo, useLayoutEffect, useMemo, useState, type MouseEvent } from "react";
import Image from "next/image";
import { Heart, Tag } from "lucide-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

/** Roughly 7 rows of 3 — below this, plain grid is cheaper than window virtualization. */
export const MAP_LIST_VIRTUAL_THRESHOLD = 21;

export type MapVirtualRestaurant = {
  id: string;
  slug?: string;
  name: string;
  city?: string;
  zipCode?: string;
  imageUrl?: string;
  offers?: Array<{
    title?: string;
    totalCodes?: number | null;
    codesRedeemed?: number;
  }>;
};

function chunkIntoRows<T>(items: T[], cols: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols));
  }
  return rows;
}

/** Matches Tailwind `md` / `lg` breakpoints used by the map grid. */
export function useMapListColumnCount(): number {
  const [cols, setCols] = useState(1);

  useLayoutEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (w >= 1024) setCols(3);
      else if (w >= 768) setCols(2);
      else setCols(1);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return cols;
}

const MapRestaurantGridCard = memo(function MapRestaurantGridCard({
  restaurant,
  isFavorite,
  favoriteLoading,
  onNavigate,
  onHeartClick,
}: {
  restaurant: MapVirtualRestaurant;
  isFavorite: boolean;
  favoriteLoading: boolean;
  onNavigate: (pathSegment: string) => void;
  onHeartClick: (e: MouseEvent, id: string, name: string) => void;
}) {
  const offers =
    restaurant.offers?.map((offer) => ({
      discount: offer.title,
      unlimited: !offer.totalCodes,
      remainingCount: offer.totalCodes
        ? offer.totalCodes - (offer.codesRedeemed || 0)
        : undefined,
    })) || [];
  const heroOffer = offers[0];

  return (
    <div
      onClick={() =>
        onNavigate(restaurant.slug?.trim() ? restaurant.slug : restaurant.id)
      }
      className="w-full"
    >
      <div className="w-full">
        <div className="cursor-pointer overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="relative h-[130px] w-full overflow-hidden">
            <Image
              src={restaurant.imageUrl || "/placeholder.svg"}
              alt={restaurant.name}
              fill
              className="object-cover"
              loading="lazy"
              quality={75}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            <div className="absolute left-0 top-2 flex items-stretch">
              <div className="bg-[#eb221c] px-2 py-1 text-xs font-semibold text-white">
                {heroOffer?.discount}
              </div>
              {!heroOffer?.unlimited &&
                (heroOffer?.remainingCount && heroOffer.remainingCount > 0 ? (
                  <div className="bg-white px-2 py-1 text-xs font-medium text-[#eb221c]">
                    {heroOffer.remainingCount} left!
                  </div>
                ) : (
                  <div className="bg-white px-2 py-1 text-xs font-medium text-gray-500">
                    More coming soon
                  </div>
                ))}
            </div>
          </div>

          <div className="relative space-y-1.5 p-3">
            <div className="flex items-start justify-between">
              <h3 className="line-clamp-1 flex-1 pr-2 text-sm font-semibold text-gray-900">
                {restaurant.name}
              </h3>
              <button
                type="button"
                className={cn(
                  "flex-shrink-0 transition-colors",
                  isFavorite
                    ? "text-[#eb221c]"
                    : "text-gray-300 hover:text-[#eb221c]",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  onHeartClick(e, restaurant.id, restaurant.name);
                }}
                disabled={favoriteLoading}
                aria-label={
                  isFavorite ? "Remove from favourites" : "Add to favourites"
                }
              >
                {favoriteLoading ? (
                  <svg
                    className="h-4 w-4 animate-spin text-[#eb221c]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFavorite ? "fill-[#eb221c]" : "",
                    )}
                  />
                )}
              </button>
            </div>

            <p className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block h-3 w-3 text-gray-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              {restaurant.city}
              <span className="text-gray-400">·</span>
              {restaurant.zipCode}
            </p>

            <div className="-mx-3 overflow-x-auto px-3 scrollbar-hide">
              <div className="flex items-center gap-1.5">
                {offers.map((offer, index) => (
                  <div
                    key={index}
                    className="flex flex-shrink-0 items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1"
                  >
                    <Tag className="h-2.5 w-2.5 text-[#eb221c]" />
                    <span className="whitespace-nowrap text-[10px] font-medium text-gray-700">
                      {offer.discount}
                    </span>
                    {!offer.unlimited &&
                      (offer.remainingCount && offer.remainingCount > 0 ? (
                        <span className="whitespace-nowrap text-[10px] text-gray-400">
                          {offer.remainingCount} left
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-[10px] text-orange-500">
                          More coming soon
                        </span>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export function MapRestaurantsVirtualList({
  restaurants,
  favorites,
  favoritesLoading,
  onNavigate,
  onHeartClick,
}: {
  restaurants: MapVirtualRestaurant[];
  favorites: Set<string>;
  favoritesLoading: Set<string>;
  onNavigate: (pathSegment: string) => void;
  onHeartClick: (e: MouseEvent, id: string, name: string) => void;
}) {
  const cols = useMapListColumnCount();
  const rows = useMemo(
    () => chunkIntoRows(restaurants, cols),
    [restaurants, cols],
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 320,
    overscan: 6,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {items.map((virtualRow) => {
        const row = rows[virtualRow.index];
        if (!row?.length) return null;

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {row.map((restaurant) => (
              <MapRestaurantGridCard
                key={restaurant.id}
                restaurant={restaurant}
                isFavorite={favorites.has(restaurant.id)}
                favoriteLoading={favoritesLoading.has(restaurant.id)}
                onNavigate={onNavigate}
                onHeartClick={onHeartClick}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
