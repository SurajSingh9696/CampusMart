import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { Notification } from "@/models/Notification";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

const patchSchema = z
  .object({
    id: z.string().min(1).optional(),
    markAll: z.boolean().optional().default(false),
  })
  .refine((value) => value.markAll || Boolean(value.id), {
    message: "Either id or markAll=true is required",
  });

export async function GET(request: NextRequest) {
  const guard = await requireAuth();
  if ("error" in guard) return guard.error;

  try {
    const params = querySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") || undefined,
    });

    await connectDB();

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: guard.session.user.id })
        .sort({ createdAt: -1 })
        .limit(params.limit)
        .lean(),
      Notification.countDocuments({ userId: guard.session.user.id, isRead: false }),
    ]);

    const items = notifications.map((notification) => ({
      _id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      category: notification.category || "general",
      isRead: Boolean(notification.isRead),
      createdAt: notification.createdAt,
    }));

    return NextResponse.json({ notifications: items, unreadCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAuth();
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = patchSchema.parse(body);

    await connectDB();

    if (data.markAll) {
      await Notification.updateMany(
        { userId: guard.session.user.id, isRead: false },
        { $set: { isRead: true } }
      );
    } else if (data.id) {
      await Notification.updateOne(
        { _id: data.id, userId: guard.session.user.id },
        { $set: { isRead: true } }
      );
    }

    const unreadCount = await Notification.countDocuments({
      userId: guard.session.user.id,
      isRead: false,
    });

    return NextResponse.json({ ok: true, unreadCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to update notification" }, { status: 500 });
  }
}
