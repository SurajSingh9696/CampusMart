import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "seller")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const orders = await Order.find({ sellerId: session.user.id })
    .populate("listingId", "title type")
    .populate("buyerId", "name email")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const mapped = orders.map((o: Record<string, unknown>) => ({ ...o, customerId: o.buyerId }));
  return NextResponse.json({ orders: mapped });
}
