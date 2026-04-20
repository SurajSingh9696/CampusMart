import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Order } from "@/models/Order";

const ORDERED_STATUSES = ["confirmed", "fulfilled"];

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildRecentMonths(totalMonths: number) {
  const now = new Date();
  const months: Array<{ year: number; month: number; monthLabel: string }> = [];

  for (let i = totalMonths - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      monthLabel: date.toLocaleDateString("en-IN", { month: "short" }),
    });
  }

  return months;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "seller") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const sellerId = new Types.ObjectId(session.user.id);
  const [listings, listingStats, monthlyStats] = await Promise.all([
    Listing.find({ sellerId }).select("_id title status").lean(),
    Order.aggregate<{
      _id: Types.ObjectId;
      orders: number;
      revenue: number;
    }>([
      {
        $match: {
          sellerId,
          status: { $in: ORDERED_STATUSES },
        },
      },
      {
        $group: {
          _id: "$listingId",
          orders: { $sum: { $ifNull: ["$quantity", 1] } },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { orders: -1, revenue: -1 } },
    ]),
    (() => {
      const months = buildRecentMonths(6);
      const firstMonth = new Date(months[0].year, months[0].month - 1, 1);
      return Order.aggregate<{
        _id: { year: number; month: number };
        revenue: number;
      }>([
        {
          $match: {
            sellerId,
            status: { $in: ORDERED_STATUSES },
            createdAt: { $gte: firstMonth },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$amount" },
          },
        },
      ]);
    })(),
  ]);

  const listingTitleMap = new Map(listings.map((listing) => [listing._id.toString(), listing.title]));

  const topListings = listingStats.slice(0, 10).map((row) => ({
    title: listingTitleMap.get(row._id.toString()) || "Untitled listing",
    views: 0,
    orders: row.orders || 0,
    revenue: row.revenue || 0,
  }));

  const totals = listingStats.reduce(
    (acc, item) => {
      acc.totalOrders += item.orders;
      acc.totalRevenue += item.revenue;
      return acc;
    },
    { totalOrders: 0, totalRevenue: 0 }
  );

  const monthlyMap = new Map(
    monthlyStats.map((row) => [monthKey(row._id.year, row._id.month), row.revenue || 0])
  );

  const revenueByMonth = buildRecentMonths(6).map((m) => ({
    month: m.monthLabel,
    revenue: monthlyMap.get(monthKey(m.year, m.month)) || 0,
  }));

  return NextResponse.json({
    totalRevenue: totals.totalRevenue,
    totalOrders: totals.totalOrders,
    totalListings: listings.length,
    activeListings: listings.filter((listing) => listing.status === "live").length,
    viewsTotal: 0,
    topListings,
    revenueByMonth,
  });
}
