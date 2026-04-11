import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { Event } from "@/models/market/Event";
import { EventRegistration } from "@/models/EventRegistration";

const schema = z.object({
  listingId: z.string().min(10),
  answers: z.record(z.string(), z.string().min(1)).default({}),
});

export async function POST(request: Request) {
  const guard = await requireRole(["customer"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (!Types.ObjectId.isValid(data.listingId)) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    await connectDB();

    const event = await Event.findById(data.listingId).lean();
    if (!event || event.status !== "live") {
      return NextResponse.json({ error: "Event not available" }, { status: 404 });
    }

    const registration = await EventRegistration.findOneAndUpdate(
      { listingId: data.listingId, customerId: guard.session.user.id },
      { answers: data.answers },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, registrationId: registration._id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to register for event" }, { status: 500 });
  }
}
