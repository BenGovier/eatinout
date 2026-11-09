"use client"

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { AlertCircle, Camera, CheckCircle2, ImageIcon, Loader2, Palette, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { NationalOfferCardPreview, NationalOfferImage } from "@/components/national/national-offer-card-preview"
import {
  CroppedImageView,
  MIN_CROP_WIDTH,
  OfferImageCropper,
  PHOTO_RATIO,
  baseCropWidth,
  cropRectFor,
  initialCropView,
  type CropView,
} from "./offer-image-cropper"

export type OfferImageTreatment = "photo" | "artwork"

export type EditorOffer = {
  id: string
  brand_id: string
  title: string
  deal_label: string | null
  description: string | null
  terms: string | null
  starts_at: string | null
  ends_at: string | null
  redemption_method: string | null
  publication_status: string | null
  offer_image_url: string | null
  created_at: string | null
  updated_at: string | null
}

export type EditorBrand = { id: string; name: string; status: string; logo_url: string | null }

type SavedImageDetails = {
  url: string
  treatment: OfferImageTreatment
  format: string
  width: number
  height: number
  bytes: number
  originalBytes: number
  sourceWidth: number
  sourceHeight: number
}

type PreparedSource = {
  blob: Blob
  fileName: string
  url: string
  width: number
  height: number
  downscaledFrom: number | null
}

type Notice = { tone: "success" | "warning"; message: string }

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const ARTWORK_MAX = { width: 1280, height: 720 }

const TREATMENTS: { value: OfferImageTreatment; label: string; description: string; icon: typeof Camera }[] = [
  {
    value: "photo",
    label: "Photograph",
    description: "Drag and zoom to choose a 16:9 crop. Saved at 1280 × 720.",
    icon: Camera,
  },
  {
    value: "artwork",
    label: "Promotional artwork",
    description: "Shown in full, never cropped. Neutral bars fill any spare space.",
    icon: Palette,
  },
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function initialsFor(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "NB"
  )
}

function expiryLabelFor(endsAt: string | null) {
  if (!endsAt) return undefined
  const date = new Date(endsAt)
  if (isNaN(date.getTime())) return undefined
  return `Ends ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
}

function termsFor(terms: string | null) {
  return (terms ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
}

function artworkOutputSize(width: number, height: number) {
  const scale = Math.min(1, ARTWORK_MAX.width / width, ARTWORK_MAX.height / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function readDimensions(url: string) {
  const image = new Image()
  image.src = url
  await image.decode()
  return { width: image.naturalWidth, height: image.naturalHeight }
}

// Photographs over the upload limit are reduced in the browser before upload.
// They are cropped and re-compressed to 1280 × 720 anyway, so nothing visible is
// lost. createImageBitmap applies EXIF orientation, matching what the cropper shows.
async function downscalePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    for (const maxSide of [3200, 2560, 1920]) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const context = canvas.getContext("2d")
      if (!context) break
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9))
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob
    }
  } finally {
    bitmap.close()
  }
  throw new Error("This photograph could not be reduced below 4 MB. Try a smaller file.")
}

async function prepareSource(file: File, treatment: OfferImageTreatment): Promise<PreparedSource> {
  let blob: Blob = file
  let fileName = file.name
  let downscaledFrom: number | null = null

  if (file.size > MAX_UPLOAD_BYTES) {
    if (treatment === "artwork") {
      throw new Error(
        "Artwork must be 4 MB or smaller so it can be kept in full. Export a smaller PNG, JPEG or WebP and try again.",
      )
    }
    blob = await downscalePhoto(file)
    fileName = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    downscaledFrom = file.size
  }

  const url = URL.createObjectURL(blob)
  try {
    const { width, height } = await readDimensions(url)
    if (!width || !height) throw new Error("The image has no readable dimensions.")
    if (treatment === "photo" && baseCropWidth(width, height) < MIN_CROP_WIDTH) {
      throw new Error("This photograph is too small. It needs to allow a crop of at least 320 × 180 pixels.")
    }
    return { blob, fileName, url, width, height, downscaledFrom }
  } catch (error) {
    URL.revokeObjectURL(url)
    if (error instanceof Error && error.message && !(error instanceof DOMException)) throw error
    throw new Error("The image could not be read. Choose a PNG, JPEG or WebP file.")
  }
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[2rem] border-8 border-slate-900 bg-[var(--eo-bg,#f8fafc)] p-4 shadow-xl">
      {children}
    </div>
  )
}

type Props = {
  offer: EditorOffer
  brand: EditorBrand
  onSaved: (offer: EditorOffer) => void
}

export function OfferImageUploader({ offer, brand, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [treatment, setTreatment] = useState<OfferImageTreatment>("photo")
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState<PreparedSource | null>(null)
  const [view, setView] = useState<CropView>({ zoom: 1, centerX: 0, centerY: 0 })
  const [preparing, setPreparing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [saved, setSaved] = useState<SavedImageDetails | null>(null)

  const isArchived = offer.publication_status === "archived"
  const busy = preparing || uploading

  useEffect(() => {
    if (!source) return
    return () => URL.revokeObjectURL(source.url)
  }, [source])

  const prepare = useCallback(async (nextFile: File, nextTreatment: OfferImageTreatment) => {
    setPreparing(true)
    setError(null)
    try {
      const prepared = await prepareSource(nextFile, nextTreatment)
      setSource(prepared)
      setView(initialCropView(prepared.width, prepared.height))
    } catch (prepareError) {
      setSource(null)
      setError(prepareError instanceof Error ? prepareError.message : "The image could not be prepared.")
    } finally {
      setPreparing(false)
    }
  }, [])

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    event.target.value = ""
    if (!selected) return
    setNotice(null)
    if (selected.type && !ACCEPTED_TYPES.includes(selected.type)) {
      setFile(null)
      setSource(null)
      setError("Only PNG, JPEG and WebP images are accepted.")
      return
    }
    setFile(selected)
    void prepare(selected, treatment)
  }

  const onTreatmentChange = (next: OfferImageTreatment) => {
    if (next === treatment || busy) return
    setTreatment(next)
    // A photo may have been reduced in the browser; artwork must use the original file.
    if (file) void prepare(file, next)
  }

  const clearSelection = () => {
    setFile(null)
    setSource(null)
    setError(null)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!source || busy || isArchived) return
    setUploading(true)
    setError(null)
    setNotice(null)

    const formData = new FormData()
    formData.append("file", source.blob, source.fileName)
    formData.append("treatment", treatment)
    if (treatment === "photo") {
      const crop = cropRectFor(view, source.width, source.height)
      formData.append(
        "crop",
        JSON.stringify({ ...crop, sourceWidth: source.width, sourceHeight: source.height }),
      )
    }

    try {
      const response = await fetch(
        `/api/admin/national/brands/${encodeURIComponent(brand.id)}/offers/${encodeURIComponent(offer.id)}/image`,
        { method: "POST", body: formData, credentials: "include" },
      )
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to upload the image.")
      }
      setSaved({ ...(data.image as SavedImageDetails), originalBytes: file?.size ?? data.image.originalBytes })
      onSaved(data.offer as EditorOffer)
      setNotice({ tone: data.partial ? "warning" : "success", message: data.message })
      setFile(null)
      setSource(null)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload the image.")
    } finally {
      setUploading(false)
    }
  }

  const previewAlt = `${brand.name} offer image`
  let previewImage: React.ReactNode = null
  if (source && treatment === "photo") {
    previewImage = (
      <CroppedImageView src={source.url} alt={previewAlt} sourceWidth={source.width} sourceHeight={source.height} view={view} />
    )
  } else if (source) {
    previewImage = <NationalOfferImage src={source.url} alt={previewAlt} />
  } else if (offer.offer_image_url) {
    previewImage = <NationalOfferImage src={offer.offer_image_url} alt={previewAlt} />
  }

  const pendingOutput = source
    ? treatment === "photo"
      ? { width: 1280, height: 720 }
      : artworkOutputSize(source.width, source.height)
    : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-red-700">Main offer image</CardTitle>
          <CardDescription>
            The large hero image on the customer offer card. It belongs to this offer only and is separate from the
            brand logo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            {notice ? (
              <div
                role="status"
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-sm",
                  notice.tone === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-amber-200 bg-amber-50 text-amber-800",
                )}
              >
                {notice.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <p className="flex-1">{notice.message}</p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="rounded p-0.5 hover:bg-black/5"
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {isArchived ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This offer is archived, so its image cannot be changed.
              </p>
            ) : null}

            <fieldset className="flex flex-col gap-2" disabled={busy || isArchived}>
              <legend className="mb-2 text-sm font-medium text-gray-900">Image type</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {TREATMENTS.map(({ value, label, description, icon: Icon }) => {
                  const selected = treatment === value
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-600 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
                        selected ? "border-red-600 bg-red-50" : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <input
                        type="radio"
                        name="treatment"
                        value={value}
                        checked={selected}
                        onChange={() => onTreatmentChange(value)}
                        className="sr-only"
                      />
                      <Icon
                        className={cn("mt-0.5 h-5 w-5 shrink-0", selected ? "text-red-600" : "text-gray-400")}
                        aria-hidden="true"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-gray-900">{label}</span>
                        <span className="text-xs leading-relaxed text-gray-500">{description}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <input
                ref={inputRef}
                id="offer-image-file"
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={onFileChange}
                className="sr-only"
                disabled={busy || isArchived}
                aria-describedby="offer-image-help"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy || isArchived}
                  className="w-full bg-transparent sm:w-auto"
                >
                  {preparing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {preparing ? "Preparing…" : file ? "Choose a different image" : "Choose image"}
                </Button>
                {file ? (
                  <p className="min-w-0 truncate text-sm text-gray-600">
                    {file.name} · {formatBytes(file.size)}
                  </p>
                ) : null}
              </div>
              <p id="offer-image-help" className="text-xs text-gray-500">
                PNG, JPEG or WebP from your computer or phone. Artwork up to 4 MB; larger photographs are reduced on
                this device before upload.
              </p>
            </div>

            {error ? (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}

            {source && treatment === "photo" ? (
              <OfferImageCropper
                src={source.url}
                sourceWidth={source.width}
                sourceHeight={source.height}
                view={view}
                onViewChange={setView}
                disabled={uploading}
              />
            ) : null}

            {source && treatment === "artwork" ? (
              <div className="flex flex-col gap-2">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-100">
                  <NationalOfferImage src={source.url} alt="Selected artwork" />
                </div>
                <p className="text-xs text-gray-500">
                  The complete artwork is kept at its original proportions ({source.width} × {source.height} px).
                  {Math.abs(source.width / source.height - PHOTO_RATIO) > 0.01
                    ? " Neutral bars fill the space around it in the 16:9 frame."
                    : null}
                </p>
              </div>
            ) : null}

            {source && pendingOutput ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-gray-500">Original file</dt>
                  <dd className="font-medium text-gray-900">{formatBytes(file?.size ?? source.blob.size)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Final dimensions</dt>
                  <dd className="font-medium text-gray-900">
                    {pendingOutput.width} × {pendingOutput.height}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Compressed size</dt>
                  <dd className="font-medium text-gray-900">Shown after saving</dd>
                </div>
                {source.downscaledFrom ? (
                  <p className="col-span-full text-xs text-gray-500">
                    Reduced on this device to {formatBytes(source.blob.size)} ({source.width} × {source.height}) to fit
                    the 4 MB upload limit.
                  </p>
                ) : null}
              </dl>
            ) : null}

            {source ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={clearSelection} disabled={uploading} className="bg-transparent">
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || isArchived} className="bg-red-600 text-white hover:bg-red-700">
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {uploading ? "Saving…" : treatment === "photo" ? "Save cropped image" : "Save artwork"}
                </Button>
              </div>
            ) : null}

            {!source && saved ? (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <p className="text-sm font-medium text-gray-900">Saved image</p>
                <div className="relative aspect-video w-full overflow-hidden rounded-md bg-slate-100">
                  <NationalOfferImage src={saved.url} alt={previewAlt} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-gray-500">Original file</dt>
                    <dd className="font-medium text-gray-900">{formatBytes(saved.originalBytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Compressed</dt>
                    <dd className="font-medium text-gray-900">{formatBytes(saved.bytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Dimensions</dt>
                    <dd className="font-medium text-gray-900">
                      {saved.width} × {saved.height}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Format</dt>
                    <dd className="font-medium uppercase text-gray-900">{saved.format}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {!source && !saved && offer.offer_image_url ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-900">Current image</p>
                <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-slate-100">
                  <NationalOfferImage src={offer.offer_image_url} alt={previewAlt} />
                </div>
              </div>
            ) : null}

            {!source && !offer.offer_image_url ? (
              <p className="text-sm text-gray-500">This offer has no main image yet.</p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="mobile-preview-heading" className="flex flex-col gap-3 lg:sticky lg:top-6">
        <div>
          <h2 id="mobile-preview-heading" className="text-sm font-semibold text-gray-900">
            Mobile card preview
          </h2>
          <p className="text-xs text-gray-500">
            {source ? "Unsaved preview of the selected image." : "How the saved image appears to customers."}
          </p>
        </div>
        <MobileFrame>
          <NationalOfferCardPreview
            brandName={brand.name}
            brandInitials={initialsFor(brand.name)}
            brandLogoUrl={brand.logo_url}
            headline={offer.title}
            discountLabel={offer.deal_label}
            description={offer.description ?? ""}
            expiryLabel={expiryLabelFor(offer.ends_at)}
            terms={termsFor(offer.terms)}
            imageTreatment={treatment}
            image={previewImage ?? undefined}
          />
        </MobileFrame>
      </section>
    </div>
  )
}
