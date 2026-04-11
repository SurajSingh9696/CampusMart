import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";

export async function POST() {
  // Run by scheduled cron once per day.
  await connectDB();

  const threshold = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

  const [products, projects, notes, events] = await Promise.all([
    Product.updateMany(
      { status: "live", soldToCustomerId: { $exists: false }, createdAt: { $lte: threshold } },
      { status: "deactivated", deactivatedAt: new Date() }
    ),
    Project.updateMany(
      { status: "live", soldToCustomerId: { $exists: false }, createdAt: { $lte: threshold } },
      { status: "deactivated", deactivatedAt: new Date() }
    ),
    Note.updateMany(
      { status: "live", createdAt: { $lte: threshold } },
      { status: "deactivated", deactivatedAt: new Date() }
    ),
    Event.updateMany(
      { status: "live", createdAt: { $lte: threshold } },
      { status: "deactivated", deactivatedAt: new Date() }
    ),
  ]);

  return NextResponse.json({
    ok: true,
    deactivated: products.modifiedCount + projects.modifiedCount + notes.modifiedCount + events.modifiedCount,
  });
}
