import sharp from "sharp"

export const MAX_LOGO_BYTES = 4 * 1024 * 1024
export const MAX_LOGO_PIXELS = 40_000_000
export const MAX_LOGO_DIMENSION = 1024

export type LogoFormat = "png" | "webp"

export type ProcessedLogo = {
  buffer: Buffer
  format: LogoFormat
  contentType: "image/png" | "image/webp"
  extension: "png" | "webp"
  width: number
  height: number
  bytes: number
  sourceFormat: SourceFormat
  hasAlpha: boolean
}

type SourceFormat = "png" | "jpeg" | "webp"

export class LogoValidationError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = "LogoValidationError"
    this.status = status
  }
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0) {
  if (buffer.length < offset + bytes.length) return false
  return bytes.every((byte, index) => buffer[offset + index] === byte)
}

// Signature sniffing happens before sharp sees the data, so SVG, GIF, HEIC and
// anything else is rejected without being parsed.
function sniffFormat(buffer: Buffer): SourceFormat | null {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png"
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "jpeg"
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) return "webp"
  return null
}

// libvips decodes only the first frame of an APNG, so animated PNGs are detected
// by looking for an acTL chunk ahead of the first IDAT chunk.
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

export async function processBrandLogo(input: Buffer): Promise<ProcessedLogo> {
  if (input.length === 0) throw new LogoValidationError("The file is empty.")
  if (input.length > MAX_LOGO_BYTES) throw new LogoValidationError("Logos must be 4 MB or smaller.", 413)

  const sniffed = sniffFormat(input)
  if (!sniffed) throw new LogoValidationError("Only PNG, JPEG and WebP images are accepted.", 415)
  if (sniffed === "png" && isAnimatedPng(input)) {
    throw new LogoValidationError("Animated images are not accepted.")
  }

  let metadata: sharp.Metadata
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_LOGO_PIXELS, pages: -1 }).metadata()
  } catch {
    throw new LogoValidationError("The image could not be read. It may be corrupt or too large.")
  }

  if (metadata.format !== sniffed) {
    throw new LogoValidationError("The file contents do not match a supported image format.", 415)
  }
  if ((metadata.pages ?? 1) > 1) throw new LogoValidationError("Animated or multi-frame images are not accepted.")

  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  if (!width || !height) throw new LogoValidationError("The image has no readable dimensions.")
  if (width * height > MAX_LOGO_PIXELS) {
    throw new LogoValidationError("Images must be 40 megapixels or smaller.")
  }

  const hasAlpha = Boolean(metadata.hasAlpha)

  // rotate() applies EXIF orientation first so the 1024px cap is measured on the
  // upright image. fit "inside" scales proportionally (never crops or stretches),
  // and withoutEnlargement leaves smaller logos at their original size. No extract
  // or flatten is applied, so transparency is kept. keepIccProfile() keeps the
  // embedded colour profile while other metadata (EXIF, GPS) is stripped.
  const base = () =>
    sharp(input, { limitInputPixels: MAX_LOGO_PIXELS })
      .rotate()
      .resize({
        width: MAX_LOGO_DIMENSION,
        height: MAX_LOGO_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .keepIccProfile()

  let candidates: { buffer: Buffer; info: sharp.OutputInfo; format: LogoFormat }[]
  try {
    const [png, webp] = await Promise.all([
      base()
        .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
        .toBuffer({ resolveWithObject: true }),
      base().webp({ lossless: true, effort: 6, alphaQuality: 100 }).toBuffer({ resolveWithObject: true }),
    ])
    candidates = [
      { buffer: png.data, info: png.info, format: "png" },
      { buffer: webp.data, info: webp.info, format: "webp" },
    ]
  } catch {
    throw new LogoValidationError("The image could not be processed.")
  }

  const validCandidates = candidates.filter(
    ({ buffer, info }) =>
      buffer.length > 0 &&
      info.width > 0 &&
      info.height > 0 &&
      Math.max(info.width, info.height) <= MAX_LOGO_DIMENSION,
  )
  if (validCandidates.length === 0) throw new LogoValidationError("The image could not be processed.")

  const best = validCandidates.reduce((smallest, candidate) =>
    candidate.buffer.length < smallest.buffer.length ? candidate : smallest,
  )

  return {
    buffer: best.buffer,
    format: best.format,
    contentType: best.format === "png" ? "image/png" : "image/webp",
    extension: best.format,
    width: best.info.width,
    height: best.info.height,
    bytes: best.buffer.length,
    sourceFormat: sniffed,
    hasAlpha,
  }
}
