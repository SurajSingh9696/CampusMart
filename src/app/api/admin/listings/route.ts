import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";

const STATUS_ALIASES: Record<string, string[]> = {
  pending_approval: ["pending_approval", "pending"],
  live: ["live", "active"],
  rejected: ["rejected"],
  sold: ["sold"],
  deactivated: ["deactivated"],
  draft: ["draft"],
};

function getStatusQuery(status: string) {
  const normalized = status.trim().toLowerCase();
  if (!normalized || normalized === "all") return null;

  const mapped = STATUS_ALIASES[normalized];
  if (!mapped) return { status: normalized };

  return mapped.length === 1
    ? { status: mapped[0] }
    : { status: { $in: mapped } };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending_approval";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 30;

  const query: Record<string, unknown> = {};
  const statusQuery = getStatusQuery(status);
  if (statusQuery) Object.assign(query, statusQuery);

  const listings = await Listing.find(query)
    .populate("sellerId", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return NextResponse.json({ listings });
}
