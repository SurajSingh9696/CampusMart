import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/market/Event";
import { requireRole } from "@/lib/auth-guards";

const createSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(20).max(4000),
  bannerImageId: z.string().optional(),
  galleryImageIds: z.array(z.string()).default([]),
  eventDate: z.string().datetime(),
  eventTime: z.string().min(2),
  branch: z.array(z.string()).default([]),
  course: z.array(z.string()).default([]),
  years: z.array(z.string()).default([]),
  isFree: z.boolean().default(false),
  ticketPrice: z.number().min(0).default(0),
  ticketLimit: z.number().min(0).default(0),
  registrationQuestions: z.array(z.string()).default(["Name", "Branch", "Year", "Roll Number"]),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campus = searchParams.get("campus");

  await connectDB();
  const query: Record<string, unknown> = { status: "live" };
  if (campus && campus !== "Global") query.campus = campus;

  const items = await Event.find(query).sort({ eventDate: 1 }).limit(100).lean();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const guard = await requireRole(["seller"]);
  if ("error" in guard) return guard.error;
  if (guard.session.user.sellerApprovalStatus !== "approved") {
    return NextResponse.json({ error: "Seller account is pending approval" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    await connectDB();

    const item = await Event.create({
      ...data,
      sellerId: guard.session.user.id,
      campus: guard.session.user.campus,
      status: "pending_approval",
      eventDate: new Date(data.eventDate),
    });

    return NextResponse.json({ ok: true, id: item._id.toString() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create event" }, { status: 500 });
  }
}
