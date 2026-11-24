import sharp from "sharp"

// Vercel Functions reject request bodies above 4.5 MB, so uploads are capped below that.
export const MAX_OFFER_IMAGE_BYTES = 4 * 1024 * 1024
export const MAX_OFFER_IMAGE_PIXELS = 40_000_000
export const OFFER_PHOTO_WIDTH = 1280
export const OFFER_PHOTO_HEIGHT = 720
export const OFFER_ARTWORK_MAX_WIDTH = 1280
export const OFFER_ARTWORK_MAX_HEIGHT = 720
export const MIN_PHOTO_CROP_WIDTH = 320
export const MIN_PHOTO_CROP_HEIGHT = 180

const TARGET_RATIO = 16 / 9
// Integer rounding of a client-side 16:9 crop drifts slightly from the exact ratio.
const RATIO_TOLERANCE = 0.015

export type OfferImageTreatment = "photo" | "artwork"
export type OfferImageFormat = "webp" | "jpeg" | "png"
type SourceFormat = "png" | "jpeg" | "webp"

export type PhotoCrop = {
  left: number
  top: number
  width: number
  height: number
  sourceWidth: number
  sourceHeight: number
}

export type ProcessedOfferImage = {
  buffer: Buffer
  format: OfferImageFormat
  contentType: "image/webp" | "image/jpeg" | "image/png"
  extension: OfferImageFormat
  width: number
  height: number
  bytes: number
  originalBytes: number
  sourceFormat: SourceFormat
  sourceWidth: number
  sourceHeight: number
  treatment: OfferImageTreatment
  hasAlpha: boolean
}

export class OfferImageValidationError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = "OfferImageValidationError"
    this.status = status
  }
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0) {
  if (buffer.length < offset + bytes.length) return false
  return bytes.every((byte, index) => buffer[offset + index] === byte)
}

// Signature sniffing happens before sharp parses anything, so SVG, GIF, HEIC and
// other formats are rejected without being decoded.
function sniffFormat(buffer: Buffer): SourceFormat | null {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png"
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "jpeg"
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) return "webp"
  return null
}

// libvips decodes only the first frame of an APNG, so animated PNGs are detected
// by an acTL chunk ahead of the first IDAT chunk.
function isAnimatedPng(buffer: Buffer) {
  let offset = 8
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString("latin1", offset + 4, offset + 8)
    if (type === "acTL") return true
    if (type === "IDAT" || type === "IEND") return false
    offset += 12 + length
  }
  return false
}

export function parseTreatment(value: unknown): OfferImageTreatment | null {
  return value === "photo" || value === "artwork" ? value : null
}

export function parsePhotoCrop(value: unknown): PhotoCrop | null {
  if (typeof value !== "string" || value.length > 500) return null
  let raw: unknown
  try {
    raw = JSON.parse(value)
  } catch {
    return null
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const keys = ["left", "top", "width", "height", "sourceWidth", "sourceHeight"] as const
  if (Object.keys(record).some((key) => !(keys as readonly string[]).includes(key))) return null
  const crop = {} as PhotoCrop
  for (const key of keys) {
    const number = record[key]
    if (typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > 100_000) return null
    crop[key] = number
  }
  return crop
}

async function readSource(input: Buffer) {
  if (input.length === 0) throw new OfferImageValidationError("The file is empty.")
  if (input.length > MAX_OFFER_IMAGE_BYTES) {
    throw new OfferImageValidationError("Offer images must be 4 MB or smaller.", 413)
  }

  const sniffed = sniffFormat(input)
  if (!sniffed) throw new OfferImageValidationError("Only PNG, JPEG and WebP images are accepted.", 415)
  if (sniffed === "png" && isAnimatedPng(input)) {
    throw new OfferImageValidationError("Animated images are not accepted.")
  }

  let metadata: sharp.Metadata
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_OFFER_IMAGE_PIXELS, pages: -1 }).metadata()
  } catch {
    throw new OfferImageValidationError("The image could not be read. It may be corrupt or too large.")
  }

  if (metadata.format !== sniffed) {
    throw new OfferImageValidationError("The file contents do not match a supported image format.", 415)
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new OfferImageValidationError("Animated or multi-frame images are not accepted.")
  }

  const storedWidth = metadata.width ?? 0
  const storedHeight = metadata.height ?? 0
  if (!storedWidth || !storedHeight) throw new OfferImageValidationError("The image has no readable dimensions.")
  if (storedWidth * storedHeight > MAX_OFFER_IMAGE_PIXELS) {
    throw new OfferImageValidationError("Images must be 40 megapixels or smaller.")
  }

  // EXIF orientations 5-8 rotate by 90 degrees, so the upright image swaps axes.
  // Browsers display the upright image, which is what crop coordinates refer to.
  const swapsAxes = (metadata.orientation ?? 1) >= 5
  return {
    sniffed,
    hasAlpha: Boolean(metadata.hasAlpha),
    width: swapsAxes ? storedHeight : storedWidth,
    height: swapsAxes ? storedWidth : storedHeight,
  }
}

function validateCrop(crop: PhotoCrop, width: number, height: number) {
  if (crop.sourceWidth !== width || crop.sourceHeight !== height) {
    throw new OfferImageValidationError(
      "The crop was made on an image with different dimensions. Choose the file again and re-crop.",
      422,
    )
  }
  if (crop.width < MIN_PHOTO_CROP_WIDTH || crop.height < MIN_PHOTO_CROP_HEIGHT) {
    throw new OfferImageValidationError(
      `The crop must be at least ${MIN_PHOTO_CROP_WIDTH} × ${MIN_PHOTO_CROP_HEIGHT} pixels.`,
      422,
    )
  }
  if (crop.left + crop.width > width || crop.top + crop.height > height) {
    throw new OfferImageValidationError("The crop extends outside the image.", 422)
  }
  const ratio = crop.width / crop.height
  if (Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO > RATIO_TOLERANCE) {
    throw new OfferImageValidationError("The crop must be 16:9.", 422)
  }
}

type Candidate = { buffer: Buffer; info: sharp.OutputInfo; format: OfferImageFormat }

function smallest(candidates: Candidate[]) {
  const valid = candidates.filter(({ buffer, info }) => buffer.length > 0 && info.width > 0 && info.height > 0)
  if (valid.length === 0) throw new OfferImageValidationError("The image could not be processed.")
  return valid.reduce((best, candidate) => (candidate.buffer.length < best.buffer.length ? candidate : best))
}

const CONTENT_TYPES: Record<OfferImageFormat, ProcessedOfferImage["contentType"]> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
}

export async function processOfferImage(
  input: Buffer,
  treatment: OfferImageTreatment,
  crop: PhotoCrop | null,
): Promise<ProcessedOfferImage> {
  const source = await readSource(input)
  const pipeline = () => sharp(input, { limitInputPixels: MAX_OFFER_IMAGE_PIXELS }).autoOrient()

  let candidates: Candidate[]
  try {
    if (treatment === "photo") {
      if (!crop) throw new OfferImageValidationError("A 16:9 crop is required for photographs.", 422)
      validateCrop(crop, source.width, source.height)

      // autoOrient runs before extract, so the crop applies to the upright image.
      // fit "cover" on an already-16:9 region only trims rounding drift; it never
      // stretches. Photographs are flattened onto white because they are opaque.
      const photo = () =>
        pipeline()
          .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
          .resize(OFFER_PHOTO_WIDTH, OFFER_PHOTO_HEIGHT, { fit: "cover", position: "centre" })
          .flatten({ background: "#ffffff" })

      const [webp, jpeg] = await Promise.all([
        photo().webp({ quality: 80, effort: 5 }).toBuffer({ resolveWithObject: true }),
        photo().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer({ resolveWithObject: true }),
      ])
      candidates = [
        { buffer: webp.data, info: webp.info, format: "webp" },
        { buffer: jpeg.data, info: jpeg.info, format: "jpeg" },
      ]
    } else {
      // Artwork is scaled proportionally inside the 16:9 bounds and never cropped,
      // padded or enlarged. Transparency is kept; the card supplies the backdrop.
      const artwork = () =>
        pipeline().resize({
          width: OFFER_ARTWORK_MAX_WIDTH,
          height: OFFER_ARTWORK_MAX_HEIGHT,
          fit: "inside",
          withoutEnlargement: true,
        })

      const webp = artwork().webp({ quality: 90, alphaQuality: 100, effort: 5 }).toBuffer({ resolveWithObject: true })
      const fallback = source.hasAlpha
        ? artwork().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer({ resolveWithObject: true })
        : artwork().jpeg({ quality: 90, mozjpeg: true, progressive: true }).toBuffer({ resolveWithObject: true })
      const [webpResult, fallbackResult] = await Promise.all([webp, fallback])
      candidates = [
        { buffer: webpResult.data, info: webpResult.info, format: "webp" },
        { buffer: fallbackResult.data, info: fallbackResult.info, format: source.hasAlpha ? "png" : "jpeg" },
      ]
    }
  } catch (error) {
    if (error instanceof OfferImageValidationError) throw error
    throw new OfferImageValidationError("The image could not be processed.")
  }

  const best = smallest(candidates)
  if (treatment === "photo" && (best.info.width !== OFFER_PHOTO_WIDTH || best.info.height !== OFFER_PHOTO_HEIGHT)) {
    throw new OfferImageValidationError("The image could not be processed.")
  }

  return {
    buffer: best.buffer,
    format: best.format,
    contentType: CONTENT_TYPES[best.format],
    extension: best.format,
    width: best.info.width,
    height: best.info.height,
    bytes: best.buffer.length,
    originalBytes: input.length,
    sourceFormat: source.sniffed,
    sourceWidth: source.width,
    sourceHeight: source.height,
    treatment,
    hasAlpha: treatment === "artwork" && source.hasAlpha,
  }
}
