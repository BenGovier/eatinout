import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  processImageToWebP,
  buildUniqueFileName,
  IMAGE_PRESETS,
} from "@/lib/image-processing";

const BUCKET_NAME =
  process.env.SUPABASE_STORAGE_BUCKET || "eatinout-staging-storage";

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

    /* ---------- Supabase Storage Upload ---------- */
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(uniqueFileName, finalBuffer, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return NextResponse.json(
        {
          success: false,
          message: uploadError.message || "Failed to upload to Supabase Storage",
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uniqueFileName);

    const publicUrl = publicUrlData.publicUrl;

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

    // Extract path/filename from URL (supports both Supabase URLs and legacy Azure URLs)
    let fileName = "";
    if (fileUrl.includes(`/storage/v1/object/public/${BUCKET_NAME}/`)) {
      fileName = fileUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`)[1];
    } else {
      fileName = fileUrl.split("/").pop() || "";
    }

    // Clean query parameters if present
    fileName = fileName.split("?")[0];

    if (!fileName) {
      return NextResponse.json(
        { success: false, message: "Invalid URL" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (deleteError) {
      console.error("Supabase Storage delete error:", deleteError);
      return NextResponse.json(
        { success: false, message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}