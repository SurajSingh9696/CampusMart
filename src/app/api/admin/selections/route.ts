import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { Selection } from "@/models/Selection";
import { DEFAULT_BRANCHES, DEFAULT_COLLEGES, DEFAULT_COURSES, DEFAULT_YEARS } from "@/lib/constants";

const schema = z.object({
  key: z.enum(["campus", "branch", "course", "year", "category"]),
  values: z.array(z.string().min(1)).min(1),
});

export async function GET() {
  await connectDB();

  const docs = await Selection.find().lean();
  const map = new Map(docs.map((d) => [d.key, d.values]));

  return NextResponse.json({
    campus: map.get("campus") || DEFAULT_COLLEGES,
    branch: map.get("branch") || DEFAULT_BRANCHES,
    course: map.get("course") || DEFAULT_COURSES,
    year: map.get("year") || DEFAULT_YEARS,
    category: map.get("category") || ["product", "project", "notes", "event"],
  });
}

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    await connectDB();
    await Selection.findOneAndUpdate({ key: data.key }, { values: data.values }, { upsert: true, new: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to update selection list" }, { status: 500 });
  }
}
