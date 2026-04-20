import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { z } from "zod";

const decisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const data = decisionSchema.parse(body);
    const newStatus = data.action === "approve" ? "live" : "rejected";

    const listing = await Listing.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        approvedBy: session.user.id,
        approvalComment: data.comment || (data.action === "approve" ? "Approved by admin" : "Rejected by admin"),
      },
      { new: true }
    );
    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ listing });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const flattened = error.flatten();
      const message =
        flattened.formErrors[0] ||
        Object.values(flattened.fieldErrors).flat()[0] ||
        "Invalid decision payload";
      return NextResponse.json({ error: message, details: flattened }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to update listing" }, { status: 500 });
  }
}
