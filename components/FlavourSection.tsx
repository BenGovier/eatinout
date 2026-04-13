"use client"

import { useState, memo } from "react"
import Image from "next/image"

type CuisineType = {
  value: string
  label: string
  image?: string
}

interface FlavourSectionProps {
  cuisineTypes: CuisineType[]
  selectedCuisineIds: string[]
  onCuisineClick: (cuisineId: string, cuisineLabel: string) => void
  isLoading?: boolean
}

export const FlavourSection = memo(function FlavourSection({
  cuisineTypes,
  selectedCuisineIds,
  onCuisineClick,
  isLoading = false
}: FlavourSectionProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = (cuisineId: string) => {
    setImageErrors(prev => new Set(prev).add(cuisineId))
  }

  const getInitials = (label: string) => {
    return label.charAt(0).toUpperCase()
  }

  return (
    <section className="bg-[#FFFBF7] border-b border-gray-100 py-3">
      <div className="container mx-auto px-4 md:block hidden">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-800 mb-0.5">Popular searches</h2>
          {/* <p className="text-xs text-gray-400">Where you going?</p> */}
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-2 min-w-max">
            {isLoading ? (
              // Loading skeleton
              [...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-md bg-gray-200 animate-pulse" />
                  <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
              ))
            ) : cuisineTypes.length > 0 ? (
              cuisineTypes.map((cuisine) => {
                const isSelected = selectedCuisineIds.includes(cuisine.value)
                const hasImageError = imageErrors.has(cuisine.value)
                const showPlaceholder = !cuisine.image || hasImageError

                return (
                  <button
                    key={cuisine.value}
                    onClick={() => onCuisineClick(cuisine.value, cuisine.label)}
                    className={`flex flex-col items-center gap-2 group transition-all ${isSelected ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                      }`}
                  >
                    <div
                      className={`relative w-16 h-16 rounded-md overflow-hidden border transition-all ${isSelected
                          ? 'border-[#DC3545] shadow-sm'
                          : 'border-transparent'
                        }`}
                    >
                      {showPlaceholder ? (
                        <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                          <span className="text-white text-xl font-bold">
                            {getInitials(cuisine.label)}
                          </span>
                        </div>
                      ) : (
                        <Image
                          src={cuisine.image || "/placeholder.svg"}
                          alt={cuisine.label}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(cuisine.value)}
                          loading="lazy"
                          fetchPriority="high"
                          quality={75}
                        />
                      )}
                    </div>

                    <span
                      className={`block text-xs font-medium transition-all leading-snug ${isSelected
                        ? 'text-[#DC3545] font-semibold'
                        : 'text-gray-600 group-hover:text-[#DC3545] group-hover:font-semibold'
                        }`}
                    >
                      {cuisine.label.split(' ').length > 2 ? (
                        <>
                          {cuisine.label.split(' ').slice(0, 2).join(' ')}
                          <br />
                          {cuisine.label.split(' ').slice(2).join(' ')}
                        </>
                      ) : (
                        cuisine.label
                      )}
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="text-sm text-gray-500 py-4">No flavours available</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
})