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
    <section className="bg-[#FAF9F7] border-b border-[#E8E4DF] py-4">
      <div className="container mx-auto px-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#1C1917] mb-0.5">Browse by type</h2>
          <p className="text-xs text-[#78716C]">Find places to use your member offer</p>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-2 min-w-max">
            {isLoading ? (
              // Loading skeleton
              [...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse" />
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
                    className={`flex flex-col items-center gap-1.5 group transition-all ${isSelected ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                      }`}
                  >
                    <div
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shadow-sm ${isSelected
                          ? 'border-[#DC3545] shadow-md'
                          : 'border-[#E8E4DF] hover:border-[#D6D3D1]'
                        }`}
                    >
                      {showPlaceholder ? (
                        <div className="w-full h-full bg-gradient-to-br from-[#78716C] to-[#57534E] flex items-center justify-center">
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
                      className={`block text-[11px] font-medium transition-all leading-tight text-center max-w-[64px] ${isSelected
                        ? 'text-[#DC3545] font-semibold'
                        : 'text-[#57534E] group-hover:text-[#1C1917]'
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
              <div className="text-sm text-[#78716C] py-4">No categories available</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
})
