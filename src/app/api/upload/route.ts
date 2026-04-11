import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    let resourceType: "image" | "video" | "raw" = "image";
    let folder = "campusmart/images";

    if (type === "pdf" || type === "zip") {
      resourceType = "raw";
      folder = `campusmart/${type}s`;
    } else if (type === "video") {
      resourceType = "video";
      folder = "campusmart/videos";
    }

    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    });

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error("[upload POST]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
