import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { normalizeLegacyOrderStatus, ORDER_STATUS } from "@/lib/order-workflow";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "seller")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const orders = await Order.find({ sellerId: session.user.id })
    .populate("listingId", "title type mediaUrls fileUrls")
    .populate("buyerId", "name email accountNumber idCardNumber idCardImageId")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const mapped = orders.map((order: Record<string, unknown>) => {
    const buyer = (order.buyerId || {}) as Record<string, unknown>;
    const status = normalizeLegacyOrderStatus(String(order.status || ""));
    const cancelReason =
      String(order.cancelReason || "") ||
      String(order.customerCancelReason || "") ||
      String(order.sellerCancelReason || "");

    const snapshotImageId = order.buyerIdCardImageIdSnapshot;
    const buyerImageId = snapshotImageId || buyer.idCardImageId;
    const buyerIdCardImageId =
      buyerImageId && typeof buyerImageId === "object" && "toString" in buyerImageId
        ? (buyerImageId as { toString: () => string }).toString()
        : String(buyerImageId || "");

    const sellerAmount = typeof order.sellerAmount === "number" ? order.sellerAmount : 0;

    return {
      ...order,
      customerId: order.buyerId,
      status,
      cancelReason,
      buyerAccountNumber:
        String(order.buyerAccountNumberSnapshot || "") || String(buyer.accountNumber || ""),
      buyerIdCardNumber:
        String(order.buyerIdCardNumberSnapshot || "") || String(buyer.idCardNumber || ""),
      buyerIdCardImageId,
      buyerIdCardImageUrl: buyerIdCardImageId ? `/api/media/${buyerIdCardImageId}` : "",
      payoutDueAmount: status === ORDER_STATUS.readyForPayment ? sellerAmount : 0,
    };
  });

  return NextResponse.json({ orders: mapped });
}
