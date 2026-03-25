import { NextRequest, NextResponse } from "next/server";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import {
  processImageToWebP,
  buildUniqueFileName,
  IMAGE_PRESETS,
} from "@/lib/image-processing";

const CONTAINER_NAME = "eatinout";
const AZURE_BASE_URL = "https://eatinoutstorage.blob.core.windows.net";

// export async function POST(req: NextRequest) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get("file") as File | null;
//     const preset = (formData.get("preset") as keyof typeof IMAGE_PRESETS) || "restaurantHero";

//     // Optional dimension overrides passed from client
//     const widthParam = formData.get("width");
//     const heightParam = formData.get("height");
//     const customWidth = widthParam ? parseInt(widthParam as string, 10) : undefined;
//     const customHeight = heightParam ? parseInt(heightParam as string, 10) : undefined;

//     if (!file) {
//       return NextResponse.json(
//         { success: false, message: "No file provided" },
//         { status: 400 }
//       );
//     }

//     if (!file.type.startsWith("image/")) {
//       return NextResponse.json(
//         { success: false, message: "Only image files are allowed" },
//         { status: 400 }
//       );
//     }

//     // if (file.size > 10 * 1024 * 1024) {
//     //   return NextResponse.json(
//     //     { success: false, message: "File size exceeds 10MB limit" },
//     //     { status: 400 }
//     //   );
//     // }

//     const arrayBuffer = await file.arrayBuffer();
//     const inputBuffer = Buffer.from(arrayBuffer);

//     const presetOptions = IMAGE_PRESETS[preset];

//     let finalBuffer: Buffer;
//     let contentType: string;
//     let fileExtension: string;

//     if (presetOptions === null) {
//       // No processing (e.g. PDF / menuPdf preset)
//       finalBuffer = inputBuffer;
//       contentType = file.type;
//       fileExtension = file.name.split(".").pop() || "bin";
//     } else {
//       // Merge preset with any custom dimension overrides from client
//       const processingOptions = {
//         ...presetOptions,
//         ...(customWidth !== undefined && { width: customWidth }),
//         ...(customHeight !== undefined && { height: customHeight }),
//       };

//       const processed = await processImageToWebP(inputBuffer, processingOptions);
//       finalBuffer = processed.buffer;
//       contentType = processed.contentType;
//       fileExtension = processed.extension;
//     }

//     const uniqueFileName = buildUniqueFileName(file.name, fileExtension);

//     const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
//     const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;

//     const sharedKeyCredential = new StorageSharedKeyCredential(
//       accountName,
//       accountKey
//     );
//     const blobServiceClient = new BlobServiceClient(
//       `https://${accountName}.blob.core.windows.net`,
//       sharedKeyCredential
//     );

//     const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
//     const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);

//     await blockBlobClient.uploadData(finalBuffer, {
//       blobHTTPHeaders: {
//         blobContentType: contentType,
//         blobCacheControl: "public, max-age=31536000, immutable",
//       },
//     });

//     const publicUrl = `${AZURE_BASE_URL}/${CONTAINER_NAME}/${uniqueFileName}`;

//     return NextResponse.json({
//       success: true,
//       url: publicUrl,
//       fileName: uniqueFileName,
//       originalSize: file.size,
//       processedSize: finalBuffer.length,
//       format: fileExtension,
//     });
//   } catch (error: any) {
//     console.error("Image upload error:", error);
//     return NextResponse.json(
//       { success: false, message: error.message || "Upload failed" },
//       { status: 500 }
//     );
//   }
// }

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    const preset =
      (formData.get("preset") as keyof typeof IMAGE_PRESETS) ||
      "restaurantHero";

    const widthParam = formData.get("width");
    const heightParam = formData.get("height");

    const customWidth = widthParam ? parseInt(widthParam as string, 10) : undefined;
    const customHeight = heightParam ? parseInt(heightParam as string, 10) : undefined;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    const isPdf = preset === "menuPdf";

    /* ---------- File type validation ---------- */
    if (!isPdf && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "Only image files are allowed" },
        { status: 400 }
      );
    }

    if (isPdf && file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, message: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    /* ---------- Size validation ---------- */
    const maxSizeMB = isPdf ? 10 : 50;

    if (file.size > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: `File size exceeds ${maxSizeMB}MB limit`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const presetOptions = IMAGE_PRESETS[preset];

    let finalBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    /* ---------- Image / PDF processing ---------- */
    if (isPdf || presetOptions === null) {
      finalBuffer = inputBuffer;
      contentType = file.type;
      fileExtension = file.name.split(".").pop() || "bin";
    } else {
      const processingOptions = {
        ...presetOptions,
        ...(customWidth !== undefined && { width: customWidth }),
        ...(customHeight !== undefined && { height: customHeight }),
      };

      const processed = await processImageToWebP(
        inputBuffer,
        processingOptions
      );

      finalBuffer = processed.buffer;
      contentType = processed.contentType;
      fileExtension = processed.extension;
    }

    const uniqueFileName = buildUniqueFileName(
      file.name,
      fileExtension
    );

    /* ---------- Azure Upload ---------- */
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;

    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);

    const blockBlobClient =
      containerClient.getBlockBlobClient(uniqueFileName);

    await blockBlobClient.uploadData(finalBuffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: "public, max-age=31536000, immutable",
      },
    });

    const publicUrl = `${AZURE_BASE_URL}/${CONTAINER_NAME}/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: uniqueFileName,
      originalSize: file.size,
      processedSize: finalBuffer.length,
      format: fileExtension,
    });
  } catch (error: any) {
    console.error("File upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Upload failed",
      },
      { status: 500 }
    );
  }
}
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, message: "URL is required" },
        { status: 400 }
      );
    }

    const fileName = fileUrl.split("/").pop();
    if (!fileName) {
      return NextResponse.json(
        { success: false, message: "Invalid URL" },
        { status: 400 }
      );
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;

    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.deleteIfExists();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}