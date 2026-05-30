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
    <section className="bg-gradient-to-b from-[#FFFCF9] to-[#FAF9F7] border-b border-[#E8E4DF] py-6">
      <div className="container mx-auto px-4">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#1C1917] mb-1.5">Ways to use your membership</h2>
          <p className="text-sm text-[#78716C] leading-relaxed">Pick a place to visit, show your voucher code, and save when you eat out.</p>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-2 min-w-max">
            {isLoading ? (
              // Loading skeleton - premium card style
              [...Array(6)].map((_, i) => (
                <div key={i} className="w-[150px] h-[110px] rounded-2xl bg-gradient-to-br from-[#FAF9F7] to-[#F5F3F0] animate-pulse" />
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
                    {/* Premium membership collection card */}
                    <div
                      className={`relative w-[150px] h-[110px] rounded-2xl overflow-hidden transition-all ${
                        isSelected
                          ? 'shadow-lg shadow-[#DC3545]/15 ring-2 ring-[#DC3545]'
                          : 'shadow-md hover:shadow-lg hover:scale-[1.02]'
                      }`}
                    >
                      {/* Background with warm gradient */}
                      <div className={`absolute inset-0 ${
                        isSelected 
                          ? 'bg-gradient-to-br from-[#FFFCF9] via-[#FDF8F4] to-[#FCF5EF]'
                          : 'bg-gradient-to-br from-[#FFFCF9] via-[#FAF9F7] to-[#F8F5F2]'
                      }`} />
                      
                      {/* Subtle image background */}
                      {!showPlaceholder && (
                        <>
                          <Image
                            src={cuisine.image || "/placeholder.svg"}
                            alt={cuisine.label}
                            fill
                            className="object-cover opacity-15"
                            onError={() => handleImageError(cuisine.value)}
                            loading="lazy"
                            quality={60}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#FFFCF9] via-[#FFFCF9]/80 to-[#FFFCF9]/60" />
                        </>
                      )}

                      {/* Border */}
                      <div className={`absolute inset-0 rounded-2xl border ${
                        isSelected ? 'border-[#DC3545]' : 'border-[#E8E4DF]'
                      }`} />

                      {/* Content */}
                      <div className="relative h-full flex flex-col justify-between p-3.5">
                        {/* Top row: icon badge */}
                        <div className="flex items-start justify-between">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected 
                              ? 'bg-gradient-to-br from-[#DC3545] to-[#B91C2C] shadow-lg shadow-[#DC3545]/25' 
                              : 'bg-[#1C1917]/5 group-hover:bg-[#DC3545]/10'
                          }`}>
                            {showPlaceholder ? (
                              <span className={`text-sm font-bold ${
                                isSelected ? 'text-white' : 'text-[#78716C] group-hover:text-[#DC3545]'
                              }`}>
                                {getInitials(cuisine.label)}
                              </span>
                            ) : (
                              <Ticket className={`h-4 w-4 ${
                                isSelected ? 'text-white' : 'text-[#78716C] group-hover:text-[#DC3545]'
                              }`} />
                            )}
                          </div>
                          
                          {/* Selected indicator */}
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#DC3545] shadow-sm" />
                          )}
                        </div>

                        {/* Bottom: text labels */}
                        <div className="text-left">
                          <span
                            className={`block text-sm font-bold leading-tight mb-0.5 ${
                              isSelected
                                ? 'text-[#DC3545]'
                                : 'text-[#1C1917] group-hover:text-[#DC3545]'
                            }`}
                          >
                            {cuisine.label}
                          </span>
                          <span className={`block text-[10px] font-medium uppercase tracking-wider ${
                            isSelected ? 'text-[#DC3545]/70' : 'text-[#78716C]'
                          }`}>
                            Voucher venues
                          </span>
                        </div>
                      </div>
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
