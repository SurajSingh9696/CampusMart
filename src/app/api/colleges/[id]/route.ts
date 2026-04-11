import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { College } from "@/models/College";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const update: any = {};

    if (body.name !== undefined) update.name = body.name.trim();
    if (body.shortCode !== undefined) update.shortCode = body.shortCode.trim().toUpperCase();
    if (body.location !== undefined) update.location = body.location.trim();
    if (body.isActive !== undefined) update.isActive = body.isActive;

    const college = await College.findByIdAndUpdate(id, update, { new: true });
    if (!college) {
      return NextResponse.json({ error: "College not found" }, { status: 404 });
    }

    return NextResponse.json({ college });
  } catch (err) {
    console.error("[colleges PATCH]", err);
    return NextResponse.json({ error: "Failed to update college" }, { status: 500 });
  }
}
