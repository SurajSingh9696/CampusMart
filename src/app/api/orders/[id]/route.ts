import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Notification } from "@/models/Notification";
import { Types } from "mongoose";
import { z } from "zod";
import {
  canCancelByCustomer,
  canCancelBySeller,
  canCustomerConfirmFulfillment,
  canMarkPayoutCompleted,
  canSellerAccept,
  canSellerFulfill,
  ORDER_STATUS,
} from "@/lib/order-workflow";

const updateSchema = z.object({
  action: z
    .enum([
      "seller_accept",
      "seller_cancel",
      "seller_mark_fulfilled",
      "customer_cancel",
      "customer_confirm_fulfilled",
      "admin_mark_payout_completed",
    ])
    .optional(),
  status: z.string().optional(),
  reason: z.string().trim().max(280).optional(),
  payoutReference: z.string().trim().max(120).optional(),
});

function getActionFromLegacyStatus(status?: string, actorRole?: string) {
  switch (status) {
    case "confirmed":
      return "seller_accept";
    case "fulfilled":
      return actorRole === "customer" ? "customer_confirm_fulfilled" : "seller_mark_fulfilled";
    case "cancelled":
      return actorRole === "customer" ? "customer_cancel" : "seller_cancel";
    default:
      return undefined;
  }
}

function objectIdToString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === "object" && value !== null) {
    if ("_id" in value) {
      return objectIdToString((value as { _id: unknown })._id);
    }
    if ("toString" in value && typeof (value as { toString: unknown }).toString === "function") {
      const converted = (value as { toString: () => string }).toString();
      return converted === "[object Object]" ? "" : converted;
    }
  }
  return "";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const body = updateSchema.parse(await req.json());
    const action = body.action || getActionFromLegacyStatus(body.status, session.user.role);
    if (!action) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const order = await Order.findById(id)
      .populate("listingId", "title")
      .populate("buyerId", "name")
      .populate("sellerId", "name");
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const isAdmin = session.user.role === "admin";
    const isSeller = session.user.role === "seller";
    const isCustomer = session.user.role === "customer";

    const sellerId = objectIdToString(order.sellerId);
    const buyerId = objectIdToString(order.buyerId);
    const listing = order.listingId as unknown as { title?: string };
    const listingTitle = listing?.title || "item";

    if (isSeller && sellerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isCustomer && buyerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reason = (body.reason || "").trim();

    if (action === "seller_accept") {
      if (!(isSeller || isAdmin)) {
        return NextResponse.json({ error: "Only seller or admin can accept" }, { status: 403 });
      }
      if (order.paymentStatus !== "paid") {
        return NextResponse.json({ error: "Order payment is not completed" }, { status: 409 });
      }
      if (!canSellerAccept(order.status)) {
        return NextResponse.json({ error: "Order is not awaiting seller action" }, { status: 409 });
      }

      order.status = ORDER_STATUS.readyToFulfill;
      order.sellerAcceptedAt = new Date();
      await order.save();

      await Notification.create({
        userId: order.buyerId,
        title: "Order Accepted",
        message: `Your order for "${listingTitle}" has been accepted by the seller.`,
        category: "order",
      });

      return NextResponse.json({ ok: true, order });
    }

    if (action === "seller_mark_fulfilled") {
      if (!(isSeller || isAdmin)) {
        return NextResponse.json({ error: "Only seller or admin can fulfill" }, { status: 403 });
      }
      if (!canSellerFulfill(order.status)) {
        return NextResponse.json({ error: "Order is not ready to fulfill" }, { status: 409 });
      }

      order.status = ORDER_STATUS.fulfilledBySeller;
      order.sellerFulfilledAt = new Date();
      await order.save();

      await Notification.create({
        userId: order.buyerId,
        title: "Order Marked Fulfilled",
        message: `Seller marked your order for "${listingTitle}" as fulfilled. Please confirm after verification.`,
        category: "order",
      });

      return NextResponse.json({ ok: true, order });
    }

    if (action === "customer_confirm_fulfilled") {
      if (!(isCustomer || isAdmin)) {
        return NextResponse.json({ error: "Only customer or admin can confirm" }, { status: 403 });
      }
      if (!canCustomerConfirmFulfillment(order.status)) {
        return NextResponse.json({ error: "Order is not waiting for customer confirmation" }, { status: 409 });
      }

      order.status = ORDER_STATUS.readyForPayment;
      order.customerFulfilledAt = new Date();
      order.payoutReadyAt = new Date();
      await order.save();

      await Promise.all([
        Notification.create({
          userId: order.sellerId,
          title: "Order Confirmed by Customer",
          message: `Customer confirmed fulfillment for "${listingTitle}". Payout is now pending admin action.`,
          category: "order",
        }),
        Notification.create({
          userId: order.buyerId,
          title: "Order Confirmation Recorded",
          message: `Your confirmation for "${listingTitle}" was recorded successfully.`,
          category: "order",
        }),
      ]);

      return NextResponse.json({ ok: true, order });
    }

    if (action === "customer_cancel") {
      if (!(isCustomer || isAdmin)) {
        return NextResponse.json({ error: "Only customer or admin can cancel" }, { status: 403 });
      }
      if (reason.length < 6) {
        return NextResponse.json({ error: "Cancellation reason must be at least 6 characters" }, { status: 400 });
      }
      if (!canCancelByCustomer(order.status)) {
        return NextResponse.json({ error: "Order can no longer be cancelled by customer" }, { status: 409 });
      }

      order.status = ORDER_STATUS.cancelled;
      order.cancelledBy = isAdmin ? "admin" : "customer";
      order.cancelReason = reason;
      order.customerCancelReason = reason;
      await order.save();

      await Notification.create({
        userId: order.sellerId,
        title: "Order Cancelled by Customer",
        message: `Order for "${listingTitle}" was cancelled. Reason: ${reason}`,
        category: "order",
      });

      return NextResponse.json({ ok: true, order });
    }

    if (action === "seller_cancel") {
      if (!(isSeller || isAdmin)) {
        return NextResponse.json({ error: "Only seller or admin can cancel" }, { status: 403 });
      }
      if (reason.length < 6) {
        return NextResponse.json({ error: "Cancellation reason must be at least 6 characters" }, { status: 400 });
      }
      if (!canCancelBySeller(order.status)) {
        return NextResponse.json({ error: "Order can no longer be cancelled by seller" }, { status: 409 });
      }

      order.status = ORDER_STATUS.cancelled;
      order.cancelledBy = isAdmin ? "admin" : "seller";
      order.cancelReason = reason;
      order.sellerCancelReason = reason;
      await order.save();

      await Notification.create({
        userId: order.buyerId,
        title: "Order Cancelled by Seller",
        message: `Your order for "${listingTitle}" was cancelled by the seller. Reason: ${reason}`,
        category: "order",
      });

      return NextResponse.json({ ok: true, order });
    }

    if (action === "admin_mark_payout_completed") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Only admin can complete payout" }, { status: 403 });
      }
      if (!canMarkPayoutCompleted(order.status)) {
        return NextResponse.json({ error: "Order is not ready for payout" }, { status: 409 });
      }

      order.status = ORDER_STATUS.payoutCompleted;
      order.payoutCompletedAt = new Date();
      if (body.payoutReference) {
        order.payoutReference = body.payoutReference;
      }
      await order.save();

      await Promise.all([
        Notification.create({
          userId: order.sellerId,
          title: "Seller Payout Completed",
          message: `Payout for "${listingTitle}" has been marked completed by admin.`,
          category: "order",
        }),
        Notification.create({
          userId: order.buyerId,
          title: "Order Settled",
          message: `Your order for "${listingTitle}" is fully settled.`,
          category: "order",
        }),
      ]);

      return NextResponse.json({ ok: true, order });
    }

    return NextResponse.json({ error: "Action not supported" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const flattened = err.flatten();
      const message =
        flattened.formErrors[0] ||
        Object.values(flattened.fieldErrors).flat()[0] ||
        "Invalid request";
      return NextResponse.json({ error: message, details: flattened }, { status: 400 });
    }
    console.error("[orders PATCH]", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  await connectDB();
  const order = await Order.findById(id)
    .populate("listingId", "title type mediaUrls campus")
    .populate("buyerId", "name email")
    .populate("sellerId", "name email")
    .lean();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  const isOwner = objectIdToString(order.buyerId) === session.user.id;
  const isSeller = objectIdToString(order.sellerId) === session.user.id;

  if (role !== "admin" && !isOwner && !isSeller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ order });
}
