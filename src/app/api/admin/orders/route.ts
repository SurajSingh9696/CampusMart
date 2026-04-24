import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { normalizeLegacyOrderStatus, ORDER_STATUS } from "@/lib/order-workflow";

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
  if (status === "payout_due") {
    query.status = { $in: [ORDER_STATUS.readyForPayment, "fulfilled"] };
  } else if (status !== "all") {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate("listingId", "title type")
    .populate("buyerId", "name email")
    .populate("sellerId", "name email shop.payoutUpi")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await Order.countDocuments(query);

  const mapped = orders.map((order: Record<string, unknown>) => {
    const normalizedStatus = normalizeLegacyOrderStatus(String(order.status || ""));
    const cancelReason =
      String(order.cancelReason || "") ||
      String(order.customerCancelReason || "") ||
      String(order.sellerCancelReason || "");
    const seller = (order.sellerId || {}) as Record<string, unknown>;
    const sellerShop = (seller.shop || {}) as Record<string, unknown>;

    const sellerAmount = typeof order.sellerAmount === "number" ? order.sellerAmount : 0;
    const buyerAmount = typeof order.amount === "number" ? order.amount : 0;
    const platformFeeAmount =
      typeof order.platformFeeAmount === "number"
        ? order.platformFeeAmount
        : Math.max(0, Number((buyerAmount - sellerAmount).toFixed(2)));

    return {
      ...order,
      customerId: order.buyerId,
      status: normalizedStatus,
      cancelReason,
      buyerAmount,
      sellerAmount,
      platformFeeAmount,
      payoutDueAmount: normalizedStatus === ORDER_STATUS.readyForPayment ? sellerAmount : 0,
      sellerPayoutUpi: String(order.sellerPayoutUpi || "") || String(sellerShop.payoutUpi || ""),
    };
  });

  return NextResponse.json({ orders: mapped, total, page, limit });
}
