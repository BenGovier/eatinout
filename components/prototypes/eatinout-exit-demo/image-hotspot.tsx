"use client"

import Image from "next/image"

/**
 * Renders the supplied exit-modal PNG at its native aspect ratio and layers
 * invisible, precisely positioned interactive hit areas on top of the visual
 * controls already baked into the artwork. The hotspots draw nothing — they
 * only make regions clickable and keyboard-focusable. Positions are
 * percentages relative to the image box so they stay aligned as the image
 * scales to fit the viewport.
 */

export type Hotspot = {
  id: string
  label: string
  /** percentage offsets/size relative to the image box */
  top: number
  left: number
  width: number
  height: number
  onClick: () => void
}

export function ModalImageWithHotspots({
  src,
  alt,
  width,
  height,
  hotspots,
}: {
  src: string
  alt: string
  width: number
  height: number
  hotspots: Hotspot[]
}) {
  return (
    <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        draggable={false}
        className="select-none"
        style={{
          display: "block",
          width: "auto",
          height: "auto",
          // Mobile: fill the viewport minus a 14px gutter each side, capped at
          // the native width. Desktop / short viewports: never taller than the
          // viewport minus a 20px gutter each side. Aspect ratio is preserved.
          maxWidth: "min(648px, calc(100vw - 28px))",
          maxHeight: "calc(100vh - 40px)",
        }}
      />
      {hotspots.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={h.onClick}
          aria-label={h.label}
          className="absolute cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D90429]"
          style={{
            top: `${h.top}%`,
            left: `${h.left}%`,
            width: `${h.width}%`,
            height: `${h.height}%`,
            borderRadius: 12,
          }}
        >
          <span className="sr-only">{h.label}</span>
        </button>
      ))}
    </div>
  )
}
