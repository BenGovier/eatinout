import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Restaurant {
  id: string
  slug?: string
  name: string
  cuisine: string
  location: string
  area: string
  rating: number
  dealsCount: number
  imageUrl: string
  offerNames: string[]
  dineIn?: boolean
  dineOut?: boolean
  category: any
  deliveryAvailable?: boolean
}

interface RestaurantCardProps {
  restaurant: Restaurant
  onNavigate?: (href: string) => void
}

export function RestaurantCard({ restaurant, onNavigate }: RestaurantCardProps) {
  const pathSegment = restaurant.slug?.trim() || restaurant.id
  const handleClick = (href: string) => {
    if (onNavigate) {
      onNavigate(href)
    } else {
      // Fallback for direct navigation if onNavigate not provided
      window.location.href = href
    }
  }

  return (
    <div className="h-fit"> {/* Wrapper div with h-fit */}
      <Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
        <div className="relative h-48 w-full flex-shrink-0">
          <button
            onClick={() => handleClick(`/restaurant/${pathSegment}`)}
            className="block w-full h-full cursor-pointer"
          >
            <Image
              src={restaurant.imageUrl || "/placeholder.svg"}
              alt={restaurant.name}
              fill
              placeholder="blur"
              blurDataURL="/placeholder.svg"
              className="object-cover"
              priority={restaurant.dealsCount > 0}
            />
          </button>
          {restaurant.dealsCount > 0 && (
            <Badge className="absolute top-2 right-2 bg-red-600 hover:bg-red-700">
              {restaurant.dealsCount} {restaurant.dealsCount === 1 ? "Offer" : "Offers"}
            </Badge>
          )}
        </div>

        <CardContent className="p-4 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">{restaurant.name}</h3>
            <div className="flex items-center gap-1">
              {restaurant.dineIn && (
                <Badge variant="outline" className=" border-black-300" title="Dine In">
                  <Image src="/images/Dinein.webp" alt="Dine In" width={25} height={25} />
                </Badge>
              )}
              {restaurant.dineOut && (
                <Badge variant="outline" className=" border-black-300" title="Takeaway">
                  <Image src="/images/takeaway.webp" alt="Takeaway" width={25} height={25} />
                </Badge>
              )}
              {restaurant.deliveryAvailable && (
                <Badge variant="outline" className=" border-black-300" title="Delivery Available">
                  <Image src="/images/Delivery.webp" alt="Delivery Available" width={25} height={25} />
                </Badge>
              )}
            </div>
          </div>

          <div className="flex space-x-2 mb-4">
            <span className="text-sm text-gray-500">
              {restaurant?.category?.map((element: any) => element.name).join(", ")}
            </span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{restaurant.location}</span>
          </div>

          <div className="mt-auto">
            {restaurant.dealsCount === 0 ? (
              <Button
                onClick={() => handleClick(`/restaurant/${pathSegment}`)}
                variant="outline"
                className="w-full text-white hover:text-white bg-red-600 hover:bg-red-600"
              >
                View Restaurant
              </Button>
            ) : restaurant.offerNames.length === 1 ? (
              <Button
                onClick={() => handleClick(`/restaurant/${pathSegment}`)}
                variant="outline"
                className="w-full text-white hover:text-white bg-red-600 hover:bg-red-600 h-10 overflow-hidden"
                title={restaurant.offerNames[0]}
              >
                <span className="block truncate whitespace-nowrap overflow-hidden w-full text-sm">
                  {restaurant.offerNames[0]}
                </span>
              </Button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {restaurant.offerNames.map((name, index) => (
                  <Button
                    key={index}
                    onClick={() => handleClick(`/restaurant/${pathSegment}`)}
                    variant="outline"
                    className={`text-white hover:text-white bg-red-600 hover:bg-red-700 h-10 overflow-hidden w-full`}
                    title={name}
                  >
                    <span className="block truncate whitespace-nowrap overflow-hidden w-full text-sm" title={name}>
                      {name}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
