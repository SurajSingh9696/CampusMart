import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 30;

  const query: Record<string, unknown> = {};
  if (status !== "all") query.status = status;

  const listings = await Listing.find(query)
    .populate("sellerId", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return NextResponse.json({ listings });
}
