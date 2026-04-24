import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { requireRole } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Order } from "@/models/Order";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { getRazorpayClient } from "@/lib/payment";
import { env } from "@/lib/env";
import { deriveOrderAmounts } from "@/lib/pricing";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-workflow";

const schema = z.object({
  listingId: z.string().min(10).optional(),
  itemType: z.enum(["product", "project", "notes", "event"]).optional(),
  itemId: z.string().min(10).optional(),
  quantity: z.number().int().min(1).max(20).optional().default(1),
}).refine((value) => Boolean(value.listingId || value.itemId), {
  message: "listingId or itemId is required",
  path: ["listingId"],
});

export async function POST(request: Request) {
  const guard = await requireRole(["customer"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    await connectDB();

    const listingId = (data.listingId || data.itemId || "").trim();
    if (!Types.ObjectId.isValid(listingId)) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    const listing = await Listing.findById(listingId)
      .select("_id sellerId title status price isFree type campus priceMarkupPercent soldToCustomerId projectConfig")
      .lean();
    if (!listing || listing.status !== "live") {
      return NextResponse.json({ error: "Item not available" }, { status: 404 });
    }

    if (listing.sellerId.toString() === guard.session.user.id) {
      return NextResponse.json({ error: "You cannot buy your own listing" }, { status: 400 });
    }

    const isProjectOneBuyerOnly = Boolean(listing.type === "project" && listing.projectConfig?.oneBuyerOnly);
    if (isProjectOneBuyerOnly && listing.soldToCustomerId) {
      return NextResponse.json({ error: "Project already sold" }, { status: 409 });
    }

    const [buyer, seller] = await Promise.all([
      User.findById(guard.session.user.id)
        .select("accountNumber idCardNumber idCardImageId campus")
        .lean(),
      User.findById(listing.sellerId)
        .select("shop.payoutUpi")
        .lean(),
    ]);

    if (!buyer) {
      return NextResponse.json({ error: "Buyer account not found" }, { status: 404 });
    }

    const amounts = deriveOrderAmounts({
      sellerUnitPrice: listing.price,
      quantity: data.quantity,
      isFree: listing.isFree,
      markupPercent: listing.priceMarkupPercent,
    });

    const razorpay = getRazorpayClient();

    if (razorpay && amounts.buyerAmount > 0) {
      const rzOrder = await razorpay.orders.create({
        amount: Math.round(amounts.buyerAmount * 100),
        currency: "INR",
        receipt: `cmp_${Date.now()}`,
        notes: {
          listingId: listing._id.toString(),
          buyerId: guard.session.user.id,
          quantity: String(amounts.quantity),
        },
      });

      const order = await Order.create({
        buyerId: guard.session.user.id,
        sellerId: listing.sellerId,
        listingId: listing._id,
        amount: amounts.buyerAmount,
        sellerAmount: amounts.sellerAmount,
        platformFeeAmount: amounts.platformFeeAmount,
        priceMarkupPercent: amounts.markupPercent,
        currency: "INR",
        paymentProvider: "razorpay",
        paymentReference: rzOrder.id,
        paymentStatus: PAYMENT_STATUS.created,
        status: ORDER_STATUS.created,
        purchaseCampus: buyer.campus || guard.session.user.campus,
        sellerPayoutUpi: seller?.shop?.payoutUpi || "",
        buyerAccountNumberSnapshot: buyer.accountNumber || "",
        buyerIdCardNumberSnapshot: buyer.idCardNumber || "",
        buyerIdCardImageIdSnapshot: buyer.idCardImageId,
        quantity: amounts.quantity,
      });

      return NextResponse.json({
        provider: "razorpay",
        orderId: order._id,
        razorpayOrderId: rzOrder.id,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
        amount: amounts.buyerAmount,
        sellerAmount: amounts.sellerAmount,
        platformFeeAmount: amounts.platformFeeAmount,
      });
    }

    const fallbackOrder = await Order.create({
      buyerId: guard.session.user.id,
      sellerId: listing.sellerId,
      listingId: listing._id,
      amount: amounts.buyerAmount,
      sellerAmount: amounts.sellerAmount,
      platformFeeAmount: amounts.platformFeeAmount,
      priceMarkupPercent: amounts.markupPercent,
      currency: "INR",
      paymentProvider: "fallback",
      paymentReference: `fallback_${Date.now()}`,
      paymentStatus: PAYMENT_STATUS.paid,
      paymentCaptureReference: `fallback_capture_${Date.now()}`,
      paidAt: new Date(),
      status: ORDER_STATUS.pendingSellerAction,
      purchaseCampus: buyer.campus || guard.session.user.campus,
      sellerPayoutUpi: seller?.shop?.payoutUpi || "",
      buyerAccountNumberSnapshot: buyer.accountNumber || "",
      buyerIdCardNumberSnapshot: buyer.idCardNumber || "",
      buyerIdCardImageIdSnapshot: buyer.idCardImageId,
      quantity: amounts.quantity,
    });

    await Notification.create({
      userId: listing.sellerId,
      title: "New Paid Order",
      message: `${guard.session.user.name} placed and paid for "${listing.title}". Please review and accept/cancel the order.`,
      category: "order",
    });

    return NextResponse.json({
      provider: "fallback",
      orderId: fallbackOrder._id,
      amount: amounts.buyerAmount,
      sellerAmount: amounts.sellerAmount,
      platformFeeAmount: amounts.platformFeeAmount,
      message: "Payment captured in fallback mode. Seller has been notified.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const flattened = error.flatten();
      const message =
        flattened.formErrors[0] ||
        Object.values(flattened.fieldErrors).flat()[0] ||
        "Invalid payment payload";
      return NextResponse.json({ error: message, details: flattened }, { status: 400 });
    }
    console.error("[payment order POST]", error);
    return NextResponse.json({ error: "Unable to create payment order" }, { status: 500 });
  }
}
