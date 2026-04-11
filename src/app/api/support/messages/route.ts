import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import { SupportMessage } from "@/models/SupportMessage";

const createSchema = z.object({
  subject: z.string().min(3).max(120),
  message: z.string().min(10).max(1200),
});

const adminUpdateSchema = z.object({
  id: z.string().min(10),
  status: z.enum(["open", "reviewed", "closed"]),
  adminComment: z.string().min(5).max(500),
});

export async function GET() {
  const guard = await requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();

  if (guard.session.user.role === "admin") {
    const all = await SupportMessage.find().sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ messages: all });
  }

  const own = await SupportMessage.find({ userId: guard.session.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ messages: own });
}

export async function POST(request: Request) {
  const guard = await requireAuth();
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    await connectDB();

    const doc = await SupportMessage.create({
      userId: guard.session.user.id,
      accountNumber: guard.session.user.accountNumber,
      subject: data.subject,
      message: data.message,
    });

    return NextResponse.json({ ok: true, id: doc._id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create message" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const guard = await requireRole(["admin"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = adminUpdateSchema.parse(body);

    await connectDB();

    await SupportMessage.findByIdAndUpdate(data.id, {
      status: data.status,
      adminComment: data.adminComment,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to update message" }, { status: 500 });
  }
}
