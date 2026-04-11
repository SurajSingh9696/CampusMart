import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);

    const type = url.searchParams.get("type") || undefined;
    const statusParam = url.searchParams.get("status") || "live";
    const campus = url.searchParams.get("campus") || undefined;
    const globalView = url.searchParams.get("global") === "true";
    const sellerId = url.searchParams.get("sellerId") || undefined;
    const mine = url.searchParams.get("mine") === "true";
    const q = url.searchParams.get("q") || undefined;
    const sort = url.searchParams.get("sort") || "newest";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Build query
    const query: Record<string, unknown> = {};
    if (type) query.type = type;
    // Support comma-separated status values (e.g. "live,pending_approval")
    if (statusParam === "all") {
      // no status filter
    } else if (statusParam.includes(",")) {
      query.status = { $in: statusParam.split(",") };
    } else {
      query.status = statusParam;
    }
    // mine=true → show only the logged-in seller's listings (all statuses)
    if (mine && session?.user?.role === "seller") {
      query.sellerId = session.user.id;
      delete query.status; // seller sees all their own listing statuses
    } else if (sellerId) {
      query.sellerId = sellerId;
    }
    if (!mine) {
      if (campus && !globalView) query.campus = campus;
      else if (!globalView && session?.user?.campus) query.campus = session.user.campus;
    }
    if (q) query.$text = { $search: q };

    // Sort
    const sortOption: any =
      sort === "price_asc" ? { price: 1 } :
      sort === "price_desc" ? { price: -1 } :
      { createdAt: -1 };

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Listing.countDocuments(query),
    ]);

    return NextResponse.json({
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[listings GET]", err);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "seller") {
      return NextResponse.json({ error: "Seller account required" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();
    const {
      type, title, description, tags, mediaUrls, previewUrls,
      resourceUrl, price, isFree, isAuction, auctionStartPrice,
      auctionEndAt, quantity, eventConfig, projectConfig, notesConfig,
    } = body;

    if (!type || !title || !description) {
      return NextResponse.json({ error: "type, title and description are required" }, { status: 400 });
    }

    const listing = await Listing.create({
      sellerId: session.user.id,
      campus: session.user.campus,
      type, title, description, tags, mediaUrls, previewUrls,
      resourceUrl, price: isFree ? 0 : price,
      isFree: !!isFree, isAuction: !!isAuction,
      auctionStartPrice, auctionEndAt,
      quantity: quantity || 1,
      status: "pending_approval",
      eventConfig, projectConfig, notesConfig,
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    console.error("[listings POST]", err);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
