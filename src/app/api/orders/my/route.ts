import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const orders = await Order.find({ buyerId: session.user.id })
    .populate("listingId", "title type mediaUrls campus")
    .populate("sellerId", "name email")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ orders });
}

