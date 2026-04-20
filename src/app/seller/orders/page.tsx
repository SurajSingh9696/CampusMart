"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Order = {
  _id: string;
  listingId: { title: string; type: string };
  customerId: { name: string; email: string };
  amount: number;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  createdAt: string;
  deliveryMethod?: string;
};

const STATUS_COLOR: Record<string, string> = { pending: "#d97706", confirmed: "#2563eb", fulfilled: "#16a34a", cancelled: "#dc2626" };
const STATUS_BG: Record<string, string> = { pending: "#fffbeb", confirmed: "#eff6ff", fulfilled: "#f0fdf4", cancelled: "#fef2f2" };

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/orders/seller")
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders || []); setLoading(false); });
  }, []);

  async function updateStatus(id: string, status: string) {
    const prev = orders;
    setOrders((o) => o.map((x) => x._id === id ? { ...x, status: status as Order["status"] } : x));
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { setOrders(prev); toast.error("Update failed"); }
    else toast.success(`Order marked as ${status}`);
  }

  const filtered = (filter === "all" ? orders : orders.filter((o) => o.status === filter))
    .filter((order) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        order.listingId?.title?.toLowerCase().includes(term) ||
        order.customerId?.name?.toLowerCase().includes(term) ||
        order.customerId?.email?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "amount_desc") return b.amount - a.amount;
      if (sort === "amount_asc") return a.amount - b.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const pending = orders.filter((o) => o.status === "pending").length;
  const revenue = orders.filter((o) => o.status === "fulfilled").reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Incoming Orders</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage and fulfil customer orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", value: pending, color: "#d97706", bg: "#fffbeb", icon: "hourglass_empty" },
          { label: "Total Orders", value: orders.length, color: "#2563eb", bg: "#eff6ff", icon: "receipt_long" },
          { label: "Revenue Earned", value: `₹${revenue.toFixed(0)}`, color: "#16a34a", bg: "#f0fdf4", icon: "payments" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card p-4 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: s.bg }}>
              <span className="material-symbols-outlined text-xl" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="input-icon-wrap flex-1">
            <span className="icon-left material-symbols-outlined">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item or customer"
              className="input-dark"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort seller orders"
            className="input-dark w-full sm:w-auto"
            style={{ minWidth: "190px" }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount_desc">Amount high to low</option>
            <option value="amount_asc">Amount low to high</option>
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "confirmed", "fulfilled", "cancelled"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
              style={{ background: filter === s ? "var(--primary)" : "white", color: filter === s ? "white" : "var(--text-2)", border: `1px solid ${filter === s ? "var(--primary)" : "var(--border)"}` }}>
              {s} {s === "pending" && pending > 0 && `(${pending})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">receipt_long</span>
          <p className="text-slate-700 font-bold">No {filter === "all" ? "" : filter} orders</p>
          <p className="text-slate-400 text-sm mt-1">Orders from customers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => (
            <motion.div key={order._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold truncate">{order.listingId?.title || "Item"}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {order.customerId?.name} · {new Date(order.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <p className="font-black text-slate-900 shrink-0">₹{order.amount}</p>
              <span className="badge text-[11px] shrink-0" style={{ background: STATUS_BG[order.status], color: STATUS_COLOR[order.status] }}>
                {order.status}
              </span>
              {/* Actions */}
              {order.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => updateStatus(order._id, "confirmed")}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors border border-blue-200">
                    Confirm
                  </button>
                </div>
              )}
              {order.status === "confirmed" && (
                <button onClick={() => updateStatus(order._id, "fulfilled")}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-green-700 hover:bg-green-50 transition-colors border border-green-200 shrink-0">
                  Mark Fulfilled
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
