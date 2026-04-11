import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";

const schema = z.object({
  sellerId: z.string().min(10),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().min(5).max(500),
});

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (!Types.ObjectId.isValid(data.sellerId)) {
      return NextResponse.json({ error: "Invalid seller id" }, { status: 400 });
    }

    await connectDB();

    const seller = await User.findOne({ _id: data.sellerId, role: "seller" });
    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    seller.sellerApprovalStatus = data.decision;
    seller.sellerApprovalComment = data.comment;

    if (data.decision === "approved") {
      seller.sellerApprovalDeadline = undefined;
      seller.sellerRejectedDeleteAt = undefined;
    } else {
      seller.sellerRejectedDeleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await seller.save();

    await Notification.create({
      userId: seller._id,
      title: `Seller account ${data.decision}`,
      message:
        data.decision === "approved"
          ? `Approved by admin. Comment: ${data.comment}`
          : `Rejected by admin. Account will be deleted in 24 hours unless you re-register. Comment: ${data.comment}`,
      category: "seller_approval",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to process decision" }, { status: 500 });
  }
}
