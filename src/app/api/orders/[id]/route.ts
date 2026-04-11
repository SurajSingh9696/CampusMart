import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Notification } from "@/models/Notification";
import { Types } from "mongoose";

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
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["pending", "confirmed", "fulfilled", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const order = await Order.findById(id).populate("listingId", "title").lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Seller can only update their own orders
    if (session.user.role === "seller" && order.sellerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admin can update any order
    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await Order.findByIdAndUpdate(id, { status }, { new: true }).lean();

    // Notify buyer of status change
    const listing = order.listingId as unknown as { title: string };
    await Notification.create({
      userId: order.buyerId,
      title: `Order ${status}`,
      message: `Your order for "${listing?.title || "item"}" has been marked as ${status}.`,
      category: "order",
    });

    return NextResponse.json({ order: updated, ok: true });
  } catch (err) {
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

  return NextResponse.json({ order });
}
