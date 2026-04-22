import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Notification } from "@/models/Notification";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import { deriveListingBuyerPrice } from "@/lib/pricing";

const decisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().min(5).max(500),
});

const sellerActionSchema = z.object({
  action: z.enum(["deactivate", "activate", "delete"]),
});

const listingUpdateSchema = z.object({
  type: z.enum(["product", "project", "notes", "event"]).optional(),
  title: z.string().min(3).max(160).optional(),
  description: z.string().min(10).max(4000).optional(),
  price: z.number().min(0).optional(),
  isFree: z.boolean().optional(),
  mediaUrls: z.array(z.string()).optional(),
  resourceUrl: z.string().optional(),
  isAuction: z.boolean().optional(),
  auctionStartPrice: z.number().min(0).optional(),
  eventConfig: z.object({
    eventDate: z.string().optional(),
    eventStartAt: z.string().optional(),
    eventEndAt: z.string().optional(),
    venue: z.string().optional(),
    ticketLimit: z.number().int().min(0).optional(),
  }).optional(),
  projectConfig: z.object({
    targetYear: z.string().optional(),
    year: z.string().optional(),
    branch: z.string().optional(),
    deployedPreviewUrl: z.string().optional(),
    zipUrl: z.string().optional(),
  }).optional(),
  notesConfig: z.object({
    subject: z.string().optional(),
    semester: z.string().optional(),
    year: z.string().optional(),
    branch: z.string().optional(),
    notesPdfUrl: z.string().optional(),
  }).optional(),
});

function toValidDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getFirstZodErrorMessage(error: z.ZodError) {
  const flattened = error.flatten();
  const formMessage = flattened.formErrors.find((message) => typeof message === "string" && message.trim().length > 0);
  if (formMessage) return formMessage;

  const fieldMessage = Object.values(flattened.fieldErrors)
    .flat()
    .find((message) => typeof message === "string" && message.trim().length > 0);

  return fieldMessage || "Invalid request payload";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  await connectDB();
  const listing = await Listing.findById(id)
    .populate("sellerId", "name campus shop.shopName")
    .lean();

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sellerId = typeof listing.sellerId === "object" && listing.sellerId !== null && "_id" in listing.sellerId
    ? String((listing.sellerId as { _id: unknown })._id)
    : String(listing.sellerId);

  const canSeeSellerPrice = Boolean(
    session?.user && (session.user.role === "admin" || session.user.id === sellerId)
  );

  const pricing = deriveListingBuyerPrice({
    sellerPrice: Number(listing.price || 0),
    isFree: Boolean(listing.isFree),
    markupPercent: Number((listing as { priceMarkupPercent?: number }).priceMarkupPercent),
  });

  const withViewerPrice = {
    ...listing,
    sellerPrice: pricing.sellerPrice,
    buyerPrice: pricing.buyerPrice,
    platformFeeAmount: pricing.platformFeeAmount,
    platformMarkupPercent: pricing.markupPercent,
    price: canSeeSellerPrice ? pricing.sellerPrice : pricing.buyerPrice,
  };

  return NextResponse.json({ listing: withViewerPrice });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  const guard = await requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  const listing = await Listing.findById(id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (guard.session.user.role === "admin") {
    const body = await request.json();
    const data = decisionSchema.parse(body);

    listing.status = data.action === "approve" ? "live" : "rejected";
    listing.approvedBy = new Types.ObjectId(guard.session.user.id);
    listing.approvalComment = data.comment;
    await listing.save();

    await Notification.create({
      userId: listing.sellerId,
      title: `Listing ${data.action}d`,
      message: `Your listing \"${listing.title}\" was ${data.action}d by admin. Comment: ${data.comment}`,
      category: "listing_moderation",
    });

    return NextResponse.json({ ok: true });
  }

  if (guard.session.user.role === "seller") {
    if (listing.sellerId.toString() !== guard.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = sellerActionSchema.parse(body);

    if (data.action === "delete") {
      await listing.deleteOne();
      return NextResponse.json({ ok: true });
    }

    listing.status = data.action === "deactivate" ? "deactivated" : "live";
    if (data.action === "deactivate") {
      listing.deactivatedAt = new Date();
    }

    await listing.save();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  const guard = await requireRole(["seller"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = listingUpdateSchema.parse(body);

    await connectDB();
    const listing = await Listing.findById(id);
    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (listing.sellerId.toString() !== guard.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typeof data.type === "string") listing.type = data.type;
    if (typeof data.title === "string") listing.title = data.title.trim();
    if (typeof data.description === "string") listing.description = data.description.trim();
    if (typeof data.isFree === "boolean") listing.isFree = data.isFree;
    if (typeof data.price === "number") listing.price = data.price;
    if (listing.isFree) listing.price = 0;

    if (Array.isArray(data.mediaUrls)) listing.mediaUrls = data.mediaUrls;
    if (typeof data.resourceUrl === "string") listing.resourceUrl = data.resourceUrl;

    if (typeof data.isAuction === "boolean") listing.isAuction = data.isAuction;
    if (typeof data.auctionStartPrice === "number") listing.auctionStartPrice = data.auctionStartPrice;

    if (data.eventConfig) {
      if (!listing.eventConfig) {
        listing.eventConfig = {
          branch: [],
          course: [],
          years: [],
          eventQuestions: [],
          venue: "",
          ticketLimit: 0,
        };
      }

      const startRaw = data.eventConfig.eventStartAt || data.eventConfig.eventDate || listing.eventConfig.eventStartAt || listing.eventConfig.eventDate;
      const endRaw = data.eventConfig.eventEndAt || listing.eventConfig.eventEndAt;

      const startAt = toValidDate(startRaw);
      const endAt = toValidDate(endRaw);

      if ((listing.type === "event" || data.type === "event") && !startAt) {
        return NextResponse.json({ error: "Event start date and time are required" }, { status: 400 });
      }

      if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
        return NextResponse.json({ error: "Event end time must be after start time" }, { status: 400 });
      }

      if (typeof data.eventConfig.venue === "string") {
        listing.eventConfig.venue = data.eventConfig.venue;
      }
      if (typeof data.eventConfig.ticketLimit === "number") {
        listing.eventConfig.ticketLimit = data.eventConfig.ticketLimit;
      }
      if (startAt) {
        listing.eventConfig.eventDate = startAt;
        listing.eventConfig.eventStartAt = startAt;
      }
      if (endAt) {
        listing.eventConfig.eventEndAt = endAt;
      }
    }

    if (data.projectConfig) {
      if (!listing.projectConfig) {
        listing.projectConfig = {
          targetYear: "",
          branch: "",
          semester: "",
          zipUrl: "",
          deployedPreviewUrl: "",
          oneBuyerOnly: true,
        };
      }

      const targetYear = data.projectConfig.targetYear || data.projectConfig.year || listing.projectConfig.targetYear || "";
      listing.projectConfig.targetYear = targetYear;
      if (typeof data.projectConfig.branch === "string") {
        listing.projectConfig.branch = data.projectConfig.branch;
      }
      if (typeof data.projectConfig.deployedPreviewUrl === "string") {
        listing.projectConfig.deployedPreviewUrl = data.projectConfig.deployedPreviewUrl;
      }
      if (typeof data.projectConfig.zipUrl === "string") {
        listing.projectConfig.zipUrl = data.projectConfig.zipUrl;
      }
    }

    if (data.notesConfig) {
      if (!listing.notesConfig) {
        listing.notesConfig = {
          subject: "",
          year: "",
          semester: "",
          notesPdfUrl: "",
          previewPages: 2,
        };
      }

      if (typeof data.notesConfig.subject === "string") {
        listing.notesConfig.subject = data.notesConfig.subject;
      }
      if (typeof data.notesConfig.year === "string") {
        listing.notesConfig.year = data.notesConfig.year;
      }
      if (typeof data.notesConfig.semester === "string") {
        listing.notesConfig.semester = data.notesConfig.semester;
      }
      if (typeof data.notesConfig.notesPdfUrl === "string") {
        listing.notesConfig.notesPdfUrl = data.notesConfig.notesPdfUrl;
      }
    }

    // Re-queue edited listings for moderation.
    listing.status = "pending_approval";
    listing.approvalComment = "";
    listing.approvedBy = undefined;

    await listing.save();

    return NextResponse.json({ ok: true, listing });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: getFirstZodErrorMessage(error),
        details: error.flatten(),
      }, { status: 400 });
    }
    console.error("[listings PUT]", error);
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  const guard = await requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  const listing = await Listing.findById(id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = guard.session.user.role;
  if (role === "admin") {
    await listing.deleteOne();
    return NextResponse.json({ ok: true });
  }

  if (role === "seller") {
    if (listing.sellerId.toString() !== guard.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await listing.deleteOne();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
