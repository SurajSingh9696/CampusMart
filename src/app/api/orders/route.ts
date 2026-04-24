import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Order } from "@/models/Order";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { Types } from "mongoose";
import { deriveOrderAmounts } from "@/lib/pricing";
import { ORDER_STATUS, PAYMENT_STATUS, normalizeLegacyOrderStatus } from "@/lib/order-workflow";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "customer") {
    return NextResponse.json({ error: "Only customers can place orders" }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await req.json();
    const { listingId, quantity = 1 } = body;

    if (!listingId || !Types.ObjectId.isValid(listingId)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    const listing = await Listing.findById(listingId).lean();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    // Only allow purchasing live listings
    if (listing.status !== "live") {
      return NextResponse.json({ error: "This listing is not available" }, { status: 400 });
    }

    // Prevent buying own listings (seller buying their own)
    if (listing.sellerId.toString() === session.user.id) {
      return NextResponse.json({ error: "You cannot buy your own listing" }, { status: 400 });
    }

    const [buyer, seller] = await Promise.all([
      User.findById(session.user.id)
        .select("accountNumber idCardNumber idCardImageId campus")
        .lean(),
      User.findById(listing.sellerId)
        .select("shop.payoutUpi")
        .lean(),
    ]);

    const amounts = deriveOrderAmounts({
      sellerUnitPrice: listing.price,
      quantity,
      isFree: listing.isFree,
      markupPercent: listing.priceMarkupPercent,
    });

    // Direct /api/orders callers are treated as fallback-paid to preserve legacy UX.
    const order = await Order.create({
      buyerId: session.user.id,
      sellerId: listing.sellerId,
      listingId: listing._id,
      amount: amounts.buyerAmount,
      sellerAmount: amounts.sellerAmount,
      platformFeeAmount: amounts.platformFeeAmount,
      priceMarkupPercent: amounts.markupPercent,
      currency: "INR",
      paymentProvider: "fallback",
      paymentReference: `CAMPUS-${Date.now()}`,
      paymentCaptureReference: `CAMPUS_CAPTURE-${Date.now()}`,
      paymentStatus: PAYMENT_STATUS.paid,
      paidAt: new Date(),
      status: ORDER_STATUS.pendingSellerAction,
      purchaseCampus: buyer?.campus || session.user.campus || listing.campus,
      quantity: amounts.quantity,
      sellerPayoutUpi: seller?.shop?.payoutUpi || "",
      buyerAccountNumberSnapshot: buyer?.accountNumber || "",
      buyerIdCardNumberSnapshot: buyer?.idCardNumber || "",
      buyerIdCardImageIdSnapshot: buyer?.idCardImageId,
    });

    // Notify the seller
    await Notification.create({
      userId: listing.sellerId,
      title: "New Order Received!",
      message: `${session.user.name} placed and paid for "${listing.title}". Amount: ₹${amounts.buyerAmount}`,
      category: "order",
    });

    return NextResponse.json({ order, ok: true }, { status: 201 });
  } catch (err) {
    console.error("[orders POST]", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectDB();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 20;

    const query: Record<string, unknown> = {};
    if (status !== "all") query.status = status;

    const orders = await Order.find(query)
      .populate("listingId", "title type")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Map buyerId -> customerId for UI compatibility
    const mapped = orders.map((order: Record<string, unknown>) => ({
      ...order,
      customerId: order.buyerId,
      status: normalizeLegacyOrderStatus(String(order.status || "")),
      cancelReason:
        String(order.cancelReason || "") ||
        String(order.customerCancelReason || "") ||
        String(order.sellerCancelReason || ""),
    }));
    const total = await Order.countDocuments(query);

    return NextResponse.json({ orders: mapped, total, page });
  } catch (err) {
    console.error("[orders GET]", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
