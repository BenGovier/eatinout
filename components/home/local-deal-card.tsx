"use client"

import type React from "react"
import Image from "next/image"
import { Heart, MapPin, Tag } from "lucide-react"

type LocalDealCardProps = {
  name: string
  imageUrl?: string
  location?: string
  bestOfferTitle?: string
  offerCount: number
  isFavorite: boolean
  isFavoriteLoading: boolean
  onOpen: () => void
  onToggleFavorite: (e: React.MouseEvent) => void
}

export function LocalDealCard({
  name,
  imageUrl,
  location,
  bestOfferTitle,
  offerCount,
  isFavorite,
  isFavoriteLoading,
  onOpen,
  onToggleFavorite,
}: LocalDealCardProps) {
  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`View ${name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb221c] focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt=""
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          quality={75}
          sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
        />

        {offerCount > 0 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-gray-900/75 px-2 py-0.5 text-[11px] font-semibold leading-5 text-white backdrop-blur-sm">
            {offerCount} {offerCount === 1 ? "offer" : "offers"}
          </span>
        )}

        <button
          type="button"
          className={`absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur-sm transition-colors ${isFavorite ? "text-[#eb221c]" : "text-gray-600 hover:text-[#eb221c]"}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleFavorite(e)
          }}
          onKeyDown={(e) => e.stopPropagation()}
          disabled={isFavoriteLoading}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
        >
          {isFavoriteLoading ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-[#eb221c]/25 border-t-[#eb221c]"
              aria-hidden="true"
            />
          ) : (
            <Heart className={`h-[18px] w-[18px] ${isFavorite ? "fill-[#eb221c]" : ""}`} aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-[14px] font-bold leading-tight text-gray-900 sm:text-[15px]">
          {name}
        </h3>

        {location && (
          <p className="flex min-w-0 items-center gap-1 text-[12px] text-gray-500">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>
        )}

        {bestOfferTitle && (
          <p className="mt-auto flex items-start gap-1.5 rounded-lg bg-[#eb221c]/[0.07] px-2 py-1.5 text-[13px] font-bold leading-snug text-[#c41a15]">
            <Tag className="mt-[3px] h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{bestOfferTitle}</span>
          </p>
        )}
      </div>
    </article>
  )
}
