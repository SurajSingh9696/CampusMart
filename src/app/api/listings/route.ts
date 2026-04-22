import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Order } from "@/models/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Types } from "mongoose";
import { deriveListingBuyerPrice } from "@/lib/pricing";

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
  title_asc: { title: 1, createdAt: -1 },
  title_desc: { title: -1, createdAt: -1 },
  event_soonest: { "eventConfig.eventStartAt": 1, "eventConfig.eventDate": 1, createdAt: -1 },
  event_latest: { "eventConfig.eventStartAt": -1, "eventConfig.eventDate": -1, createdAt: -1 },
};

const ORDERED_STATUSES = [
  "ready_for_payment",
  "payout_completed",
  "fulfilled_by_seller",
  "fulfilled",
  "confirmed",
  "paid",
];

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getOrderStatsMap(listingIds: string[]) {
  const objectIds = listingIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (objectIds.length === 0) return new Map<string, { orderedCount: number; revenueTotal: number }>();

  const rows = await Order.aggregate<{ _id: Types.ObjectId; orderedCount: number; revenueTotal: number }>([
    {
      $match: {
        listingId: { $in: objectIds },
        status: { $in: ORDERED_STATUSES },
      },
    },
    {
      $group: {
        _id: "$listingId",
        orderedCount: { $sum: { $ifNull: ["$quantity", 1] } },
        revenueTotal: { $sum: { $ifNull: ["$sellerAmount", "$amount"] } },
      },
    },
  ]);

  return new Map(rows.map((row) => [row._id.toString(), { orderedCount: row.orderedCount || 0, revenueTotal: row.revenueTotal || 0 }]));
}

function withViewerPricing<T extends { price?: number; isFree?: boolean; priceMarkupPercent?: number }>(
  listing: T,
  showBuyerPricing: boolean
) {
  const pricing = deriveListingBuyerPrice({
    sellerPrice: Number(listing.price || 0),
    isFree: Boolean(listing.isFree),
    markupPercent: listing.priceMarkupPercent,
  });

  return {
    ...listing,
    sellerPrice: pricing.sellerPrice,
    buyerPrice: pricing.buyerPrice,
    platformFeeAmount: pricing.platformFeeAmount,
    platformMarkupPercent: pricing.markupPercent,
    price: showBuyerPricing ? pricing.buyerPrice : pricing.sellerPrice,
  };
}

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
    const subject = url.searchParams.get("subject") || undefined;
    const q = url.searchParams.get("q") || undefined;
    const sort = url.searchParams.get("sort") || "newest";
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 100);

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
    if (subject) {
      query["notesConfig.subject"] = { $regex: escapeRegex(subject), $options: "i" };
    }

    const shouldApplyBuyerPricing =
      !mine && session?.user?.role !== "admin" && session?.user?.role !== "seller";

    // Popular sort needs computed order counts before pagination.
    if (sort === "popular") {
      const allListings = await Listing.find(query).lean();
      const statsMap = await getOrderStatsMap(allListings.map((listing) => listing._id.toString()));
      const sorted = allListings
        .map((listing) => {
          const stats = statsMap.get(listing._id.toString());
          return {
            ...listing,
            orderedCount: stats?.orderedCount || 0,
            revenueTotal: stats?.revenueTotal || 0,
          };
        })
        .sort((a, b) => {
          if (b.orderedCount !== a.orderedCount) return b.orderedCount - a.orderedCount;
          if (b.revenueTotal !== a.revenueTotal) return b.revenueTotal - a.revenueTotal;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      const total = sorted.length;
      const paginated = sorted
        .slice((page - 1) * limit, page * limit)
        .map((listing) => withViewerPricing(listing, shouldApplyBuyerPricing));

      return NextResponse.json({
        listings: paginated,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    const sortOption = SORT_MAP[sort] || SORT_MAP.newest;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Listing.countDocuments(query),
    ]);

    const statsMap = await getOrderStatsMap(listings.map((listing) => listing._id.toString()));
    const listingsWithStats = listings.map((listing) => {
      const stats = statsMap.get(listing._id.toString());
      const listingWithStats = {
        ...listing,
        orderedCount: stats?.orderedCount || 0,
        revenueTotal: stats?.revenueTotal || 0,
      };
      return withViewerPricing(listingWithStats, shouldApplyBuyerPricing);
    });

    return NextResponse.json({
      listings: listingsWithStats,
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
    if (session.user.sellerApprovalStatus !== "approved") {
      return NextResponse.json({ error: "You are still not verified by the admin" }, { status: 403 });
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

    let normalizedEventConfig = eventConfig;
    if (type === "event" && eventConfig) {
      const eventStartAt = asDate(eventConfig.eventStartAt || eventConfig.eventDate);
      const eventEndAt = asDate(eventConfig.eventEndAt);
      if (!eventStartAt) {
        return NextResponse.json({ error: "Event start date and time are required" }, { status: 400 });
      }
      if (eventEndAt && eventEndAt.getTime() <= eventStartAt.getTime()) {
        return NextResponse.json({ error: "Event end time must be after start time" }, { status: 400 });
      }

      normalizedEventConfig = {
        ...eventConfig,
        eventDate: eventStartAt,
        eventStartAt,
        eventEndAt: eventEndAt || undefined,
      };
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
      eventConfig: normalizedEventConfig,
      projectConfig,
      notesConfig,
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    console.error("[listings POST]", err);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
