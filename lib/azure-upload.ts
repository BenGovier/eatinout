import axios from "axios";

/**
 * Uploads a file using the centralized /api/upload-image route
 * which now stores into Supabase Storage.
 */
export async function uploadFileToAzure(file: File): Promise<string> {
  console.log("Uploading file via upload-image (Supabase Storage)...", file?.name);

  const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("preset", isPdf ? "menuPdf" : "restaurantHero");

  try {
    const response = await axios.post("/api/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (response.data?.success && response.data?.url) {
      return response.data.url;
    }
    throw new Error(response.data?.message || "Failed to upload file");
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(error.response?.data?.message || error.message || "Upload failed");
  }
}

/**
 * Deletes a file using the centralized /api/upload-image route
 * which now removes from Supabase Storage.
 */
export async function deleteFileFromAzure(fileUrl: string): Promise<void> {
  if (!fileUrl) return;
  console.log("Deleting file via upload-image (Supabase Storage)...", fileUrl);

  try {
    await axios.delete(`/api/upload-image?url=${encodeURIComponent(fileUrl)}`);
  } catch (error: any) {
    console.error("Delete error:", error);
    // Non-blocking in UI
  }
}

// Backward-compatible and future-proof aliases
export const uploadFileToStorage = uploadFileToAzure;
export const deleteFileFromStorage = deleteFileFromAzure;
