import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { College } from "@/models/College";
import bcrypt from "bcryptjs";

function generateAccountNumber(): string {
  const prefix = "CM";
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${now}${rand}`.slice(0, 12);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      name,
      email,
      password,
      role,
      phone,
      collegeId,
      studentId,
      idCardNumber,
      year,
      branch,
      course,
      shopName,
      shopDescription,
    } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }
    if (!["customer", "seller"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!collegeId) {
      return NextResponse.json({ error: "College selection is required" }, { status: 400 });
    }

    const normalizedStudentId = (studentId || idCardNumber || "").trim();
    if (role === "customer" && !normalizedStudentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    if (role === "seller" && !normalizedStudentId) {
      return NextResponse.json({ error: "College ID / roll number is required" }, { status: 400 });
    }

    // Verify email uniqueness
    const existing = await User.findOne({ email: email.trim().toLowerCase() }).lean();
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Verify college exists
    const college = await College.findById(collegeId).lean();
    if (!college) {
      return NextResponse.json({ error: "Invalid college" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique account number
    let accountNumber: string;
    let attempts = 0;
    do {
      accountNumber = generateAccountNumber();
      attempts++;
      const exists = await User.findOne({ accountNumber }).lean();
      if (!exists) break;
    } while (attempts < 10);

    // Build user document
    const userData: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      accountNumber,
      campus: (college as { name: string }).name,
      idCardNumber: normalizedStudentId,
      sellerApprovalStatus: role === "seller" ? "pending" : "approved",
    };

    if (phone) userData.phone = phone.trim();
    if (role === "seller") {
      userData.shop = {
        shopName: shopName?.trim() || "",
        shopDescription: shopDescription?.trim() || "",
      };
    }

    const user = await User.create(userData);

    return NextResponse.json(
      {
        message: role === "seller"
          ? "Seller application submitted. Await admin approval within 24 hours."
          : "Account created successfully",
        userId: user._id.toString(),
        accountNumber: user.accountNumber,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register POST]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
