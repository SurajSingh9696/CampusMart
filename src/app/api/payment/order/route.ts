import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { requireRole } from "@/lib/auth-guards";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";
import { Order } from "@/models/Order";
import { getRazorpayClient } from "@/lib/payment";

const schema = z.object({
  itemType: z.enum(["product", "project", "notes", "event"]),
  itemId: z.string().min(10),
});

export async function POST(request: Request) {
  const guard = await requireRole(["customer"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (!Types.ObjectId.isValid(data.itemId)) {
      return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
    }

    await connectDB();

    let normalized:
      | {
          _id: string;
          sellerId: string;
          amount: number;
          oneBuyerOnly?: boolean;
          soldToCustomerId?: unknown;
        }
      | null = null;

    if (data.itemType === "product") {
      const product = await Product.findById(data.itemId).lean();
      if (!product || product.status !== "live") {
        return NextResponse.json({ error: "Item not available" }, { status: 404 });
      }
      normalized = { _id: product._id.toString(), sellerId: product.sellerId.toString(), amount: product.price };
    } else if (data.itemType === "project") {
      const project = await Project.findById(data.itemId).lean();
      if (!project || project.status !== "live") {
        return NextResponse.json({ error: "Item not available" }, { status: 404 });
      }
      normalized = {
        _id: project._id.toString(),
        sellerId: project.sellerId.toString(),
        amount: project.isFree ? 0 : project.price,
        oneBuyerOnly: project.oneBuyerOnly,
        soldToCustomerId: project.soldToCustomerId,
      };
    } else if (data.itemType === "notes") {
      const note = await Note.findById(data.itemId).lean();
      if (!note || note.status !== "live") {
        return NextResponse.json({ error: "Item not available" }, { status: 404 });
      }
      normalized = { _id: note._id.toString(), sellerId: note.sellerId.toString(), amount: note.isFree ? 0 : note.price };
    } else {
      const event = await Event.findById(data.itemId).lean();
      if (!event || event.status !== "live") {
        return NextResponse.json({ error: "Item not available" }, { status: 404 });
      }
      normalized = { _id: event._id.toString(), sellerId: event.sellerId.toString(), amount: event.isFree ? 0 : event.ticketPrice };
    }

    if (normalized.oneBuyerOnly && normalized.soldToCustomerId) {
      return NextResponse.json({ error: "Project already sold" }, { status: 409 });
    }

    const amount = normalized.amount;
    const razorpay = getRazorpayClient();

    if (razorpay && amount > 0) {
      const rzOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `cmp_${Date.now()}`,
      });

      const order = await Order.create({
        buyerId: guard.session.user.id,
        sellerId: normalized.sellerId,
        listingId: normalized._id,
        amount,
        paymentProvider: "razorpay",
        paymentReference: rzOrder.id,
        status: "created",
        purchaseCampus: guard.session.user.campus,
      });

      return NextResponse.json({
        provider: "razorpay",
        orderId: order._id,
        razorpayOrderId: rzOrder.id,
        amount,
      });
    }

    const order = await Order.create({
      buyerId: guard.session.user.id,
      sellerId: normalized.sellerId,
      listingId: normalized._id,
      amount,
      paymentProvider: "fallback",
      paymentReference: `fallback_${Date.now()}`,
      status: "paid",
      purchaseCampus: guard.session.user.campus,
    });

    return NextResponse.json({
      provider: "fallback",
      orderId: order._id,
      amount,
      message: "Fallback test payment succeeded because Razorpay keys are not configured.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create payment order" }, { status: 500 });
  }
}
