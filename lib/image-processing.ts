import sharp from "sharp";

export interface ImageProcessingOptions {
  width?: number;        
  height?: number;      
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

export const IMAGE_PRESETS = {
  category: {
    width: 400,
    height: 400,
    quality: 85,
    fit: "cover" as const,
  },
  restaurantHero: {
    width: 1200,
    height: 600,
    quality: 85,
    fit: "cover" as const,
  },
  restaurantThumb: {
    width: 600,
    height: 400,
    quality: 80,
    fit: "cover" as const,
  },
  menuPdf: null,
} as const;

export async function processImageToWebP(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {

  const {
    width = 1200,   // max width
    quality = 85,
  } = options;

  const processedBuffer = await sharp(buffer)
    .resize({
      width,
      fit: "inside",           
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  return {
    buffer: processedBuffer,
    contentType: "image/webp",
    extension: "webp",
  };
}


export function buildUniqueFileName(
  originalName: string,
  extension = "webp"
): string {
  const baseName = originalName
    .split(".")[0]
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `${baseName}_${timestamp}_${random}.${extension}`;
}