import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { WishlistItem } from "@/models/WishlistItem";
import mongoose from "mongoose";

const addSchema = z.object({
  listingId: z.string().min(10),
  itemType: z.enum(["product", "project", "notes", "event"]),
  campus: z.string().optional(),
});

const removeSchema = z.object({
  listingId: z.string().min(10),
});

export async function GET() {
  const guard = await requireRole(["customer"]);
  if ("error" in guard) return guard.error;

  await connectDB();
  const items = await WishlistItem.find({ userId: guard.session.user.id })
    .populate("listingId", "title price isFree type mediaUrls campus status")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const guard = await requireRole(["customer"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = addSchema.parse(body);

    await connectDB();

    await WishlistItem.findOneAndUpdate(
      { userId: guard.session.user.id, listingId: new mongoose.Types.ObjectId(data.listingId) },
      {
        userId: guard.session.user.id,
        listingId: new mongoose.Types.ObjectId(data.listingId),
        itemType: data.itemType,
        campus: data.campus || "",
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to add wishlist item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireRole(["customer"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = removeSchema.parse(body);

    await connectDB();
    await WishlistItem.deleteOne({
      userId: guard.session.user.id,
      listingId: new mongoose.Types.ObjectId(data.listingId),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to remove wishlist item" }, { status: 500 });
  }
}

