import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";
import { Notification } from "@/models/Notification";

const schema = z.object({
  type: z.enum(["product", "project", "notes", "event"]),
  id: z.string().min(10),
  action: z.enum(["approve", "reject"]),
  comment: z.string().min(5).max(500),
});

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (!Types.ObjectId.isValid(data.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    const item =
      data.type === "product"
        ? await Product.findById(data.id)
        : data.type === "project"
        ? await Project.findById(data.id)
        : data.type === "notes"
        ? await Note.findById(data.id)
        : await Event.findById(data.id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    item.status = data.action === "approve" ? "live" : "rejected";
    item.approvalComment = data.comment;
    item.approvedBy = new Types.ObjectId(guard.session.user.id);
    await item.save();

    await Notification.create({
      userId: item.sellerId,
      title: `${data.type} ${data.action}d`,
      message: `Your ${data.type} \"${item.title}\" was ${data.action}d. Comment: ${data.comment}`,
      category: "listing_moderation",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to moderate item" }, { status: 500 });
  }
}
