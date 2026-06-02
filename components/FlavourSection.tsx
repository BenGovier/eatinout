"use client"

import { memo } from "react"
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

// Fallback images for common cuisine types when no image is provided
const FALLBACK_IMAGES: Record<string, string> = {
  'italian': 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=400&q=80',
  'indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  'chinese': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',
  'mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80',
  'thai': 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&q=80',
  'japanese': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
  'american': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80',
  'british': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'mediterranean': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
  'french': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
  'spanish': 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=400&q=80',
  'greek': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'vietnamese': 'https://images.unsplash.com/photo-1503764654157-72d979d9af2f?w=400&q=80',
  'korean': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&q=80',
  'lebanese': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&q=80',
  'turkish': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&q=80',
  'caribbean': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'african': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'bar': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80',
  'bars': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80',
  'pub': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80',
  'pubs': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80',
  'cafe': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
  'coffee': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
  'brunch': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
  'breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
  'dessert': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80',
  'desserts': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80',
  'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
  'steak': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&q=80',
  'steakhouse': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&q=80',
  'seafood': 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80',
  'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'burgers': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'sushi': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
  'healthy': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'vegan': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'vegetarian': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'fast food': 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&q=80',
  'default': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
}

function getFallbackImage(label: string): string {
  const normalizedLabel = label.toLowerCase()
  
  // Check for exact match first
  if (FALLBACK_IMAGES[normalizedLabel]) {
    return FALLBACK_IMAGES[normalizedLabel]
  }
  
  // Check for partial matches
  for (const [key, url] of Object.entries(FALLBACK_IMAGES)) {
    if (normalizedLabel.includes(key) || key.includes(normalizedLabel)) {
      return url
    }
  }
  
  return FALLBACK_IMAGES['default']
}

export const FlavourSection = memo(function FlavourSection({
  cuisineTypes,
  selectedCuisineIds,
  onCuisineClick,
  isLoading = false
}: FlavourSectionProps) {
  return (
    <section className="bg-[#FAF9F7] border-b border-[#E8E4DF] py-6">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Section header */}
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#1C1917] mb-1">Find your restaurant</h2>
            <p className="text-sm text-[#78716C]">Browse by cuisine or venue type to find places where you can use your Eatinout voucher.</p>
          </div>

          {/* Horizontal scroll category cards */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-3 pb-2 min-w-max">
              {isLoading ? (
                // Loading skeleton - card style
                [...Array(6)].map((_, i) => (
                  <div key={i} className="w-[140px] h-[100px] rounded-xl bg-[#E8E4DF] animate-pulse flex-shrink-0" />
                ))
              ) : cuisineTypes.length > 0 ? (
                cuisineTypes.map((cuisine) => {
                  const isSelected = selectedCuisineIds.includes(cuisine.value)
                  const imageUrl = cuisine.image || getFallbackImage(cuisine.label)

                  return (
                    <button
                      key={cuisine.value}
                      onClick={() => onCuisineClick(cuisine.value, cuisine.label)}
                      className={`relative flex-shrink-0 w-[130px] sm:w-[150px] h-[90px] sm:h-[100px] rounded-xl overflow-hidden group transition-all ${
                        isSelected
                          ? 'ring-2 ring-[#DC3545] ring-offset-2 ring-offset-[#FAF9F7] shadow-lg'
                          : 'shadow-md hover:shadow-lg'
                      }`}
                    >
                      {/* Background image */}
                      <Image
                        src={imageUrl}
                        alt={cuisine.label}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="150px"
                      />
                      
                      {/* Warm overlay - darker when selected */}
                      <div className={`absolute inset-0 transition-all ${
                        isSelected 
                          ? 'bg-gradient-to-t from-[#1C1917]/90 via-[#1C1917]/60 to-[#1C1917]/30'
                          : 'bg-gradient-to-t from-[#1C1917]/80 via-[#1C1917]/40 to-[#1C1917]/10 group-hover:from-[#1C1917]/85 group-hover:via-[#1C1917]/50'
                      }`} />
                      
                      {/* Content */}
                      <div className="absolute inset-0 p-3 flex flex-col justify-end">
                        {/* Category name */}
                        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 text-shadow-sm">
                          {cuisine.label}
                        </h3>
                        
                        {/* Subtle label */}
                        <span className={`text-[10px] font-medium mt-0.5 transition-colors ${
                          isSelected ? 'text-[#DC3545]' : 'text-white/70'
                        }`}>
                          {isSelected ? 'Selected' : 'Member venues'}
                        </span>
                      </div>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#DC3545] rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="text-sm text-[#78716C] py-4">No categories available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})
