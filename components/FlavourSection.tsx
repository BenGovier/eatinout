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
    <section className="bg-[#FFFBF7] border-b border-gray-100 py-4">
      <div className="container mx-auto px-4">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-0.5">Find your restaurant</h2>
          <p className="text-xs text-gray-500">Browse by cuisine or venue type.</p>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-2 min-w-max">
            {isLoading ? (
              // Loading skeleton
              [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 w-[150px] flex-shrink-0 rounded-xl bg-gray-200 animate-pulse"
                />
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
                    aria-pressed={isSelected}
                    className={`relative h-28 w-[150px] flex-shrink-0 overflow-hidden rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC3545] ${
                      isSelected
                        ? "ring-2 ring-[#DC3545] ring-offset-1"
                        : "hover:shadow-md"
                    }`}
                  >
                    {showPlaceholder ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                        <span className="text-white text-3xl font-bold opacity-60">
                          {getInitials(cuisine.label)}
                        </span>
                      </div>
                    ) : (
                      <Image
                        src={cuisine.image || "/placeholder.svg"}
                        alt={cuisine.label}
                        fill
                        sizes="150px"
                        className="object-cover"
                        onError={() => handleImageError(cuisine.value)}
                        loading="lazy"
                        quality={75}
                      />
                    )}

                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    <span className="absolute inset-x-0 bottom-0 p-2.5 text-left text-sm font-semibold leading-snug text-white text-balance drop-shadow-sm">
                      {cuisine.label}
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
