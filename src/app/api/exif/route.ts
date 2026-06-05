import { createApiParams } from "@/utils/api-helpers";
import { successResponse, withErrorHandler, errorResponse, ApiErrors } from "../data";
import type { Tags } from "exiftool-vendored";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

async function readExif(filePath: string) {
  const { exiftool } = await import("exiftool-vendored");
  return exiftool.read(filePath);
}

export const POST = withErrorHandler<[Request], { exif: Tags }>(async (request: Request) => {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return errorResponse(ApiErrors.BAD_REQUEST("No file provided"));
    }

    if (!file.type.startsWith("image/")) {
      return errorResponse(ApiErrors.BAD_REQUEST("Only image files are allowed"));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    const extension = path.extname(file.name) || ".jpg";
    tempFilePath = path.join(
      tempDir,
      `exif_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`
    );

    await fs.writeFile(tempFilePath, buffer);

    const exif = await readExif(tempFilePath);

    return successResponse({ exif });
  } catch (error: any) {
    console.error("EXIF extraction error:", error);
    return errorResponse(ApiErrors.INTERNAL_ERROR(`Failed to extract EXIF data: ${error.message}`));
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn("Failed to cleanup temp file:", cleanupError);
      }
    }
  }
});

export const GET = withErrorHandler<[Request], { exif: Tags }>(async (request: Request) => {
  let tempFilePath: string | null = null;

  try {
    const apiParams = createApiParams(request);
    const imageUrl = apiParams.getString("url");

    if (!imageUrl) {
      return errorResponse(ApiErrors.BAD_REQUEST("Image URL is required"));
    }

    try {
      new URL(imageUrl);
    } catch {
      return errorResponse(ApiErrors.BAD_REQUEST("Invalid URL format"));
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return errorResponse(ApiErrors.BAD_REQUEST("Failed to download image"));
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      return errorResponse(ApiErrors.BAD_REQUEST("URL does not point to an image"));
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const tempDir = os.tmpdir();
    const extension = path.extname(new URL(imageUrl).pathname) || ".jpg";
    tempFilePath = path.join(
      tempDir,
      `exif_url_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`
    );

    await fs.writeFile(tempFilePath, buffer);

    const exif = await readExif(tempFilePath);

    return successResponse({ exif });
  } catch (error: any) {
    console.error("EXIF extraction error:", error);
    return errorResponse(ApiErrors.INTERNAL_ERROR(`Failed to extract EXIF data: ${error.message}`));
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn("Failed to cleanup temp file:", cleanupError);
      }
    }
  }
});
