import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { MediaAsset } from "@/models/MediaAsset";
import { Notification } from "@/models/Notification";
import { z } from "zod";
import { Types } from "mongoose";

const decisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().trim().max(500).optional(),
});

const markupSchema = z.object({
  priceMarkupPercent: z.coerce.number().min(5).max(10),
});

function firstZodMessage(error: z.ZodError) {
  const flattened = error.flatten();
  return (
    flattened.formErrors[0] ||
    Object.values(flattened.fieldErrors).flat()[0] ||
    "Invalid decision payload"
  );
}

function extractListingMediaUrls(listing: {
  mediaUrls?: unknown;
  previewUrls?: unknown;
  resourceUrl?: unknown;
  projectConfig?: { zipUrl?: unknown } | null;
  notesConfig?: { notesPdfUrl?: unknown } | null;
}) {
  const values: string[] = [];

  if (Array.isArray(listing.mediaUrls)) {
    for (const value of listing.mediaUrls) {
      if (typeof value === "string" && value.trim()) values.push(value.trim());
    }
  }

  if (Array.isArray(listing.previewUrls)) {
    for (const value of listing.previewUrls) {
      if (typeof value === "string" && value.trim()) values.push(value.trim());
    }
  }

  if (typeof listing.resourceUrl === "string" && listing.resourceUrl.trim()) {
    values.push(listing.resourceUrl.trim());
  }

  if (typeof listing.projectConfig?.zipUrl === "string" && listing.projectConfig.zipUrl.trim()) {
    values.push(listing.projectConfig.zipUrl.trim());
  }

  if (typeof listing.notesConfig?.notesPdfUrl === "string" && listing.notesConfig.notesPdfUrl.trim()) {
    values.push(listing.notesConfig.notesPdfUrl.trim());
  }

  return [...new Set(values)];
}

function mediaAssetIdFromUrl(url: string) {
  const match = url.match(/\/api\/media\/([a-fA-F0-9]{24})(?:[/?#]|$)/);
  if (!match) return null;
  const id = match[1];
  return Types.ObjectId.isValid(id) ? id : null;
}

async function isMediaUrlReferencedByOtherListing(listingId: string, mediaUrl: string) {
  const existing = await Listing.exists({
    _id: { $ne: new Types.ObjectId(listingId) },
    $or: [
      { mediaUrls: mediaUrl },
      { previewUrls: mediaUrl },
      { resourceUrl: mediaUrl },
      { "projectConfig.zipUrl": mediaUrl },
      { "notesConfig.notesPdfUrl": mediaUrl },
    ],
  });

  return Boolean(existing);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { id: rawId } = await params;
    const id = rawId.trim();
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    const body = await req.json();
    const data = decisionSchema.parse(body);
    const comment = (data.comment || "").trim();
    if (data.action === "reject" && comment.length < 5) {
      return NextResponse.json({ error: "Rejection reason must be at least 5 characters" }, { status: 400 });
    }

    const newStatus = data.action === "approve" ? "live" : "rejected";
    const approvalComment = comment || (data.action === "approve" ? "Approved by admin" : "Rejected by admin");

    const listing = await Listing.findById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found or already removed" }, { status: 404 });
    }

    const pendingStatuses = new Set(["pending_approval", "pending"]);
    if (!pendingStatuses.has(listing.status)) {
      return NextResponse.json({
        error: "Listing was already reviewed",
        status: listing.status,
      }, { status: 409 });
    }

    const mediaUrlsToCleanup = data.action === "reject"
      ? extractListingMediaUrls(listing as unknown as {
          mediaUrls?: unknown;
          previewUrls?: unknown;
          resourceUrl?: unknown;
          projectConfig?: { zipUrl?: unknown } | null;
          notesConfig?: { notesPdfUrl?: unknown } | null;
        })
      : [];

    listing.status = newStatus;
    listing.approvedBy = new Types.ObjectId(session.user.id);
    listing.approvalComment = approvalComment;

    if (data.action === "reject") {
      listing.mediaUrls = [];
      listing.previewUrls = [];
      listing.resourceUrl = "";
      if (listing.projectConfig) listing.projectConfig.zipUrl = "";
      if (listing.notesConfig) listing.notesConfig.notesPdfUrl = "";
    }

    await listing.save();

    const removedMediaAssetIds: string[] = [];
    if (data.action === "reject" && mediaUrlsToCleanup.length > 0) {
      for (const mediaUrl of mediaUrlsToCleanup) {
        const mediaAssetId = mediaAssetIdFromUrl(mediaUrl);
        if (!mediaAssetId) continue;

        const referencedElsewhere = await isMediaUrlReferencedByOtherListing(id, mediaUrl);
        if (referencedElsewhere) continue;

        await MediaAsset.findByIdAndDelete(mediaAssetId);
        removedMediaAssetIds.push(mediaAssetId);
      }
    }

    await Notification.create({
      userId: listing.sellerId,
      title: data.action === "approve" ? "Listing approved" : "Listing rejected",
      message: `Your listing \"${listing.title}\" was ${data.action === "approve" ? "approved" : "rejected"}. Comment: ${approvalComment}`,
      category: "listing_moderation",
    });

    return NextResponse.json({ listing, removedMediaAssetIds });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodMessage(error), details: error.flatten() }, { status: 400 });
    }

    console.error("[admin listings PATCH]", error);
    return NextResponse.json({ error: "Unable to update listing" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { id: rawId } = await params;
    const id = rawId.trim();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    const body = await req.json();
    const data = markupSchema.parse(body);

    const listing = await Listing.findById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    listing.priceMarkupPercent = data.priceMarkupPercent;
    await listing.save();

    await Notification.create({
      userId: listing.sellerId,
      title: "Listing buyer markup updated",
      message: `Admin set buyer markup for \"${listing.title}\" to ${data.priceMarkupPercent.toFixed(
        2
      )}%.`,
      category: "listing_moderation",
    });

    return NextResponse.json({
      ok: true,
      listingId: listing._id,
      priceMarkupPercent: listing.priceMarkupPercent,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodMessage(error), details: error.flatten() }, { status: 400 });
    }

    console.error("[admin listings PUT]", error);
    return NextResponse.json({ error: "Unable to update listing markup" }, { status: 500 });
  }
}
