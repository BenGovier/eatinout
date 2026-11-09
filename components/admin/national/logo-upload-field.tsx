"use client"

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react"
import { AlertCircle, ImageUp, Loader2, Store } from "lucide-react"
import { Button } from "@/components/ui/button"

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const
const MAX_BYTES = 4 * 1024 * 1024

// Checkerboard backdrop so transparent areas of a logo are visible.
const CHECKERBOARD_STYLE = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
}

export type LogoUploadResult<TBrand> = {
  brand: TBrand
  message: string
  isWarning: boolean
}

type Selection = {
  file: File
  previewUrl: string
  width: number | null
  height: number | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function LogoUploadField<TBrand>({
  brandId,
  brandName,
  currentLogoUrl,
  onUploaded,
}: {
  brandId: string
  brandName: string
  currentLogoUrl: string | null
  onUploaded: (result: LogoUploadResult<TBrand>) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!selection) return
    const url = selection.previewUrl
    return () => URL.revokeObjectURL(url)
  }, [selection?.previewUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetInput() {
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError("")
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      setError("Choose a PNG, JPEG or WebP image. SVG and other formats are not accepted.")
      resetInput()
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`This file is ${formatBytes(file.size)}. Logos must be 4 MB or smaller.`)
      resetInput()
      return
    }

    setSelection({ file, previewUrl: URL.createObjectURL(file), width: null, height: null })
  }

  function handleCancel() {
    setSelection(null)
    setError("")
    resetInput()
  }

  async function handleUpload() {
    if (!selection || isUploading) return
    setIsUploading(true)
    setError("")
    try {
      const body = new FormData()
      body.append("file", selection.file)
      const response = await fetch(`/api/admin/national/brands/${encodeURIComponent(brandId)}/logo`, {
        method: "POST",
        cache: "no-store",
        body,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        setError(data?.message || "Failed to upload the logo.")
        return
      }
      const logo = data.logo
      const details = logo ? ` Saved as ${String(logo.format).toUpperCase()}, ${logo.width} × ${logo.height}px, ${formatBytes(logo.bytes)}.` : ""
      onUploaded({
        brand: data.brand as TBrand,
        message: `${data.message || "Logo saved."}${data.partial ? "" : details}`,
        isWarning: Boolean(data.partial),
      })
      setSelection(null)
      resetInput()
    } catch {
      setError("Network error. The logo was not uploaded. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const displayUrl = selection?.previewUrl ?? currentLogoUrl

  return (
    <div className="space-y-3">
      <div
        className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border p-3"
        style={displayUrl ? CHECKERBOARD_STYLE : undefined}
      >
        {displayUrl ? (
          // object-contain keeps the original proportions; the logo is never cropped or stretched
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={selection ? `Preview of new ${brandName} logo` : `${brandName} logo`}
            className="max-h-full max-w-full object-contain"
            onLoad={(event) => {
              if (!selection) return
              const { naturalWidth, naturalHeight } = event.currentTarget
              setSelection((prev) =>
                prev && prev.previewUrl === selection.previewUrl
                  ? { ...prev, width: naturalWidth, height: naturalHeight }
                  : prev,
              )
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Store className="h-8 w-8" aria-hidden="true" />
            <span className="text-sm">No logo uploaded</span>
          </div>
        )}
      </div>

      {selection ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-gray-600">
          <dt className="font-medium text-gray-700">File</dt>
          <dd className="truncate">{selection.file.name}</dd>
          <dt className="font-medium text-gray-700">Size</dt>
          <dd>{formatBytes(selection.file.size)}</dd>
          <dt className="font-medium text-gray-700">Dimensions</dt>
          <dd>{selection.width && selection.height ? `${selection.width} × ${selection.height}px` : "Reading…"}</dd>
        </dl>
      ) : (
        <p className="text-xs text-gray-500">PNG, JPEG or WebP, up to 4 MB. Transparent PNG or WebP works best.</p>
      )}

      {error && (
        <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {selection ? (
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={handleCancel} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-red-600 text-white hover:bg-red-700"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading…
              </>
            ) : (
              "Upload logo"
            )}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full" asChild>
          <label htmlFor={inputId} className="cursor-pointer">
            <ImageUp className="mr-2 h-4 w-4" aria-hidden="true" />
            {currentLogoUrl ? "Choose a new logo" : "Choose logo"}
          </label>
        </Button>
      )}
    </div>
  )
}
