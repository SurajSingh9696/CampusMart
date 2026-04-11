import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { MediaAsset } from "@/models/MediaAsset";

const MAX_IMAGE_SIZE = 500 * 1024;
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

const schema = z.object({
  base64Data: z.string().min(30),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  purpose: z.string().default("general"),
});

function parseBase64(input: string) {
  const match = input.match(/^data:(.*?);base64,(.*)$/);
  if (match) {
    return { contentTypeFromDataUrl: match[1], payload: match[2] };
  }
  return { contentTypeFromDataUrl: null, payload: input };
}

function isValidBase64(input: string) {
  return /^[A-Za-z0-9+/=\s]+$/.test(input);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const parsed = parseBase64(data.base64Data);
    const contentType = parsed.contentTypeFromDataUrl || data.contentType;

    if (!isValidBase64(parsed.payload)) {
      return NextResponse.json({ error: "Invalid base64 payload" }, { status: 400 });
    }

    if (!allowed.has(contentType)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WEBP are allowed" }, { status: 400 });
    }

    const byteLength = Buffer.byteLength(parsed.payload, "base64");
    if (byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image exceeds 500KB limit" }, { status: 413 });
    }

    const buffer = Buffer.from(parsed.payload, "base64");

    await connectDB();

    const doc = await MediaAsset.create({
      fileName: data.fileName,
      contentType,
      size: byteLength,
      data: buffer,
      purpose: data.purpose,
    });

    return NextResponse.json({ ok: true, mediaId: doc._id.toString(), size: doc.size });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    if (error instanceof Error) {
      if (error.message.includes("MONGODB_URI")) {
        return NextResponse.json(
          { error: "Database is not configured. Set MONGODB_URI in .env.local" },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unable to upload media" }, { status: 500 });
  }
}
