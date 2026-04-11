import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Notification } from "@/models/Notification";
import { requireAuth, requireRole } from "@/lib/auth-guards";

const decisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().min(5).max(500),
});

const sellerActionSchema = z.object({
  action: z.enum(["deactivate", "activate", "delete"]),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  await connectDB();
  const listing = await Listing.findById(id)
    .populate("sellerId", "name campus shop.shopName")
    .lean();

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ listing });
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
