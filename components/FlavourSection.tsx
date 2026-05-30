"use client"

import { memo } from "react"

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
  return (
    <section className="bg-[#FAF9F7] border-b border-[#E8E4DF] py-5">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Section header - clean and functional */}
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[#1C1917] mb-1">Explore by venue type</h2>
            <p className="text-sm text-[#78716C]">Filter restaurants, cafés and bars by what you&apos;re looking for.</p>
          </div>

          {/* Horizontal scroll category pills */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 pb-1 min-w-max">
              {isLoading ? (
                // Loading skeleton - simple pills
                [...Array(6)].map((_, i) => (
                  <div key={i} className="h-9 w-24 rounded-full bg-[#E8E4DF] animate-pulse" />
                ))
              ) : cuisineTypes.length > 0 ? (
                cuisineTypes.map((cuisine) => {
                  const isSelected = selectedCuisineIds.includes(cuisine.value)

                  return (
                    <button
                      key={cuisine.value}
                      onClick={() => onCuisineClick(cuisine.value, cuisine.label)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#1C1917] text-white shadow-sm'
                          : 'bg-white text-[#1C1917] border border-[#E8E4DF] hover:border-[#D6D3D1] hover:bg-[#FAF9F7]'
                      }`}
                    >
                      {cuisine.label}
                    </button>
                  )
                })
              ) : (
                <div className="text-sm text-[#78716C] py-2">No categories available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})
