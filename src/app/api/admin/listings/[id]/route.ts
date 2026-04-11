import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const { action } = await req.json();
  const newStatus = action === "approve" ? "active" : "rejected";

  const listing = await Listing.findByIdAndUpdate(
    id,
    { status: newStatus },
    { new: true }
  );
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ listing });
}
