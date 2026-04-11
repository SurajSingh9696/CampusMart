import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";

const schema = z.object({
  type: z.enum(["product", "project", "notes", "event"]),
  id: z.string().min(10),
  action: z.enum(["deactivate", "activate", "delete"]),
});

export async function PATCH(request: Request) {
  const guard = await requireRole(["seller"]);
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
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(item.sellerId) !== guard.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (data.action === "delete") {
      await item.deleteOne();
      return NextResponse.json({ ok: true });
    }

    item.status = data.action === "deactivate" ? "deactivated" : "live";
    if (data.action === "deactivate" && "deactivatedAt" in item) {
      (item as { deactivatedAt?: Date }).deactivatedAt = new Date();
    }
    await item.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to process action" }, { status: 500 });
  }
}
