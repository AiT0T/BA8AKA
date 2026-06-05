import { NextResponse } from "next/server";
import OSS from "ali-oss";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_UPLOAD_SIZE = 300 * 1024 * 1024;
const allowedTypes = ["text/markdown", "text/plain", "image/", "video/"];

const ossConfig = {
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
};

function missingOssEnvVars() {
  return Object.entries(ossConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function createOssClient() {
  const missing = missingOssEnvVars();
  if (missing.length > 0) {
    throw new Error(`Missing required OSS environment variables: ${missing.join(", ")}`);
  }

  return new OSS({
    region: ossConfig.region!,
    accessKeyId: ossConfig.accessKeyId!,
    accessKeySecret: ossConfig.accessKeySecret!,
    bucket: ossConfig.bucket!,
  });
}

function sanitizeDirectory(value: FormDataEntryValue | string | null): string {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const sanitized = value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");

  return sanitized;
}

function isAllowedFile(file: File) {
  return allowedTypes.some((type) => file.type.startsWith(type) || file.name.endsWith(".md"));
}

function getBasePath(file: File) {
  if (file.type.startsWith("image/")) {
    return "images";
  }

  if (file.type.startsWith("video/")) {
    return "videos";
  }

  return "articles";
}

function buildObjectName(file: File, directory: string, extension: string) {
  const basePath = getBasePath(file);
  const firstSegment = directory.split("/")[0];
  const objectDirectory = directory
    ? firstSegment === basePath
      ? directory
      : `${basePath}/${directory}`
    : basePath === "articles"
      ? "articles"
      : `${basePath}/articles`;

  return `${objectDirectory}/${uuidv4()}.${extension}`;
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 300M limit" },
        { status: 413 }
      );
    }

    const requestUrl = new URL(request.url);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const directory = sanitizeDirectory(
      formData.get("directory") ||
      formData.get("path") ||
      requestUrl.searchParams.get("path")
    );

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 300M limit" },
        { status: 413 }
      );
    }

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { error: "Only markdown, image and video files are allowed" },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    const filename = buildObjectName(file, directory, extension);
    const stream = Readable.fromWeb(file.stream() as any);
    const client = createOssClient();

    await client.putStream(filename, stream);

    const url = `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${filename}`;

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
