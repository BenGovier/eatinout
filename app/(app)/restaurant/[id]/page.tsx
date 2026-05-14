import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicRestaurantBuildTimePathParams,
  getPublicRestaurantDetailByRouteParam,
} from "@/lib/get-public-restaurant-detail";
import { RestaurantPageClient } from "./restaurant-page-client";

/** Regenerate public restaurant pages in the background (ISR). */
export const revalidate = 3600;

/** Allow URLs not returned from `generateStaticParams` (e.g. new venues, unlisted paths). */
export const dynamicParams = true;

export async function generateStaticParams() {
  return getPublicRestaurantBuildTimePathParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicRestaurantDetailByRouteParam(id);
  if (!result.success) {
    return { title: "Restaurant" };
  }
  const desc = result.restaurant.description;
  return {
    title: result.restaurant.name,
    ...(desc ? { description: desc.slice(0, 160) } : {}),
  };
}

export default async function RestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offerId?: string; offer?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const result = await getPublicRestaurantDetailByRouteParam(id);
  if (!result.success) {
    notFound();
  }
  return (
    <RestaurantPageClient
      routeParam={id}
      initialRestaurant={result.restaurant}
      offerIdFromUrl={sp.offerId ?? null}
      offerSlugFromUrl={sp.offer ?? null}
    />
  );
}
