import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function POST() {
  // Trigger this endpoint from a cron job every few hours.
  await connectDB();
  const now = new Date();

  const result = await User.deleteMany({
    role: "seller",
    sellerApprovalStatus: "rejected",
    sellerRejectedDeleteAt: { $lte: now },
  });

  return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
}
