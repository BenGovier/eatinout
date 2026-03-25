import axios from "axios";

export async function uploadFileToAzure(file: File): Promise<string> {
  console.log("Starting file upload to Azure...", file);

  const containerName = "eatinout";
  const baseUrl = "https://eatinoutstorage.blob.core.windows.net";

  let newName = "";
  // Generate random file name if not provided
  if (!file.name) {
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = file.type.split("/")[1] || "png";
    newName = `file_${randomString}.${fileExtension}`;
  }
  const timestamp = Date.now();
  const fileName = file.name || newName;
  const uniqueFileName = `${fileName.split(".")[0]}_${timestamp}.${fileName
    .split(".")
    .pop()}`;

  try {
    // Get dynamic SAS token from API
    console.log("Getting dynamic SAS token...");
    const tokenResponse = await axios.get(`/api/get-upload-url?fileName=${encodeURIComponent(uniqueFileName)}`);
    
    if (tokenResponse.status !== 200) {
      throw new Error("Failed to get upload URL");
    }

    const { uploadUrl } = tokenResponse.data;
    const publicUrl = `${baseUrl}/${containerName}/${uniqueFileName}`;

    console.log("Uploading file with dynamic token...");
    const response = await axios.put(uploadUrl, file, {
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": file.type,
        "x-ms-blob-cache-control": "public, max-age=31536000, immutable", 
      },
    });

    if (response.status === 201) {
      console.log("File upload successful");
      return publicUrl;
    } else {
      console.log("Upload failed with status:", response.status);
      throw new Error("Failed to upload file");
    }
  } catch (error) {
    console.error("Azure upload error:", error);
    throw new Error("Azure upload failed");
  }
}

export async function deleteFileFromAzure(fileUrl: string): Promise<void> {
  console.log("Starting file deletion from Azure...");

  const containerName = "eatinout";
  const baseUrl = "https://eatinoutstorage.blob.core.windows.net";

  console.log("Extracting filename from URL...");
  const fileName = fileUrl.split("/").pop();
  console.log("Filename extracted:", fileName);

  try {
    // Get dynamic SAS token for deletion
    console.log("Getting dynamic SAS token for deletion...");
    const tokenResponse = await axios.get(`/api/get-upload-url?fileName=${encodeURIComponent(fileName!)}&operation=delete`);
    
    if (tokenResponse.status !== 200) {
      throw new Error("Failed to get delete URL");
    }

    const { uploadUrl } = tokenResponse.data;
    const deleteUrl = uploadUrl; // The upload URL can be used for deletion with proper permissions

    console.log("Initiating delete request...");
    const response = await axios.delete(deleteUrl, {
      headers: {
        "x-ms-blob-type": "BlockBlob",
      },
    });

    if (response.status === 202) {
      console.log("File deleted successfully");
    } else {
      console.log("Delete failed with status:", response.status);
      throw new Error("Failed to delete file");
    }
  } catch (error) {
    console.error("Azure delete error:", error);
    throw new Error("Azure delete failed");
  }
}
