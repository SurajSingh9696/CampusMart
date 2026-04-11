import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { Order } from "@/models/Order";
import Link from "next/link";

async function getPlatformStats() {
  await connectDB();
  const [totalUsers, totalSellers, pendingSellers, totalListings, pendingListings, totalOrders] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "seller", sellerApprovalStatus: "approved" }),
    User.countDocuments({ role: "seller", sellerApprovalStatus: "pending" }),
    Listing.countDocuments({ status: "live" }),
    Listing.countDocuments({ status: "pending_approval" }),
    Order.countDocuments(),
  ]);
  const revenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
  return { totalUsers, totalSellers, pendingSellers, totalListings, pendingListings, totalOrders, totalRevenue: revenue[0]?.total || 0 };
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") redirect("/auth/login");

  const stats = await getPlatformStats();

  const kpis = [
    { label: "Registered Students", value: stats.totalUsers, icon: "group", color: "#2563eb", bg: "#eff6ff" },
    { label: "Active Sellers", value: stats.totalSellers, icon: "storefront", color: "#1a73e8", bg: "#edf4ff" },
    { label: "Pending Approvals", value: stats.pendingSellers + stats.pendingListings, icon: "pending_actions", color: "#d97706", bg: "#fffbeb", urgent: (stats.pendingSellers + stats.pendingListings) > 0 },
    { label: "Live Listings", value: stats.totalListings, icon: "inventory_2", color: "#16a34a", bg: "#f0fdf4" },
    { label: "Total Orders", value: stats.totalOrders, icon: "receipt_long", color: "#ec4899", bg: "#fdf2f8" },
    { label: "Platform Revenue", value: `₹${stats.totalRevenue.toFixed(0)}`, icon: "payments", color: "#1a73e8", bg: "#edf4ff" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 lg:p-8"
        style={{ background: "linear-gradient(135deg, #1a73e8 0%, #2f80ed 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-blue-100">Admin Panel</p>
          <h1 className="text-2xl lg:text-3xl font-black text-white">Platform Overview</h1>
          <p className="text-blue-100 mt-1 text-sm">Real-time CampusMart control panel</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label}
            className={`card p-5 relative overflow-hidden ${kpi.urgent ? "ring-1 ring-amber-300" : ""}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: kpi.bg }}>
              <span className="material-symbols-outlined text-xl" style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{kpi.label}</p>
            {kpi.urgent && <span className="absolute top-3 right-3 badge badge-warning">Action Required</span>}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: "/admin/sellers", label: "Review Sellers", icon: "manage_accounts", badge: stats.pendingSellers > 0 ? `${stats.pendingSellers} pending` : null, color: "#d97706", bg: "#fffbeb" },
            { href: "/admin/listings", label: "Review Listings", icon: "inventory_2", badge: stats.pendingListings > 0 ? `${stats.pendingListings} pending` : null, color: "#2563eb", bg: "#eff6ff" },
            { href: "/admin/colleges", label: "Manage Colleges", icon: "school", badge: null, color: "#16a34a", bg: "#f0fdf4" },
            { href: "/admin/users", label: "Manage Users", icon: "group", badge: null, color: "#1a73e8", bg: "#edf4ff" },
          ].map((action) => (
            <Link key={action.href} href={action.href}
              className="card p-5 flex items-center gap-4 group hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: action.bg }}>
                <span className="material-symbols-outlined text-xl" style={{ color: action.color }}>{action.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold text-sm">{action.label}</p>
                {action.badge && <span className="badge badge-warning mt-1">{action.badge}</span>}
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">arrow_forward</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Broadcast Panel */}
      <div className="card p-6 flex flex-col md:flex-row items-center gap-6 justify-between"
        style={{ background: "linear-gradient(135deg, #edf4ff, #f7fbff)" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#dbeafe" }}>
            <span className="material-symbols-outlined text-2xl" style={{ color: "#1a73e8" }}>campaign</span>
          </div>
          <div>
            <p className="text-slate-900 font-bold">Send Broadcast</p>
            <p className="text-slate-500 text-sm">Email or in-app announcement to all users/sellers</p>
          </div>
        </div>
        <Link href="/admin/broadcast"
          className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0"
          style={{ background: "var(--primary)", color: "white" }}>
          Broadcast Now
        </Link>
      </div>
    </div>
  );
}
