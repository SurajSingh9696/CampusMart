import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    await connectDB();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 20;

    const query: Record<string, unknown> = { role: "seller" };
    if (status !== "all") query.sellerApprovalStatus = status;

    const [sellers, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({ sellers, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[admin sellers GET]", err);
    return NextResponse.json({ error: "Failed to fetch sellers" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    await connectDB();
    const { sellerId, action } = await req.json();

    if (!sellerId || !["approve", "reject", "block", "unblock"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (action === "approve") update.sellerApprovalStatus = "approved";
    else if (action === "reject") update.sellerApprovalStatus = "rejected";
    else if (action === "block") update.isBlocked = true;
    else if (action === "unblock") update.isBlocked = false;

    const user = await User.findByIdAndUpdate(sellerId, { $set: update }, { new: true }).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[admin sellers PATCH]", err);
    return NextResponse.json({ error: "Failed to update seller" }, { status: 500 });
  }
}
