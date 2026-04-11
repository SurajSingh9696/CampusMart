import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Order } from "@/models/Order";
import Link from "next/link";

async function getSellerStats(sellerId: string) {
  await connectDB();
  const [activeCount, pendingCount, soldCount, recentOrders] = await Promise.all([
    Listing.countDocuments({ sellerId, status: "live" }),
    Listing.countDocuments({ sellerId, status: "pending_approval" }),
    Listing.countDocuments({ sellerId, status: "sold" }),
    Order.find({ sellerId }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const revenue = recentOrders.reduce((s, o) => s + (o.amount || 0), 0);
  return { activeCount, pendingCount, soldCount, recentOrders, revenue };
}

export default async function SellerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "seller") redirect("/auth/login");

  const { activeCount, pendingCount, soldCount, recentOrders, revenue } = await getSellerStats(session.user.id);

  const kpis = [
    { label: "Active Listings", value: activeCount, icon: "inventory_2", color: "#2563eb", bg: "#eff6ff" },
    { label: "Pending Approval", value: pendingCount, icon: "schedule", color: "#d97706", bg: "#fffbeb" },
    { label: "Items Sold", value: soldCount, icon: "sell", color: "#16a34a", bg: "#f0fdf4" },
    { label: "Total Revenue", value: `₹${revenue.toFixed(0)}`, icon: "payments", color: "#1a73e8", bg: "#edf4ff" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 lg:p-8"
        style={{ background: "linear-gradient(135deg, #1a73e8 0%, #2f80ed 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-blue-100">Seller Studio</p>
            <h1 className="text-2xl lg:text-3xl font-black text-white">
              Hello, {session.user.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-blue-100 mt-1 text-sm">{session.user.campus} · Your store dashboard</p>
          </div>
          <Link href="/seller/upload"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-blue-700 bg-white hover:bg-blue-50 transition-colors">
            <span className="material-symbols-outlined text-xl">add</span>
            New Listing
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: kpi.bg }}>
              <span className="material-symbols-outlined text-xl" style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Upload */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Upload</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/seller/upload", icon: "shopping_bag", label: "Product", color: "#2563eb", bg: "#eff6ff" },
            { href: "/seller/upload", icon: "terminal", label: "Project", color: "#1a73e8", bg: "#edf4ff" },
            { href: "/seller/upload", icon: "menu_book", label: "Notes", color: "#d97706", bg: "#fffbeb" },
            { href: "/seller/upload", icon: "local_activity", label: "Event", color: "#16a34a", bg: "#f0fdf4" },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className="card p-4 flex flex-col items-center gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ background: item.bg }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: item.color }}>{item.icon}</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
          <Link href="/seller/orders" className="text-sm font-semibold flex items-center gap-1" style={{ color: "var(--primary)" }}>
            View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="card overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-200 mb-3 block">receipt_long</span>
              <p className="text-slate-800 font-bold mb-1">No orders yet</p>
              <p className="text-slate-400 text-sm">Start selling to see your orders here.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
                  {["Order ID", "Amount", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id.toString()} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">#{order._id.toString().slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">₹{order.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${["confirmed", "fulfilled"].includes(order.status) ? "badge-success" : "badge-warning"}`}>{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pending approval notice */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-xl"
          style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <span className="material-symbols-outlined text-amber-500">schedule</span>
          <div className="flex-1">
            <p className="text-amber-700 font-bold text-sm">
              {pendingCount} listing{pendingCount > 1 ? "s" : ""} awaiting admin approval
            </p>
            <p className="text-amber-600 text-xs">Listings are reviewed within 24 hours.</p>
          </div>
          <Link href="/seller/marketplace" className="badge badge-warning">View</Link>
        </div>
      )}
    </div>
  );
}
