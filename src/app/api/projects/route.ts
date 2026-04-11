import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/market/Project";
import { requireRole } from "@/lib/auth-guards";

const createSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(20).max(4000),
  techStack: z.array(z.string()).default([]),
  targetYear: z.string().min(1),
  branch: z.string().min(1),
  semester: z.string().min(1),
  imageIds: z.array(z.string()).default([]),
  zipMediaId: z.string().optional(),
  deployedPreviewUrl: z.string().url().optional().or(z.literal("")),
  isFree: z.boolean().default(false),
  price: z.number().min(0).default(0),
  oneBuyerOnly: z.boolean().default(true),
  isAuction: z.boolean().default(false),
  auctionStartPrice: z.number().min(0).default(0),
  auctionEndAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campus = searchParams.get("campus");

  await connectDB();
  const query: Record<string, unknown> = { status: "live" };
  if (campus && campus !== "Global") query.campus = campus;

  const items = await Project.find(query).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const guard = await requireRole(["seller"]);
  if ("error" in guard) return guard.error;
  if (guard.session.user.sellerApprovalStatus !== "approved") {
    return NextResponse.json({ error: "Seller account is pending approval" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    await connectDB();

    const item = await Project.create({
      ...data,
      sellerId: guard.session.user.id,
      campus: guard.session.user.campus,
      status: "pending_approval",
      auctionEndAt: data.auctionEndAt ? new Date(data.auctionEndAt) : undefined,
      deployedPreviewUrl: data.deployedPreviewUrl || "",
    });

    return NextResponse.json({ ok: true, id: item._id.toString() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create project" }, { status: 500 });
  }
}
