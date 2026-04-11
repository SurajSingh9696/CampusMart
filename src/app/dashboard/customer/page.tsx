import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerDashboardClient } from "@/components/customer/CustomerDashboardClient";
import { getUnifiedLiveFeed } from "@/lib/data/market-feed";
import { connectDB } from "@/lib/db";
import { WishlistItem } from "@/models/WishlistItem";

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.isBlocked) redirect("/blocked");
  if (session.user.role !== "customer") redirect("/dashboard");

  const listings = await getUnifiedLiveFeed(40);
  await connectDB();
  const wishlist = await WishlistItem.find({ userId: session.user.id }).lean();

  return (
    <AppShell
      title={`Welcome back, ${session.user.name?.split(" ")[0] || "Student"}`}
      subtitle="Browse products, projects, notes, and event passes with college-level visibility controls."
      nav={[
        { href: "/dashboard/customer", label: "Dashboard" },
        { href: "/dashboard/customer", label: "Products" },
        { href: "/dashboard/customer", label: "Projects" },
        { href: "/dashboard/customer", label: "Notes" },
        { href: "/dashboard/customer", label: "Events" },
      ]}
    >
      <CustomerDashboardClient
        listings={listings}
        userCampus={session.user.campus}
        wishlistKeys={wishlist.map((w) => `${w.itemType}:${w.listingId}`)}
      />
    </AppShell>
  );
}
