import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const query: Record<string, unknown> = {};
  if (status !== "all") query.status = status;

  const orders = await Order.find(query)
    .populate("listingId", "title type")
    .populate("buyerId", "name")
    .populate("sellerId", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const mapped = orders.map((o: Record<string, unknown>) => ({ ...o, customerId: o.buyerId }));
  return NextResponse.json({ orders: mapped });
}
