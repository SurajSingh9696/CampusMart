import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { College } from "@/models/College";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const active = url.searchParams.get("active") === "true";
    
    const query = active ? { isActive: true } : {};
    const colleges = await College.find(query).select("name shortCode logo location isActive").sort({ name: 1 }).lean();
    
    return NextResponse.json({ colleges });
  } catch (err) {
    console.error("[colleges GET]", err);
    return NextResponse.json({ error: "Failed to fetch colleges" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, shortCode, location, logo } = body;

    if (!name || !shortCode) {
      return NextResponse.json({ error: "name and shortCode required" }, { status: 400 });
    }

    const college = await College.create({ name, shortCode, location, logo });
    return NextResponse.json({ college }, { status: 201 });
  } catch (err) {
    console.error("[colleges POST]", err);
    return NextResponse.json({ error: "Failed to create college" }, { status: 500 });
  }
}
