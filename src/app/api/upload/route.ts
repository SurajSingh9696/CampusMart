import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { MediaAsset } from "@/models/MediaAsset";

const IMAGE_MAX_SIZE = 1 * 1024 * 1024;
const DOCUMENT_MAX_SIZE = 10 * 1024 * 1024;

const ZIP_EXTENSIONS = [".zip", ".rar", ".7z", ".tar", ".gz", ".tgz"];

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isArchive(file: File) {
  const name = file.name.toLowerCase();
  const byExtension = ZIP_EXTENSIONS.some((ext) => name.endsWith(ext));
  const byMime = [
    "application/zip",
    "application/x-zip-compressed",
    "application/x-7z-compressed",
    "application/x-rar-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-gzip",
  ].includes(file.type);

  return byExtension || byMime;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string || "image";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = type === "image" ? IMAGE_MAX_SIZE : DOCUMENT_MAX_SIZE;

    if (file.size > maxSize) {
      const maxLabel = maxSize === IMAGE_MAX_SIZE ? "1MB" : "10MB";
      return NextResponse.json({ error: `File too large (max ${maxLabel})` }, { status: 413 });
    }

    if (type === "image" && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }
    if (type === "pdf" && !isPdf(file)) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }
    if (type === "zip" && !isArchive(file)) {
      return NextResponse.json({ error: "Only archive files (.zip/.rar/.7z/.tar/.gz) are allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);
    // Convert to base64 payload before persisting in MongoDB.
    const base64Payload = originalBuffer.toString("base64");
    const bufferForStorage = Buffer.from(base64Payload, "base64");

    await connectDB();
    const mediaDoc = await MediaAsset.create({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: bufferForStorage.byteLength,
      data: bufferForStorage,
      purpose: `listing_${type}`,
      uploadedBy: session.user.id,
    });

    return NextResponse.json({
      url: `/api/media/${mediaDoc._id.toString()}`,
      mediaId: mediaDoc._id.toString(),
    });
  } catch (err) {
    console.error("[upload POST]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
