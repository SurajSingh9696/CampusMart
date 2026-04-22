import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

function toSafeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 30;

  const query: Record<string, unknown> = {};
  if (role && role !== "all") query.role = role;
  if (status === "blocked") query.isBlocked = true;
  if (status === "active") query.isBlocked = false;
  if (search) {
    const escaped = toSafeRegex(search);
    query.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { accountNumber: { $regex: escaped, $options: "i" } },
      { campus: { $regex: escaped, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .select("name email role accountNumber campus phone idCardNumber isBlocked blockedReason sellerApprovalStatus sellerApprovalComment createdAt")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const normalized = users.map((user) => ({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    accountNumber: user.accountNumber,
    campus: user.campus,
    phone: user.phone || "",
    idCardNumber: user.idCardNumber || "",
    status: user.isBlocked ? "blocked" : "active",
    isBlocked: Boolean(user.isBlocked),
    blockedReason: user.blockedReason || "",
    sellerApprovalStatus: user.sellerApprovalStatus || undefined,
    sellerApprovalComment: user.sellerApprovalComment || "",
    createdAt: user.createdAt,
  }));

  return NextResponse.json({ users: normalized });
}
