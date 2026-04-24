import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-workflow";
import { Listing } from "@/models/Listing";
import { Notification } from "@/models/Notification";
import { Order } from "@/models/Order";

const verifySchema = z.object({
  orderId: z.string().min(10),
  razorpayOrderId: z.string().min(5),
  razorpayPaymentId: z.string().min(5),
  razorpaySignature: z.string().min(20),
});

function verifyRazorpaySignature(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay secret is not configured");
  }

  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
    .digest("hex");

  return expected === payload.razorpaySignature;
}

export async function POST(request: Request) {
  const guard = await requireRole(["customer"]);
  if ("error" in guard) return guard.error;

  try {
    const payload = verifySchema.parse(await request.json());

    if (!Types.ObjectId.isValid(payload.orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    await connectDB();

    const order = await Order.findById(payload.orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.buyerId.toString() !== guard.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.paymentProvider !== "razorpay") {
      return NextResponse.json({ error: "This order is not a Razorpay order" }, { status: 400 });
    }

    if (order.paymentReference !== payload.razorpayOrderId) {
      return NextResponse.json({ error: "Razorpay order reference mismatch" }, { status: 400 });
    }

    const isValidSignature = verifyRazorpaySignature(payload);
    if (!isValidSignature) {
      if (order.paymentStatus !== PAYMENT_STATUS.failed) {
        order.paymentStatus = PAYMENT_STATUS.failed;
        await order.save();
      }
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    if (order.paymentStatus === PAYMENT_STATUS.paid) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        order: {
          id: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
      });
    }

    order.paymentStatus = PAYMENT_STATUS.paid;
    order.paymentCaptureReference = payload.razorpayPaymentId;
    order.paidAt = new Date();
    order.status = ORDER_STATUS.pendingSellerAction;
    await order.save();

    const listing = await Listing.findById(order.listingId)
      .select("title type projectConfig soldToCustomerId")
      .lean();

    if (
      listing &&
      listing.type === "project" &&
      listing.projectConfig?.oneBuyerOnly &&
      !listing.soldToCustomerId
    ) {
      await Listing.updateOne(
        { _id: listing._id, soldToCustomerId: { $exists: false } },
        { $set: { soldToCustomerId: order.buyerId } }
      );
    }

    const listingTitle = listing?.title || "your listing";

    await Promise.all([
      Notification.create({
        userId: order.sellerId,
        title: "New Paid Order",
        message: `${guard.session.user.name} paid for \"${listingTitle}\". Please accept or cancel the order.`,
        category: "order",
      }),
      Notification.create({
        userId: order.buyerId,
        title: "Payment Confirmed",
        message: `Your payment for \"${listingTitle}\" is confirmed. Waiting for seller response.`,
        category: "order",
      }),
    ]);

    return NextResponse.json({
      success: true,
      order: {
        id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const flattened = error.flatten();
      const message =
        flattened.formErrors[0] ||
        Object.values(flattened.fieldErrors).flat()[0] ||
        "Invalid payment verification payload";
      return NextResponse.json({ error: message, details: flattened }, { status: 400 });
    }

    console.error("[payment verify POST]", error);
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 500 });
  }
}
