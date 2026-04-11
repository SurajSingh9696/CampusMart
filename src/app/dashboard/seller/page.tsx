import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";
import { AppShell } from "@/components/layout/AppShell";
import { SellerDashboardClient } from "@/components/seller/SellerDashboardClient";

export default async function SellerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.isBlocked) redirect("/blocked");
  if (session.user.role !== "seller") redirect("/dashboard");
  if (session.user.sellerApprovalStatus !== "approved") redirect("/pending-approval");

  await connectDB();

  const [products, projects, notes, events] = await Promise.all([
    Product.find({ sellerId: session.user.id }).select("title status price createdAt").lean(),
    Project.find({ sellerId: session.user.id }).select("title status price createdAt").lean(),
    Note.find({ sellerId: session.user.id }).select("title status price createdAt").lean(),
    Event.find({ sellerId: session.user.id }).select("title status ticketPrice createdAt").lean(),
  ]);

  const listings = [
    ...products.map((x) => ({ _id: x._id, title: x.title, status: x.status, price: x.price, createdAt: x.createdAt, type: "product" as const })),
    ...projects.map((x) => ({ _id: x._id, title: x.title, status: x.status, price: x.price, createdAt: x.createdAt, type: "project" as const })),
    ...notes.map((x) => ({ _id: x._id, title: x.title, status: x.status, price: x.price, createdAt: x.createdAt, type: "notes" as const })),
    ...events.map((x) => ({ _id: x._id, title: x.title, status: x.status, price: x.ticketPrice, createdAt: x.createdAt, type: "event" as const })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <AppShell
      title="Seller Studio"
      subtitle="Track inventory lifecycle, weekly revenue trends, and upload pipelines for all marketplace modules."
      nav={[
        { href: "/dashboard/seller", label: "Dashboard" },
        { href: "/dashboard/seller", label: "Marketplace" },
        { href: "/dashboard/seller", label: "Uploads" },
        { href: "/dashboard/seller", label: "Analytics" },
      ]}
    >
      <SellerDashboardClient
        listings={listings.map((item) => ({
          ...item,
          _id: item._id.toString(),
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
