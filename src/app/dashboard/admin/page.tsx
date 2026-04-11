import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Product } from "@/models/market/Product";
import { Project } from "@/models/market/Project";
import { Note } from "@/models/market/Note";
import { Event } from "@/models/market/Event";
import { Order } from "@/models/Order";
import { AppShell } from "@/components/layout/AppShell";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.isBlocked) redirect("/blocked");
  if (session.user.role !== "admin") redirect("/dashboard");

  await connectDB();

  const [customers, sellers, products, projects, notes, events, soldItems, pendingSellers] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "seller" }),
    Product.countDocuments(),
    Project.countDocuments(),
    Note.countDocuments(),
    Event.countDocuments(),
    Order.countDocuments({ status: "paid" }),
    User.find({ role: "seller", sellerApprovalStatus: "pending" })
      .select("name email campus accountNumber idCardNumber idCardImageId shop")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
  ]);

  return (
    <AppShell
      title="Admin Master Console"
      subtitle="Global governance for sellers, customers, listings, approvals, and role-level moderation."
      nav={[
        { href: "/dashboard/admin", label: "Dashboard" },
        { href: "/dashboard/admin", label: "Marketplace" },
        { href: "/dashboard/admin", label: "Sellers" },
        { href: "/dashboard/admin", label: "Customers" },
        { href: "/dashboard/admin", label: "Settings" },
      ]}
    >
      <AdminDashboardClient
        stats={{ customers, sellers, products, projects, notes, events, soldItems }}
        pendingSellers={pendingSellers.map((item) => ({
          ...item,
          _id: item._id.toString(),
          idCardImageId: item.idCardImageId ? item.idCardImageId.toString() : undefined,
          shop: item.shop || undefined,
        }))}
      />
    </AppShell>
  );
}
