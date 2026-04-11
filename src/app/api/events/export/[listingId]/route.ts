import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { Event } from "@/models/market/Event";
import { EventRegistration } from "@/models/EventRegistration";

export async function GET(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const guard = await requireRole(["seller", "admin"]);
  if ("error" in guard) return guard.error;

  const { listingId } = await params;

  await connectDB();

  const listing = await Event.findById(listingId).lean();
  if (!listing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (guard.session.user.role === "seller" && String(listing.sellerId) !== guard.session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registrations = await EventRegistration.find({ listingId }).lean();

  const csvRows = ["registrationId,customerId,answers"];
  for (const row of registrations) {
    const answers = JSON.stringify(row.answers).replace(/"/g, '""');
    csvRows.push(`${row._id},${row.customerId},"${answers}"`);
  }

  return new NextResponse(csvRows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=event-${listingId}-registrations.csv`,
    },
  });
}
