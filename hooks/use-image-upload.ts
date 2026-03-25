// hooks/use-image-upload.ts
import { useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

export type ImagePreset = "category" | "restaurantHero" | "restaurantThumb" | "menuPdf";

interface UseImageUploadOptions {
  preset?: ImagePreset;
  maxSizeMB?: number;
  // Optional custom dimensions — override the preset's defaults
  width?: number;
  height?: number;
  onSuccess?: (url: string) => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    preset = "restaurantHero",
    maxSizeMB = 50,
    width,
    height,
    onSuccess,
  } = options;

  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");

  // const upload = async (file: File): Promise<string | null> => {
  //   if (!file.type.startsWith("image/")) {
  //     toast.error("Please upload an image file");
  //     return null;
  //   }

  //   if (file.size > maxSizeMB * 1024 * 1024) {
  //     toast.error(`File size exceeds ${maxSizeMB}MB limit`);
  //     return null;
  //   }

  //   setUploading(true);
  //   try {
  //     const formData = new FormData();
  //     formData.append("file", file);
  //     formData.append("preset", preset);

  //     // Pass custom dimensions to the API if provided
  //     if (width !== undefined) formData.append("width", String(width));
  //     if (height !== undefined) formData.append("height", String(height));

  //     const response = await axios.post("/api/upload-image", formData, {
  //       headers: { "Content-Type": "multipart/form-data" },
  //     });
  //     if (!response.data.success) {
  //       throw new Error(response.data.message || "Upload failed");
  //     }

  //     const url: string = response.data.url;
  //     setImageUrl(url);
  //     onSuccess?.(url);

  //     const savedKB = Math.round(
  //       (response.data.originalSize - response.data.processedSize) / 1024
  //     );
  //     toast.success("Image uploaded successfully");

  //     return url;
  //   } catch (error: any) {
  //     toast.error(error.response?.data?.message || "Upload failed");
  //     return null;
  //   } finally {
  //     setUploading(false);
  //   }
  // };
  const upload = async (file: File): Promise<string | null> => {
    const isPdf = preset === "menuPdf";

    // File type validation
    if (!isPdf && !file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return null;
    }
    if (isPdf && file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return null;
    }

    // Max size validation
    const allowedMaxSize =  maxSizeMB; 
    if (file.size > allowedMaxSize * 1024 * 1024) {
      toast.error(`File size exceeds ${maxSizeMB}MB limit`);
      return null;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preset", preset);

      // Only pass dimensions for images
      if (!isPdf) {
        if (width !== undefined) formData.append("width", String(width));
        if (height !== undefined) formData.append("height", String(height));
      }

      const response = await axios.post("/api/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Upload failed");
      }

      const url: string = response.data.url;
      setImageUrl(url);
      onSuccess?.(url);

      toast.success(isPdf ? "PDF uploaded successfully" : "Image uploaded successfully");

      return url;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (url: string): Promise<void> => {
    if (!url) return;
    try {
      await axios.delete(`/api/upload-image?url=${encodeURIComponent(url)}`);
      setImageUrl("");
    } catch (error) {
      console.error("Error deleting image:", error);
      // Non-fatal — don't block the UI
    }
  };

  return { upload, remove, uploading, imageUrl, setImageUrl };
}