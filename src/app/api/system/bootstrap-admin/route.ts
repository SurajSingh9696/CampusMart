import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/password";
import { generateAccountNumber } from "@/lib/account";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  campus: z.string().min(2),
  token: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    if (!bootstrapToken || data.token !== bootstrapToken) {
      return NextResponse.json({ error: "Invalid bootstrap token" }, { status: 403 });
    }

    await connectDB();

    const hasAdmin = await User.countDocuments({ role: "admin" });
    if (hasAdmin > 0) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);

    const admin = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: "admin",
      campus: data.campus,
      accountNumber: generateAccountNumber("admin"),
      sellerApprovalStatus: "approved",
    });

    return NextResponse.json({ ok: true, adminId: admin._id, accountNumber: admin.accountNumber });
  } catch {
    return NextResponse.json({ error: "Unable to bootstrap admin" }, { status: 500 });
  }
}
