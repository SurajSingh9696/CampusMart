"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type Order = {
  _id: string;
  listingId: { title: string; type: string };
  customerId: { name: string };
  sellerId: { name: string };
  amount: number;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = { pending: "#d97706", confirmed: "#2563eb", fulfilled: "#16a34a", cancelled: "#dc2626" };
const STATUS_BG: Record<string, string> = { pending: "#fffbeb", confirmed: "#eff6ff", fulfilled: "#f0fdf4", cancelled: "#fef2f2" };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  useEffect(() => {
    fetch(`/api/admin/orders?status=${filter}&page=${page}`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders || []); setLoading(false); });
  }, [filter, page]);

  const totalRevenue = orders.filter((o) => o.status === "fulfilled").reduce((s, o) => s + o.amount, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Platform Orders</h1>
        <p className="text-slate-500 text-sm mt-0.5">All transactions across the marketplace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length, icon: "receipt_long", color: "#2563eb", bg: "#eff6ff" },
          { label: "Pending", value: pendingCount, icon: "hourglass_empty", color: "#d97706", bg: "#fffbeb" },
          { label: "Fulfilled", value: orders.filter((o) => o.status === "fulfilled").length, icon: "check_circle", color: "#16a34a", bg: "#f0fdf4" },
          { label: "Revenue", value: `₹${totalRevenue.toFixed(0)}`, icon: "payments", color: "#1a73e8", bg: "#edf4ff" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <span className="material-symbols-outlined text-lg" style={{ color: s.color }}>{s.icon}</span>
              </div>
              <p className="text-xs font-bold text-slate-500">{s.label}</p>
            </div>
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "confirmed", "fulfilled", "cancelled"].map((s) => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
            style={{ background: filter === s ? "var(--primary)" : "white", color: filter === s ? "white" : "var(--text-2)", border: `1px solid ${filter === s ? "var(--primary)" : "var(--border)"}` }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">receipt_long</span>
          <p className="text-slate-700 font-bold">No orders found</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Seller</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order, i) => (
                  <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-900 font-semibold truncate max-w-[180px]">{order.listingId?.title || "Item"}</td>
                    <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">{order.customerId?.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{order.sellerId?.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-900 font-bold">₹{order.amount.toFixed(0)}</td>
                    <td className="px-5 py-3">
                      <span className="badge text-[10px]" style={{ background: STATUS_BG[order.status], color: STATUS_COLOR[order.status] }}>
                        {order.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">Showing {orders.length} orders</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                ← Prev
              </button>
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100">
                Page {page}
              </span>
              <button onClick={() => setPage((p) => p + 1)} disabled={orders.length < PER_PAGE}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
