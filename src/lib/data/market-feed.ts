import { connectDB } from "@/lib/db";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";

export type UnifiedMarketItem = {
  _id: string;
  type: "product" | "project" | "notes" | "event";
  title: string;
  description: string;
  campus: string;
  price: number;
  isFree: boolean;
  isAuction?: boolean;
};

export async function getUnifiedLiveFeed(limit = 30): Promise<UnifiedMarketItem[]> {
  await connectDB();

  const [products, projects, notes, events] = await Promise.all([
    Product.find({ status: "live" }).sort({ createdAt: -1 }).limit(limit).lean(),
    Project.find({ status: "live" }).sort({ createdAt: -1 }).limit(limit).lean(),
    Note.find({ status: "live" }).sort({ createdAt: -1 }).limit(limit).lean(),
    Event.find({ status: "live" }).sort({ createdAt: -1 }).limit(limit).lean(),
  ]);

  const merged: UnifiedMarketItem[] = [
    ...products.map((x) => ({
      _id: x._id.toString(),
      type: "product" as const,
      title: x.title,
      description: x.description,
      campus: x.campus,
      price: x.price,
      isFree: false,
    })),
    ...projects.map((x) => ({
      _id: x._id.toString(),
      type: "project" as const,
      title: x.title,
      description: x.description,
      campus: x.campus,
      price: x.price,
      isFree: x.isFree,
      isAuction: x.isAuction,
    })),
    ...notes.map((x) => ({
      _id: x._id.toString(),
      type: "notes" as const,
      title: x.title,
      description: x.description,
      campus: x.campus,
      price: x.price,
      isFree: x.isFree,
    })),
    ...events.map((x) => ({
      _id: x._id.toString(),
      type: "event" as const,
      title: x.title,
      description: x.description,
      campus: x.campus,
      price: x.ticketPrice,
      isFree: x.isFree,
    })),
  ];

  return merged.slice(0, limit);
}
