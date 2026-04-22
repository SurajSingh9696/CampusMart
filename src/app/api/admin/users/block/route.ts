import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { requireRole } from "@/lib/auth-guards";

const legacySchema = z.object({
  userId: z.string().min(10),
  block: z.boolean(),
  comment: z.string().trim().min(0).max(500).optional(),
});

const actionSchema = z.object({
  userId: z.string().min(10),
  action: z.enum(["block", "unblock"]),
  reason: z.string().trim().min(0).max(500).optional(),
});

function firstZodMessage(error: z.ZodError) {
  const flattened = error.flatten();
  return (
    flattened.formErrors[0] ||
    Object.values(flattened.fieldErrors).flat()[0] ||
    "Invalid request payload"
  );
}

async function handleModeration(request: Request) {
  const guard = await requireRole(["admin"]);
  if ("error" in guard) return guard.error;

  try {
    const rawBody = await request.json();

    let userId = "";
    let block = false;
    let reason = "";

    const legacyParsed = legacySchema.safeParse(rawBody);
    if (legacyParsed.success) {
      userId = legacyParsed.data.userId;
      block = legacyParsed.data.block;
      reason = (legacyParsed.data.comment || "").trim();
    } else {
      const parsed = actionSchema.parse(rawBody);
      userId = parsed.userId;
      block = parsed.action === "block";
      reason = (parsed.reason || "").trim();
    }

    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (block && reason.length < 5) {
      return NextResponse.json({ error: "Block reason must be at least 5 characters" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (block && user.role === "admin") {
      return NextResponse.json({ error: "Admin accounts cannot be blocked" }, { status: 403 });
    }

    if (block && user._id.toString() === guard.session.user.id) {
      return NextResponse.json({ error: "You cannot block your own account" }, { status: 403 });
    }

    const finalReason = block ? reason : "";
    user.isBlocked = block;
    user.blockedReason = finalReason;
    await user.save();

    const adminComment = block
      ? finalReason
      : reason || "Unblocked by admin";

    await Notification.create({
      userId: user._id,
      title: block ? "Account blocked" : "Account unblocked",
      message: `${block ? "Blocked" : "Unblocked"} by admin. Comment: ${adminComment}`,
      category: "moderation",
    });

    return NextResponse.json({
      ok: true,
      user: {
        _id: user._id.toString(),
        isBlocked: user.isBlocked,
        blockedReason: user.blockedReason || "",
        status: user.isBlocked ? "blocked" : "active",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: firstZodMessage(error), details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  return handleModeration(request);
}

export async function POST(request: Request) {
  return handleModeration(request);
}
