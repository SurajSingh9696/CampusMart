import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { User } from "@/models/User";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";
import { Order } from "@/models/Order";

export async function GET() {
  const guard = await requireRole(["admin"]);
  if ("error" in guard) return guard.error;

  await connectDB();

  const [customers, sellers, products, projects, notes, events, paidOrders] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "seller" }),
    Product.countDocuments(),
    Project.countDocuments(),
    Note.countDocuments(),
    Event.countDocuments(),
    Order.countDocuments({ status: "paid" }),
  ]);

  return NextResponse.json({
    customers,
    sellers,
    products,
    projects,
    notes,
    events,
    soldItems: paidOrders,
  });
}
