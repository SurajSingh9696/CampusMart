"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Order = {
  _id: string;
  listingId: { _id?: string; title: string; mediaUrls?: string[]; type: string; campus?: string };
  sellerId: { name: string; email?: string };
  amount: number;
  quantity?: number;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", confirmed: "#2563eb", fulfilled: "#16a34a", cancelled: "#dc2626",
};
const STATUS_BG: Record<string, string> = {
  pending: "#fffbeb", confirmed: "#eff6ff", fulfilled: "#f0fdf4", cancelled: "#fef2f2",
};
const TYPE_ICON: Record<string, string> = {
  event: "local_activity", notes: "menu_book", project: "terminal", product: "shopping_bag",
};

function getDetailHref(order: Order) {
  const id = order.listingId?._id;
  if (!id) return "/customer/products";
  const type = order.listingId?.type;
  if (type === "notes") return `/customer/notes/${id}`;
  if (type === "project") return `/customer/projects/${id}`;
  return `/customer/products/${id}`;
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    fetch("/api/orders/my")
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders || []); setLoading(false); });
  }, []);

  const filtered = (filter === "all" ? orders : orders.filter((o) => o.status === filter))
    .filter((order) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        order.listingId?.title?.toLowerCase().includes(term) ||
        order.sellerId?.name?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "amount_desc") return b.amount - a.amount;
      if (sort === "amount_asc") return a.amount - b.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track your purchases and bookings ({orders.length} total)</p>
        </div>
        <Link href="/customer/products" className="btn-primary flex items-center gap-2 text-sm" style={{ padding: "0.6rem 1.2rem" }}>
          <span className="material-symbols-outlined text-xl">add_shopping_cart</span> Shop More
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="input-icon-wrap flex-1">
            <span className="icon-left material-symbols-outlined">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item or seller"
              className="input-dark"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-dark w-full sm:w-auto"
            style={{ minWidth: "180px" }}
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
              className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
              style={{
                background: filter === s ? "var(--primary)" : "white",
                color: filter === s ? "white" : "var(--text-2)",
                border: `1px solid ${filter === s ? "var(--primary)" : "var(--border)"}`,
              }}>
              {s}
              {s !== "all" && statusCounts[s] ? (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: filter === s ? "rgba(255,255,255,0.25)" : STATUS_BG[s], color: filter === s ? "white" : STATUS_COLOR[s] }}>
                  {statusCounts[s]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
             <div key={i} className="card p-5 animate-pulse flex gap-4">
               <div className="w-16 h-16 rounded-xl shrink-0" style={{ background: "#f1f5f9" }} />
               <div className="flex-1 space-y-2 py-1">
                 <div className="h-4 w-1/3 rounded" style={{ background: "#f1f5f9" }} />
                 <div className="h-3 w-1/4 rounded" style={{ background: "#f1f5f9" }} />
               </div>
             </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">inventory_2</span>
          <p className="text-slate-700 font-bold mb-1">No {filter === "all" ? "" : filter} orders yet</p>
          <p className="text-slate-400 text-sm mb-5">Start browsing the marketplace to place your first order.</p>
          <Link href="/customer/products" className="btn-primary" style={{ padding: "0.6rem 1.4rem" }}>Browse Products</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => (
            <motion.div key={order._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(order)}>
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden" style={{ background: "#f1f5f9" }}>
                {order.listingId?.mediaUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.listingId.mediaUrls[0]} alt={order.listingId.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-slate-400">
                      {TYPE_ICON[order.listingId?.type] || "shopping_bag"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold truncate">{order.listingId?.title || "Item"}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Sold by {order.sellerId?.name || "Seller"}
                  {order.listingId?.campus && <span className="ml-2 text-slate-300">· {order.listingId.campus}</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-slate-900 font-black">
                  {order.amount === 0 ? <span className="text-green-600 text-sm">FREE</span> : `₹${order.amount}`}
                </p>
                <span className="badge mt-1 text-[10px]"
                  style={{ background: STATUS_BG[order.status], color: STATUS_COLOR[order.status], border: `1px solid ${STATUS_COLOR[order.status]}30` }}>
                  {order.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
            onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl p-7 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-start mb-5">
                <h3 className="text-lg font-black text-slate-900">Order Details</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Listing thumbnail in modal */}
              {selected.listingId?.mediaUrls?.[0] && (
                <div className="mb-4 rounded-xl overflow-hidden aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.listingId.mediaUrls[0]} alt={selected.listingId.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-3 mb-5">
                {[
                  ["Item", selected.listingId?.title || "—"],
                  ["Type", selected.listingId?.type || "—"],
                  ["Campus", selected.listingId?.campus || "—"],
                  ["Seller", selected.sellerId?.name || "—"],
                  ["Amount", selected.amount === 0 ? "FREE" : `₹${selected.amount}`],
                  ["Qty", String(selected.quantity || 1)],
                  ["Status", selected.status],
                  ["Ordered on", new Date(selected.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-400 font-medium">{label}</span>
                    <span className="text-sm text-slate-900 font-bold capitalize">{val}</span>
                  </div>
                ))}
              </div>

              <Link href={getDetailHref(selected)}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                style={{ padding: "0.75rem" }}>
                <span className="material-symbols-outlined text-xl">open_in_new</span>
                View Listing
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
