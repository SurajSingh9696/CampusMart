import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { requireRole } from "@/lib/auth-guards";

const schema = z.object({
  userId: z.string().min(10),
  block: z.boolean(),
  comment: z.string().min(5).max(500),
});

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (!Types.ObjectId.isValid(data.userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(data.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.isBlocked = data.block;
    user.blockedReason = data.comment;
    await user.save();

    await Notification.create({
      userId: user._id,
      title: data.block ? "Account blocked" : "Account unblocked",
      message: `${data.block ? "Blocked" : "Unblocked"} by admin. Comment: ${data.comment}`,
      category: "moderation",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 });
  }
}
