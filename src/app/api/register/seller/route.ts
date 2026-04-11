import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/password";
import { generateAccountNumber } from "@/lib/account";
import { Notification } from "@/models/Notification";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  campus: z.string().min(2),
  idCardNumber: z.string().min(4).max(64),
  idCardImageId: z.string().min(10),
  shopName: z.string().min(2).max(120),
  shopDescription: z.string().min(20).max(500),
  shopLogoImageId: z.string().optional(),
  shopBannerImageId: z.string().optional(),
  payoutUpi: z.string().min(6).max(120),
  payoutBankAccount: z.string().min(6).max(40),
  payoutIfsc: z.string().min(6).max(20),
});

async function createSellerWithRetries(input: {
  name: string;
  email: string;
  passwordHash: string;
  campus: string;
  idCardNumber: string;
  idCardImageId: string;
  sellerApprovalDeadline: Date;
  shop: {
    shopName: string;
    shopDescription: string;
    shopLogoImageId?: string;
    shopBannerImageId?: string;
    payoutUpi: string;
    payoutBankAccount: string;
    payoutIfsc: string;
  };
}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await User.create({
        ...input,
        role: "seller",
        accountNumber: generateAccountNumber("seller"),
        sellerApprovalStatus: "pending",
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
    const sellerApprovalDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await createSellerWithRetries({
      name: data.name,
      email: normalizedEmail,
      passwordHash,
      campus: data.campus,
      idCardNumber: data.idCardNumber,
      idCardImageId: data.idCardImageId,
      sellerApprovalDeadline,
      shop: {
        shopName: data.shopName,
        shopDescription: data.shopDescription,
        shopLogoImageId: data.shopLogoImageId || undefined,
        shopBannerImageId: data.shopBannerImageId || undefined,
        payoutUpi: data.payoutUpi,
        payoutBankAccount: data.payoutBankAccount,
        payoutIfsc: data.payoutIfsc,
      },
    });

    await Notification.create({
      userId: user._id,
      title: "Seller registration submitted",
      message: "Your account is pending admin approval and can take up to 24 hours.",
      category: "seller_approval",
    });

    return NextResponse.json({
      ok: true,
      userId: user._id,
      accountNumber: user.accountNumber,
      message: "Seller registration submitted. Await admin approval within 24 hours.",
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

    return NextResponse.json({ error: "Unable to register seller" }, { status: 500 });
  }
}
