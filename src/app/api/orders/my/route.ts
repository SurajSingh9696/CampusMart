import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { normalizeLegacyOrderStatus } from "@/lib/order-workflow";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const orders = await Order.find({ buyerId: session.user.id })
    .populate("listingId", "title type mediaUrls fileUrls campus")
    .populate("sellerId", "name email")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const mapped = orders.map((order: Record<string, unknown>) => {
    const status = normalizeLegacyOrderStatus(String(order.status || ""));
    const cancelReason =
      String(order.cancelReason || "") ||
      String(order.customerCancelReason || "") ||
      String(order.sellerCancelReason || "");

    return {
      ...order,
      status,
      cancelReason,
      buyerAmount: typeof order.amount === "number" ? order.amount : 0,
      sellerAmount: typeof order.sellerAmount === "number" ? order.sellerAmount : 0,
      platformFeeAmount: typeof order.platformFeeAmount === "number" ? order.platformFeeAmount : 0,
    };
  });

  return NextResponse.json({ orders: mapped });
}

