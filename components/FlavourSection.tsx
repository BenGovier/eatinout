"use client"

import { useState, memo } from "react"
import Image from "next/image"
import { Ticket } from "lucide-react"

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
    <section className="bg-[#FAF9F7] border-b border-[#E8E4DF] py-5">
      <div className="container mx-auto px-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#1C1917] mb-1">Ways to use your membership</h2>
          <p className="text-xs text-[#78716C] leading-relaxed">Pick a place to visit, show your voucher code, and save when you eat out.</p>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-2 min-w-max">
            {isLoading ? (
              // Loading skeleton - taller card style
              [...Array(6)].map((_, i) => (
                <div key={i} className="w-[140px] h-[96px] rounded-2xl bg-gray-200 animate-pulse" />
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
                    className={`group transition-all flex-shrink-0`}
                  >
                    {/* Premium membership collection card - taller */}
                    <div
                      className={`relative w-[140px] h-[96px] rounded-2xl overflow-hidden border transition-all ${
                        isSelected
                          ? 'border-[#DC3545] bg-[#FFFCF9] shadow-md'
                          : 'border-[#E8E4DF] bg-[#FFFCF9] hover:border-[#D6D3D1] hover:shadow-sm'
                      }`}
                    >
                      {/* Subtle image/gradient background */}
                      <div className="absolute inset-0">
                        {showPlaceholder ? (
                          <div className="w-full h-full bg-gradient-to-br from-[#FDF8F4] via-[#FAF5F0] to-[#F5EDE6]" />
                        ) : (
                          <>
                            <Image
                              src={cuisine.image || "/placeholder.svg"}
                              alt={cuisine.label}
                              fill
                              className="object-cover opacity-20"
                              onError={() => handleImageError(cuisine.value)}
                              loading="lazy"
                              quality={60}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#FFFCF9] via-[#FFFCF9]/90 to-[#FFFCF9]/70" />
                          </>
                        )}
                      </div>

                      {/* Text-first content - more vertical space */}
                      <div className="relative h-full flex flex-col justify-between p-3">
                        {/* Small icon indicator */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected 
                            ? 'bg-[#DC3545]/15' 
                            : 'bg-[#1C1917]/5'
                        }`}>
                          {showPlaceholder ? (
                            <span className={`text-[10px] font-bold ${
                              isSelected ? 'text-[#DC3545]' : 'text-[#78716C]'
                            }`}>
                              {getInitials(cuisine.label)}
                            </span>
                          ) : (
                            <Ticket className={`h-2.5 w-2.5 ${
                              isSelected ? 'text-[#DC3545]' : 'text-[#78716C]'
                            }`} />
                          )}
                        </div>

                        {/* Main label and supporting text */}
                        <div className="text-left">
                          <span
                            className={`block text-[13px] font-semibold leading-tight ${
                              isSelected
                                ? 'text-[#DC3545]'
                                : 'text-[#1C1917] group-hover:text-[#DC3545]'
                            }`}
                          >
                            {cuisine.label}
                          </span>
                          <span className="block text-[9px] text-[#78716C] mt-0.5 uppercase tracking-wide">
                            Member venues
                          </span>
                        </div>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#DC3545]" />
                      )}
                    </div>
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
