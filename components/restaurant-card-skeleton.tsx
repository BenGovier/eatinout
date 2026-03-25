import { Skeleton } from "@/components/ui/skeleton"

export function RestaurantCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
      <Skeleton className="h-[130px] w-full" />
      <div className="p-3 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-1.5 pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  )
}