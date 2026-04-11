import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id)
    .select("name email phone campus accountNumber idCardNumber notificationEmailOptIn")
    .lean();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    profile: {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      campus: user.campus,
      accountNumber: user.accountNumber,
      idCardNumber: user.idCardNumber || "",
      notificationEmailOptIn: Boolean(user.notificationEmailOptIn),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { name, phone, idCardNumber, notificationEmailOptIn, campus } = await req.json();

  const update: Record<string, string | boolean> = {};
  if (name) update.name = name.trim();
  if (campus) update.campus = campus.trim();
  if (phone !== undefined) update.phone = typeof phone === "string" ? phone.trim() : "";
  if (idCardNumber !== undefined) {
    update.idCardNumber = typeof idCardNumber === "string" ? idCardNumber.trim() : "";
  }
  if (notificationEmailOptIn !== undefined) {
    update.notificationEmailOptIn = Boolean(notificationEmailOptIn);
  }

  const user = await User.findByIdAndUpdate(session.user.id, update, { new: true });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    profile: {
      name: user.name,
      campus: user.campus,
      phone: user.phone || "",
      idCardNumber: user.idCardNumber || "",
      notificationEmailOptIn: Boolean(user.notificationEmailOptIn),
    },
  });
}
