"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

type Listing = {
  _id: string;
  title: string;
  type: "product" | "project" | "notes" | "event";
  price: number;
  status: "active" | "pending" | "rejected" | "sold";
  images?: string[];
  createdAt: string;
  views?: number;
};

const TYPE_ICON: Record<string, string> = {
  product: "shopping_bag", project: "terminal", notes: "menu_book", event: "local_activity",
};
const STATUS_COLOR: Record<string, string> = {
  active: "#16a34a", pending: "#d97706", rejected: "#dc2626", sold: "#2563eb",
};
const STATUS_BG: Record<string, string> = {
  active: "#f0fdf4", pending: "#fffbeb", rejected: "#fef2f2", sold: "#eff6ff",
};

export default function SellerMarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/listings?mine=true")
      .then((r) => r.json())
      .then((d) => { setListings(d.listings || []); setLoading(false); });
  }, []);

  async function deleteListing(id: string) {
    if (!confirm("Delete this listing?")) return;
    const prev = listings;
    setListings((l) => l.filter((x) => x._id !== id));
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (!res.ok) { setListings(prev); toast.error("Delete failed"); }
    else toast.success("Listing deleted");
  }

  const filtered = listings
    .filter((l) => filter === "all" || l.status === filter)
    .filter((l) => !search || l.title.toLowerCase().includes(search.toLowerCase()));

  const activeCount = listings.filter((l) => l.status === "active").length;
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const totalRevenue = listings.filter((l) => l.status === "sold").reduce((s, l) => s + l.price, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Listings</h1>
          <p className="text-slate-500 text-sm mt-0.5">{listings.length} total listings</p>
        </div>
        <Link href="/seller/upload" className="btn-primary flex items-center gap-2 text-sm" style={{ padding: "0.6rem 1.2rem" }}>
          <span className="material-symbols-outlined text-xl">add</span> New Listing
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active", value: activeCount, icon: "check_circle", color: "#16a34a", bg: "#f0fdf4" },
          { label: "Pending Review", value: pendingCount, icon: "hourglass_empty", color: "#d97706", bg: "#fffbeb" },
          { label: "Revenue", value: `₹${totalRevenue.toFixed(0)}`, icon: "payments", color: "#2563eb", bg: "#eff6ff" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="card p-4 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: s.bg }}>
              <span className="material-symbols-outlined text-xl" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="input-icon-wrap flex-1">
          <span className="icon-left material-symbols-outlined">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..." className="input-dark" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "pending", "rejected", "sold"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
              style={{ background: filter === s ? "var(--primary)" : "white", color: filter === s ? "white" : "var(--text-2)", border: `1px solid ${filter === s ? "var(--primary)" : "var(--border)"}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex gap-4">
              <div className="w-16 h-16 rounded-xl shrink-0" style={{ background: "#f1f5f9" }} />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-1/2 rounded" style={{ background: "#f1f5f9" }} />
                <div className="h-3 w-1/4 rounded" style={{ background: "#f1f5f9" }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">inventory_2</span>
          <p className="text-slate-700 font-bold mb-1">{search ? "No matching listings" : "No listings yet"}</p>
          <p className="text-slate-400 text-sm mb-5">Start selling by creating your first listing.</p>
          <Link href="/seller/upload" className="btn-primary" style={{ padding: "0.6rem 1.4rem" }}>Create Listing</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((listing, i) => (
            <motion.div key={listing._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#f8fafc", border: "1px solid var(--border)" }}>
                <span className="material-symbols-outlined text-2xl text-slate-400">{TYPE_ICON[listing.type] || "sell"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold truncate">{listing.title}</p>
                <p className="text-slate-400 text-xs capitalize mt-0.5">{listing.type} · {new Date(listing.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
              <div className="shrink-0 text-right space-y-1">
                <p className="text-slate-900 font-black">{listing.price === 0 ? "Free" : `₹${listing.price}`}</p>
                <span className="badge text-[10px]" style={{ background: STATUS_BG[listing.status], color: STATUS_COLOR[listing.status] }}>
                  {listing.status}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <Link href={`/seller/upload?edit=${listing._id}`}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </Link>
                <button onClick={() => deleteListing(listing._id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
