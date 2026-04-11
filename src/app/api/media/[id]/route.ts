import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { MediaAsset } from "@/models/MediaAsset";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
  }

  await connectDB();

  const media = await MediaAsset.findById(id).lean();
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const payload = media.data.buffer as ArrayBuffer;

  return new Response(payload, {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
