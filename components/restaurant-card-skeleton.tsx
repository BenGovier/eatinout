import { Skeleton } from "@/components/ui/skeleton"

export function RestaurantCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
        <div className="space-y-1.5 p-2.5">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
    )
  }

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
