"use client"

import Image from "next/image"

/**
 * Renders a supplied design PNG with invisible, precisely positioned
 * interactive hit areas layered on top. The visual design lives entirely in
 * the image — hotspots draw nothing, they only make regions clickable and
 * keyboard-focusable. Positions are percentages relative to the image box so
 * they scale with the responsive image.
 */

export type Hotspot = {
  id: string
  label: string
  /** percentage offsets/size relative to the image box */
  top: number
  left: number
  width: number
  height: number
  /** external destination — opens in a new tab */
  href?: string
  /** in-demo handler (used when there is no real destination) */
  onClick?: () => void
  /** inert region: focusable + labelled, but performs no action */
  inert?: boolean
}

export function ImageWithHotspots({
  src,
  alt,
  width,
  height,
  sizes,
  priority,
  className,
  hotspots = [],
}: {
  src: string
  alt: string
  width: number
  height: number
  sizes?: string
  priority?: boolean
  className?: string
  hotspots?: Hotspot[]
}) {
  const cls =
    "absolute rounded-xl transition-opacity duration-150 active:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D90429]"

  return (
    <div className={`relative ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        draggable={false}
        className="h-auto w-full select-none"
      />
      {hotspots.map((h) => {
        const style = {
          top: `${h.top}%`,
          left: `${h.left}%`,
          width: `${h.width}%`,
          height: `${h.height}%`,
          minHeight: "44px",
        }

        if (h.href && !h.inert) {
          return (
            <a
              key={h.id}
              href={h.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={h.label}
              className={cls}
              style={style}
            >
              <span className="sr-only">{h.label}</span>
            </a>
          )
        }

        return (
          <button
            key={h.id}
            type="button"
            onClick={h.inert ? undefined : h.onClick}
            aria-label={h.label}
            aria-disabled={h.inert || undefined}
            className={cls}
            style={style}
          >
            <span className="sr-only">{h.label}</span>
          </button>
        )
      })}
    </div>
  )
}
