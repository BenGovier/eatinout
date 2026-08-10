import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getPublicRestaurantBuildTimePathParams,
  getPublicRestaurantDetailByRouteParam,
} from "@/lib/get-public-restaurant-detail";
import { RestaurantPageClient } from "./restaurant-page-client";

/** Regenerate public restaurant pages in the background (ISR). */
export const revalidate = 3600;

/** Allow URLs not returned from `generateStaticParams` (e.g. new venues, unlisted paths). */
export const dynamicParams = true;

// export async function generateStaticParams() {
//   // Returning an empty array prevents excessive DB queries during build
//   // which causes the Vercel build to hang. Pages will be generated on-demand (ISR).
//   return [];
// }

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPublicRestaurantDetailByRouteParam(id);
  if (!result.success) {
    notFound();
  }
  return (
    <Suspense>
      <RestaurantPageClient
        routeParam={id}
        initialRestaurant={result.restaurant}
      />
    </Suspense>
  );
}
