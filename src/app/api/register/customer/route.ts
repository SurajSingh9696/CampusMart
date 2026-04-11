import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/password";
import { generateAccountNumber } from "@/lib/account";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  campus: z.string().min(2),
  idCardNumber: z.string().min(4).max(64),
  profileImageId: z.string().optional(),
});

async function createCustomerWithRetries(input: {
  name: string;
  email: string;
  passwordHash: string;
  campus: string;
  idCardNumber: string;
  profileImageId?: string;
}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await User.create({
        ...input,
        role: "customer",
        accountNumber: generateAccountNumber("customer"),
        sellerApprovalStatus: "approved",
      });
    } catch (error) {
      const maybeMongo = error as { code?: number; keyPattern?: Record<string, number> };
      const isDuplicate = maybeMongo?.code === 11000;
      const isAccountNumberDup = Boolean(maybeMongo?.keyPattern?.accountNumber);

      if (isDuplicate && isAccountNumberDup) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not allocate unique account number");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const normalizedEmail = data.email.trim().toLowerCase();

    await connectDB();

    const exists = await User.findOne({ email: normalizedEmail }).lean();
    if (exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);

    const user = await createCustomerWithRetries({
      name: data.name,
      email: normalizedEmail,
      passwordHash,
      campus: data.campus,
      idCardNumber: data.idCardNumber,
      profileImageId: data.profileImageId || undefined,
    });

    return NextResponse.json({
      ok: true,
      userId: user._id,
      accountNumber: user.accountNumber,
      message: "Customer account created",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    const maybeMongo = error as { code?: number; keyPattern?: Record<string, number>; message?: string };
    if (maybeMongo?.code === 11000 && maybeMongo?.keyPattern?.email) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    if (maybeMongo?.message?.includes("MONGODB_URI") || maybeMongo?.message?.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "Database connection failed. Ensure MongoDB is running and MONGODB_URI is correct." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Unable to register customer" }, { status: 500 });
  }
}
