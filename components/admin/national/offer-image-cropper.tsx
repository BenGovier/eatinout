"use client"

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react"
import { Minus, Move, Plus } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const PHOTO_RATIO = 16 / 9
export const MIN_CROP_WIDTH = 320
const MAX_ZOOM_LIMIT = 5

/** Zoom 1 shows the largest 16:9 region that fits; the centre is in source pixels. */
export type CropView = { zoom: number; centerX: number; centerY: number }

export type CropRect = { left: number; top: number; width: number; height: number }

export function baseCropWidth(sourceWidth: number, sourceHeight: number) {
  return Math.min(sourceWidth, sourceHeight * PHOTO_RATIO)
}

export function maxZoomFor(sourceWidth: number, sourceHeight: number) {
  return Math.max(1, Math.min(MAX_ZOOM_LIMIT, baseCropWidth(sourceWidth, sourceHeight) / MIN_CROP_WIDTH))
}

export function initialCropView(sourceWidth: number, sourceHeight: number): CropView {
  return { zoom: 1, centerX: sourceWidth / 2, centerY: sourceHeight / 2 }
}

export function clampCropView(view: CropView, sourceWidth: number, sourceHeight: number): CropView {
  const zoom = Math.min(maxZoomFor(sourceWidth, sourceHeight), Math.max(1, view.zoom))
  const width = baseCropWidth(sourceWidth, sourceHeight) / zoom
  const height = width / PHOTO_RATIO
  return {
    zoom,
    centerX: Math.min(sourceWidth - width / 2, Math.max(width / 2, view.centerX)),
    centerY: Math.min(sourceHeight - height / 2, Math.max(height / 2, view.centerY)),
  }
}

/** Exact (fractional) crop, used for on-screen rendering. */
function exactCrop(view: CropView, sourceWidth: number, sourceHeight: number) {
  const clamped = clampCropView(view, sourceWidth, sourceHeight)
  const width = baseCropWidth(sourceWidth, sourceHeight) / clamped.zoom
  const height = width / PHOTO_RATIO
  return { left: clamped.centerX - width / 2, top: clamped.centerY - height / 2, width, height }
}

/** Integer crop sent to the server, kept inside the source and as close to 16:9 as rounding allows. */
export function cropRectFor(view: CropView, sourceWidth: number, sourceHeight: number): CropRect {
  const exact = exactCrop(view, sourceWidth, sourceHeight)
  const width = Math.min(sourceWidth, Math.max(1, Math.round(exact.width)))
  const height = Math.min(sourceHeight, Math.max(1, Math.round(width / PHOTO_RATIO)))
  return {
    width,
    height,
    left: Math.min(sourceWidth - width, Math.max(0, Math.round(exact.left))),
    top: Math.min(sourceHeight - height, Math.max(0, Math.round(exact.top))),
  }
}

/**
 * Renders the cropped region of an image so it fills its (16:9) container. Sizes
 * and offsets are percentages of the container, so it scales to any width and
 * matches the server's 1280 × 720 output without stretching.
 */
export function CroppedImageView({
  src,
  alt,
  sourceWidth,
  sourceHeight,
  view,
}: {
  src: string
  alt: string
  sourceWidth: number
  sourceHeight: number
  view: CropView
}) {
  const crop = exactCrop(view, sourceWidth, sourceHeight)
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL preview
    <img
      src={src}
      alt={alt}
      draggable={false}
      className="pointer-events-none absolute max-w-none select-none"
      style={{
        width: `${(sourceWidth / crop.width) * 100}%`,
        height: `${(sourceHeight / crop.height) * 100}%`,
        left: `${(-crop.left / crop.width) * 100}%`,
        top: `${(-crop.top / crop.height) * 100}%`,
      }}
    />
  )
}

type Props = {
  src: string
  sourceWidth: number
  sourceHeight: number
  view: CropView
  onViewChange: (update: (view: CropView) => CropView) => void
  disabled?: boolean
}

export function OfferImageCropper({ src, sourceWidth, sourceHeight, view, onViewChange, disabled }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistance = useRef<number | null>(null)
  const maxZoom = maxZoomFor(sourceWidth, sourceHeight)

  const update = (change: (view: CropView) => CropView) =>
    onViewChange((current) => clampCropView(change(current), sourceWidth, sourceHeight))

  const sourcePixelsPerScreenPixel = (zoom: number) => {
    const frameWidth = frameRef.current?.getBoundingClientRect().width || 1
    return baseCropWidth(sourceWidth, sourceHeight) / zoom / frameWidth
  }

  // React registers wheel listeners as passive, so preventDefault needs a native listener.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame || disabled) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * 0.0015)
      onViewChange((current) => clampCropView({ ...current, zoom: current.zoom * factor }, sourceWidth, sourceHeight))
    }
    frame.addEventListener("wheel", onWheel, { passive: false })
    return () => frame.removeEventListener("wheel", onWheel)
  }, [disabled, onViewChange, sourceWidth, sourceHeight])

  const distance = () => {
    const [a, b] = [...pointers.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    pinchDistance.current = distance()
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous || disabled) return
    const next = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, next)

    if (pointers.current.size >= 2) {
      const current = distance()
      if (current && pinchDistance.current) {
        const factor = current / pinchDistance.current
        update((view) => ({ ...view, zoom: view.zoom * factor }))
      }
      pinchDistance.current = current
      return
    }

    const dx = next.x - previous.x
    const dy = next.y - previous.y
    update((view) => {
      const scale = sourcePixelsPerScreenPixel(view.zoom)
      return { ...view, centerX: view.centerX - dx * scale, centerY: view.centerY - dy * scale }
    })
  }

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    pinchDistance.current = distance()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const step = (baseCropWidth(sourceWidth, sourceHeight) / view.zoom) * (event.shiftKey ? 0.1 : 0.02)
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (moves[event.key]) {
      event.preventDefault()
      const [x, y] = moves[event.key]
      update((current) => ({ ...current, centerX: current.centerX + x, centerY: current.centerY + y }))
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault()
      update((current) => ({ ...current, zoom: current.zoom + 0.1 }))
    } else if (event.key === "-") {
      event.preventDefault()
      update((current) => ({ ...current, zoom: current.zoom - 0.1 }))
    }
  }

  const crop = cropRectFor(view, sourceWidth, sourceHeight)

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={frameRef}
        role="application"
        aria-label="Photograph crop. Drag or use arrow keys to position, plus and minus to zoom."
        aria-describedby="offer-crop-dimensions"
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
        className={cn(
          "relative aspect-video w-full touch-none select-none overflow-hidden rounded-lg bg-slate-900 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-red-600",
          disabled ? "cursor-not-allowed opacity-70" : "cursor-grab active:cursor-grabbing",
        )}
      >
        <CroppedImageView src={src} alt="" sourceWidth={sourceWidth} sourceHeight={sourceHeight} view={view} />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="border border-white/25" />
          ))}
        </div>
        <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
          <Move className="h-3 w-3" aria-hidden="true" />
          Drag to position
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 bg-transparent"
          onClick={() => update((current) => ({ ...current, zoom: current.zoom - 0.25 }))}
          disabled={disabled || view.zoom <= 1}
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Slider
          value={[view.zoom]}
          min={1}
          max={maxZoom}
          step={0.01}
          onValueChange={([zoom]) => update((current) => ({ ...current, zoom }))}
          disabled={disabled || maxZoom <= 1}
          aria-label="Zoom"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 bg-transparent"
          onClick={() => update((current) => ({ ...current, zoom: current.zoom + 0.25 }))}
          disabled={disabled || view.zoom >= maxZoom}
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <p id="offer-crop-dimensions" className="text-xs text-gray-500">
        Crop {crop.width} × {crop.height} px from {sourceWidth} × {sourceHeight} px · exported at 1280 × 720
        {crop.width < 1280 ? (
          <span className="block text-amber-700">
            This crop is smaller than 1280 px wide, so it will be enlarged and may look soft. Zoom out or use a larger
            photograph.
          </span>
        ) : null}
      </p>
    </div>
  )
}
