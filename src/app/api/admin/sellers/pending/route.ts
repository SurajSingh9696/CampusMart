import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireRole } from "@/lib/auth-guards";

export async function GET() {
  const guard = await requireRole(["admin"]);
  if ("error" in guard) return guard.error;

  await connectDB();

  const sellers = await User.find({ role: "seller", sellerApprovalStatus: "pending" })
    .select("name email campus idCardNumber idCardImageId accountNumber shop sellerApprovalDeadline createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ sellers });
}
