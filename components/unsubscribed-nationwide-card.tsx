"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"

interface Offer {
  title: string
  totalCodes?: number
  codesRedeemed?: number
}

interface UnsubscribedNationwideCardProps {
  name: string
  image: string
  offersCount: number
  firstOffer?: Offer
  onClick?: () => void
}

export function UnsubscribedNationwideCard({ name, image, offersCount, firstOffer, onClick }: UnsubscribedNationwideCardProps) {
  const getOfferDiscount = () => {
    if (!firstOffer) return null
    const match = firstOffer.title.match(/(\d+%\s*off|\d+-for-\d+)/i)
    return match ? match[0] : firstOffer.title.substring(0, 15)
  }

  const getRemainingCount = () => {
    if (!firstOffer?.totalCodes) return null
    const remaining = firstOffer.totalCodes - (firstOffer.codesRedeemed || 0)
    return remaining > 0 ? remaining : null
  }

  const discount = getOfferDiscount()
  const remaining = getRemainingCount()

  return (
    <div
      className="flex-shrink-0 w-[240px] group cursor-pointer transition-transform hover:scale-[1.02] duration-200"
      style={{ scrollSnapAlign: "start" }}
      onClick={onClick}
    >
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
        <div className="relative h-[130px] w-full overflow-hidden">
          <Image src={image || "/placeholder.svg"} alt={name} fill className="object-cover" />
          
          {discount && (
            <div className="absolute top-2 left-0 flex items-stretch">
              <div className="bg-[#eb221c] text-white font-semibold text-xs px-2 py-1">
                {discount}
              </div>
              {remaining && (
                <div className="bg-white text-[#eb221c] font-medium text-xs px-2 py-1">
                  {remaining} left!
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 space-y-1.5 relative">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1 pr-2">{name}</h3>
            <button 
              className="text-gray-300 hover:text-[#eb221c] transition-colors flex-shrink-0"
              aria-label="Add to favourites"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>

          <p className="text-gray-500 text-xs">Nationwide</p>

          <Button className="w-full bg-[#eb221c] hover:bg-[#eb221c]/90 text-white font-semibold text-xs py-1.5 mt-1">
            Unlock {offersCount === 1 ? "1 Offer" : `${offersCount} Offers`}
          </Button>
        </div>
      </div>
    </div>
  )
}
